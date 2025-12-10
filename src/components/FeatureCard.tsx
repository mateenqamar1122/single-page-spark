import { LucideIcon } from "lucide-react";

interface FeatureCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  delay?: number;
}

const FeatureCard = ({ icon: Icon, title, description, delay = 0 }: FeatureCardProps) => {
  return (
    <div 
      className="group relative p-8 rounded-2xl bg-card border border-border hover:border-primary/30 transition-all duration-500 hover:shadow-[0_0_40px_hsl(38_92%_50%/0.1)] animate-fade-up"
      style={{ animationDelay: `${delay}s` }}
    >
      {/* Glow effect on hover */}
      <div className="absolute inset-0 rounded-2xl gradient-glow opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      
      <div className="relative z-10">
        {/* Icon */}
        <div className="w-14 h-14 rounded-xl bg-secondary flex items-center justify-center mb-6 group-hover:bg-primary/10 transition-colors duration-300">
          <Icon className="w-7 h-7 text-primary" />
        </div>

        {/* Content */}
        <h3 className="text-xl font-heading font-semibold text-foreground mb-3">
          {title}
        </h3>
        <p className="text-muted-foreground font-light leading-relaxed">
          {description}
        </p>
      </div>
    </div>
  );
};

export default FeatureCard;
