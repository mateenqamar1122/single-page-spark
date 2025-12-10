import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useActivityLogs } from './useActivityLogs';
import { toast } from './use-toast';

export interface Comment {
  id: string;
  entity_type: 'task' | 'project';
  entity_id: string;
  parent_id: string | null;
  author_id: string;
  content: string;
  mentions: string[];
  attachments: Array<{
    id: string;
    name: string;
    url: string;
    type: string;
    size: number;
  }>;
  reactions: Record<string, string[]>; // emoji -> user_ids[]
  is_edited: boolean;
  is_pinned: boolean;
  is_private: boolean;
  created_at: string;
  updated_at: string;
  // Joined data
  author_name?: string;
  author_avatar?: string;
  replies_count?: number;
  replies?: Comment[];
}

export interface CommentFilters {
  entity_type?: 'task' | 'project';
  entity_id?: string;
  author_id?: string;
  is_pinned?: boolean;
  is_private?: boolean;
  search?: string;
  limit?: number;
  offset?: number;
}

export interface CreateCommentData {
  entity_type: 'task' | 'project';
  entity_id: string;
  content: string;
  parent_id?: string;
  mentions?: string[];
  attachments?: Comment['attachments'];
  is_private?: boolean;
}

export interface UpdateCommentData {
  content?: string;
  mentions?: string[];
  attachments?: Comment['attachments'];
  is_pinned?: boolean;
  is_private?: boolean;
}

