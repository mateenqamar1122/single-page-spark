import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  Users,
  TrendingUp,
  Target,
  Award,
  Clock,
  CheckCircle2
} from 'lucide-react';
import { useProjects } from '@/hooks/useProjects';
import { useTasks } from '@/hooks/useTasks';

interface TeamMember {
  id: string;
  name: string;
  avatar?: string;
  email: string;
  tasksCompleted: number;
  tasksAssigned: number;
  projectsActive: number;
  completionRate: number;
  performance: 'excellent' | 'good' | 'average' | 'needs-improvement';
}

export function TeamPerformance() {
  const { projects } = useProjects();
  const { tasks } = useTasks();

  // Calculate team member performance metrics
  const getTeamPerformance = (): TeamMember[] => {
    const memberMap = new Map<string, TeamMember>();

    // Initialize members from projects
    projects.forEach(project => {
      if (project.members && Array.isArray(project.members)) {
        project.members.forEach((member: any) => {
          if (typeof member === 'object' && member.id) {
            if (!memberMap.has(member.id)) {
              memberMap.set(member.id, {
                id: member.id,
                name: member.name || member.email || 'Unknown',
                avatar: member.avatar_url,
                email: member.email || '',
                tasksCompleted: 0,
                tasksAssigned: 0,
                projectsActive: 0,
                completionRate: 0,
                performance: 'average'
              });
            }

            // Count active projects
            if (project.status !== 'completed') {
              const currentMember = memberMap.get(member.id)!;
              currentMember.projectsActive += 1;
            }
          }
        });
      }
    });

    // Add task metrics
    tasks.forEach(task => {
      if (task.assignee_id) {
        const member = memberMap.get(task.assignee_id);
        if (member) {
          member.tasksAssigned += 1;
          if (task.status === 'done') {
            member.tasksCompleted += 1;
          }
        }
      }
    });

    // Calculate completion rates and performance levels
    const members = Array.from(memberMap.values()).map(member => {
      member.completionRate = member.tasksAssigned > 0
        ? (member.tasksCompleted / member.tasksAssigned) * 100
        : 0;

      // Determine performance level
      if (member.completionRate >= 90) {
        member.performance = 'excellent';
      } else if (member.completionRate >= 75) {
        member.performance = 'good';
      } else if (member.completionRate >= 60) {
        member.performance = 'average';
      } else {
        member.performance = 'needs-improvement';
      }

      return member;
    });

    return members.sort((a, b) => b.completionRate - a.completionRate);
  };

  const teamMembers = getTeamPerformance();

  const getPerformanceBadge = (performance: TeamMember['performance']) => {
    const config = {
      excellent: { color: 'bg-green-100 text-green-800', label: 'Excellent' },
      good: { color: 'bg-blue-100 text-blue-800', label: 'Good' },
      average: { color: 'bg-yellow-100 text-yellow-800', label: 'Average' },
      'needs-improvement': { color: 'bg-red-100 text-red-800', label: 'Needs Improvement' }
    };

    return config[performance];
  };

  const getPerformanceIcon = (performance: TeamMember['performance']) => {
    switch (performance) {
      case 'excellent':
        return <Award className="h-4 w-4 text-green-600" />;
      case 'good':
        return <TrendingUp className="h-4 w-4 text-blue-600" />;
      case 'average':
        return <Target className="h-4 w-4 text-yellow-600" />;
      case 'needs-improvement':
        return <Clock className="h-4 w-4 text-red-600" />;
    }
  };

  // Team overview stats
  const totalTasks = teamMembers.reduce((sum, member) => sum + member.tasksAssigned, 0);
  const totalCompleted = teamMembers.reduce((sum, member) => sum + member.tasksCompleted, 0);
  const overallCompletion = totalTasks > 0 ? (totalCompleted / totalTasks) * 100 : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Team Performance
        </CardTitle>

        {/* Team Overview */}
        <div className="grid grid-cols-3 gap-4 mt-4">
          <div className="text-center">
            <div className="text-2xl font-bold">{teamMembers.length}</div>
            <div className="text-sm text-muted-foreground">Team Members</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold">{totalTasks}</div>
            <div className="text-sm text-muted-foreground">Total Tasks</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold">{overallCompletion.toFixed(1)}%</div>
            <div className="text-sm text-muted-foreground">Completion Rate</div>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {teamMembers.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Users className="h-8 w-8 mx-auto mb-2" />
            <p>No team members found</p>
          </div>
        ) : (
          <div className="space-y-4">
            {teamMembers.map((member) => {
              const badgeConfig = getPerformanceBadge(member.performance);

              return (
                <div key={member.id} className="p-4 rounded-lg border bg-card">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={member.avatar} />
                        <AvatarFallback>
                          {member.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                        </AvatarFallback>
                      </Avatar>

                      <div>
                        <h4 className="font-medium">{member.name}</h4>
                        <p className="text-sm text-muted-foreground">{member.email}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {getPerformanceIcon(member.performance)}
                      <Badge className={badgeConfig.color}>
                        {badgeConfig.label}
                      </Badge>
                    </div>
                  </div>

                  {/* Performance Metrics */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">
                    <div className="text-center">
                      <div className="text-lg font-semibold">{member.tasksCompleted}</div>
                      <div className="text-xs text-muted-foreground">Completed</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-semibold">{member.tasksAssigned}</div>
                      <div className="text-xs text-muted-foreground">Assigned</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-semibold">{member.projectsActive}</div>
                      <div className="text-xs text-muted-foreground">Projects</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-semibold">{member.completionRate.toFixed(0)}%</div>
                      <div className="text-xs text-muted-foreground">Rate</div>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span>Task Completion</span>
                      <span>{member.completionRate.toFixed(1)}%</span>
                    </div>
                    <Progress
                      value={member.completionRate}
                      className="h-2"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default TeamPerformance;
