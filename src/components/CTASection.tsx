import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

const CTASection = () => {
  return (
    <section className="py-32 relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 gradient-hero rotate-180" />
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] gradient-glow opacity-40" />
      
      <div className="container mx-auto px-6 relative z-10">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-4xl md:text-6xl font-heading font-bold text-foreground mb-6 animate-fade-up">
            Ready to Get
            <span className="gradient-text"> Started?</span>
          </h2>
          
          <p className="text-lg text-muted-foreground mb-10 font-light animate-fade-up" style={{ animationDelay: '0.1s' }}>
            Join thousands of creators who are already building the future. 
            Start your journey today.
          </p>

          <div className="animate-fade-up" style={{ animationDelay: '0.2s' }}>
            <Button variant="hero" size="xl" className="group">
              Start Building
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CTASection;