export function useComments(filters: CommentFilters = {}) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const { user } = useAuth();
  const { logActivity } = useActivityLogs();

  // Fetch comments with filters and pagination
  const fetchComments = useCallback(async (reset = false) => {
    if (!user) return;

    setLoading(true);
    setError(null);

    try {
      let query = supabase
        .from('comments')
        .select(`
          *,
          profiles!comments_author_id_fkey (
            display_name,
            avatar_url
          )
        `)
        .order('created_at', { ascending: false });

      // Apply filters
      if (filters.entity_type) {
        query = query.eq('entity_type', filters.entity_type);
      }

      if (filters.entity_id) {
        query = query.eq('entity_id', filters.entity_id);
      }

      if (filters.author_id) {
        query = query.eq('author_id', filters.author_id);
      }

      if (filters.is_pinned !== undefined) {
        query = query.eq('is_pinned', filters.is_pinned);
      }

      if (filters.is_private !== undefined) {
        query = query.eq('is_private', filters.is_private);
      }

      if (filters.search) {
        query = query.ilike('content', `%${filters.search}%`);
      }

      // Pagination
      const limit = filters.limit || 20;
      const offset = reset ? 0 : (filters.offset || 0);
      query = query.range(offset, offset + limit - 1);

      const { data, error: queryError } = await query;

      if (queryError) throw queryError;

      const formattedComments: Comment[] = (data || []).map(comment => ({
        ...comment,
        author_name: comment.profiles?.display_name || 'Unknown User',
        author_avatar: comment.profiles?.avatar_url,
        mentions: comment.mentions || [],
        attachments: comment.attachments || [],
        reactions: comment.reactions || {},
      }));

      // Fetch reply counts for parent comments
      const parentComments = formattedComments.filter(c => !c.parent_id);
      if (parentComments.length > 0) {
        const { data: replyCounts } = await supabase
          .from('comments')
          .select('parent_id')
          .in('parent_id', parentComments.map(c => c.id));

        const replyCountMap = (replyCounts || []).reduce((acc, reply) => {
          acc[reply.parent_id] = (acc[reply.parent_id] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);

        formattedComments.forEach(comment => {
          if (!comment.parent_id) {
            comment.replies_count = replyCountMap[comment.id] || 0;
          }
        });
      }

      if (reset) {
        setComments(formattedComments);
      } else {
        setComments(prev => [...prev, ...formattedComments]);
      }

      setHasMore(formattedComments.length === limit);

    } catch (err) {
      console.error('Error fetching comments:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch comments');
    } finally {
      setLoading(false);
    }
  }, [user, filters]);

  // Fetch replies for a specific comment
  const fetchReplies = useCallback(async (parentId: string): Promise<Comment[]> => {
    if (!user) return [];

    try {
      const { data, error } = await supabase
        .from('comments')
        .select(`
          *,
          profiles!comments_author_id_fkey (
            display_name,
            avatar_url
          )
        `)
        .eq('parent_id', parentId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      return (data || []).map(comment => ({
        ...comment,
        author_name: comment.profiles?.display_name || 'Unknown User',
        author_avatar: comment.profiles?.avatar_url,
        mentions: comment.mentions || [],
        attachments: comment.attachments || [],
        reactions: comment.reactions || {},
      }));

    } catch (err) {
      console.error('Error fetching replies:', err);
      return [];
    }
  }, [user]);

  // Create a new comment
  const createComment = useCallback(async (data: CreateCommentData): Promise<Comment | null> => {
    if (!user) return null;

    try {
      const { data: newComment, error } = await supabase
        .from('comments')
        .insert({
          entity_type: data.entity_type,
          entity_id: data.entity_id,
          content: data.content,
          parent_id: data.parent_id || null,
          author_id: user.id,
          mentions: data.mentions || [],
          attachments: data.attachments || [],
          is_private: data.is_private || false,
        })
        .select(`
          *,
          profiles!comments_author_id_fkey (
            display_name,
            avatar_url
          )
        `)
        .single();

      if (error) throw error;

      const formattedComment: Comment = {
        ...newComment,
        author_name: newComment.profiles?.display_name || 'Unknown User',
        author_avatar: newComment.profiles?.avatar_url,
        mentions: newComment.mentions || [],
        attachments: newComment.attachments || [],
        reactions: newComment.reactions || {},
        replies_count: 0,
      };

      // Update local state
      if (data.parent_id) {
        // Update reply count for parent comment
        setComments(prev => prev.map(comment =>
          comment.id === data.parent_id
            ? { ...comment, replies_count: (comment.replies_count || 0) + 1 }
            : comment
        ));
      } else {
        // Add new parent comment to the list
        setComments(prev => [formattedComment, ...prev]);
      }

      // Log activity
      await logActivity(
        'comment',
        data.entity_type,
        data.entity_id,
        undefined,
        undefined,
        {
          comment_id: formattedComment.id,
          is_reply: !!data.parent_id,
          content_preview: data.content.substring(0, 100)
        },
        `Added ${data.parent_id ? 'reply' : 'comment'} on ${data.entity_type}`
      );

      // Send notifications for mentions
      if (data.mentions && data.mentions.length > 0) {
        await Promise.all(data.mentions.map(userId =>
          supabase.from('comment_mentions').insert({
            comment_id: formattedComment.id,
            mentioned_user_id: userId,
          })
        ));
      }

      toast({
        title: "Comment added",
        description: `Your ${data.parent_id ? 'reply' : 'comment'} has been posted.`,
      });

      return formattedComment;

    } catch (err) {
      console.error('Error creating comment:', err);
      toast({
        title: "Error",
        description: "Failed to add comment. Please try again.",
        variant: "destructive",
      });
      return null;
    }
  }, [user, logActivity]);

  // Update an existing comment
  const updateComment = useCallback(async (commentId: string, data: UpdateCommentData): Promise<boolean> => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('comments')
        .update({
          ...data,
          is_edited: data.content ? true : undefined,
          updated_at: new Date().toISOString(),
        })
        .eq('id', commentId)
        .eq('author_id', user.id); // Ensure user can only update their own comments

      if (error) throw error;

      // Update local state
      setComments(prev => prev.map(comment =>
        comment.id === commentId
          ? { ...comment, ...data, is_edited: data.content ? true : comment.is_edited }
          : comment
      ));

      toast({
        title: "Comment updated",
        description: "Your comment has been updated successfully.",
      });

      return true;

    } catch (err) {
      console.error('Error updating comment:', err);
      toast({
        title: "Error",
        description: "Failed to update comment. Please try again.",
        variant: "destructive",
      });
      return false;
    }
  }, [user]);

  // Delete a comment
  const deleteComment = useCallback(async (commentId: string): Promise<boolean> => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('comments')
        .delete()
        .eq('id', commentId)
        .eq('author_id', user.id); // Ensure user can only delete their own comments

      if (error) throw error;

      // Update local state
      const deletedComment = comments.find(c => c.id === commentId);
      setComments(prev => prev.filter(comment => comment.id !== commentId));

      // Update parent comment reply count
      if (deletedComment?.parent_id) {
        setComments(prev => prev.map(comment =>
          comment.id === deletedComment.parent_id
            ? { ...comment, replies_count: Math.max(0, (comment.replies_count || 1) - 1) }
            : comment
        ));
      }

      toast({
        title: "Comment deleted",
        description: "Your comment has been deleted successfully.",
      });

      return true;

    } catch (err) {
      console.error('Error deleting comment:', err);
      toast({
        title: "Error",
        description: "Failed to delete comment. Please try again.",
        variant: "destructive",
      });
      return false;
    }
  }, [user, comments]);

  // Add or remove reaction to a comment
  const toggleReaction = useCallback(async (commentId: string, emoji: string): Promise<boolean> => {
    if (!user) return false;

    try {
      const comment = comments.find(c => c.id === commentId);
      if (!comment) return false;

      const currentReactions = comment.reactions || {};
      const userReactions = currentReactions[emoji] || [];
      const hasReacted = userReactions.includes(user.id);

      const updatedReactions = {
        ...currentReactions,
        [emoji]: hasReacted
          ? userReactions.filter(id => id !== user.id)
          : [...userReactions, user.id]
      };

      // Remove empty reaction arrays
      if (updatedReactions[emoji].length === 0) {
        delete updatedReactions[emoji];
      }

      const { error } = await supabase
        .from('comments')
        .update({ reactions: updatedReactions })
        .eq('id', commentId);

      if (error) throw error;

      // Update local state
      setComments(prev => prev.map(c =>
        c.id === commentId
          ? { ...c, reactions: updatedReactions }
          : c
      ));

      return true;

    } catch (err) {
      console.error('Error toggling reaction:', err);
      return false;
    }
  }, [user, comments]);

  // Load more comments (pagination)
  const loadMore = useCallback(() => {
    if (!loading && hasMore) {
      fetchComments(false);
    }
  }, [loading, hasMore, fetchComments]);

  // Refresh comments
  const refresh = useCallback(() => {
    fetchComments(true);
  }, [fetchComments]);

  // Initial load and real-time subscription
  useEffect(() => {
    fetchComments(true);

    // Set up real-time subscription for comments
    const channel = supabase
      .channel('comments_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'comments',
          filter: filters.entity_id ? `entity_id=eq.${filters.entity_id}` : undefined,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            // New comment added by another user
            if (payload.new.author_id !== user?.id) {
              fetchComments(true);
            }
          } else if (payload.eventType === 'UPDATE') {
            // Comment updated
            fetchComments(true);
          } else if (payload.eventType === 'DELETE') {
            // Comment deleted
            setComments(prev => prev.filter(c => c.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchComments, filters.entity_id, user?.id]);

  return {
    comments,
    loading,
    error,
    hasMore,
    createComment,
    updateComment,
    deleteComment,
    toggleReaction,
    fetchReplies,
    loadMore,
    refresh,
  };
}
