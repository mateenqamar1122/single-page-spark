import { Zap, Shield, Palette, Layers } from "lucide-react";
import FeatureCard from "./FeatureCard";

const features = [
  {
    icon: Zap,
    title: "Lightning Fast",
    description: "Optimized for speed with modern technologies. Experience instant load times and smooth interactions.",
  },
  {
    icon: Shield,
    title: "Secure by Design",
    description: "Built with security in mind from the ground up. Your data is protected with industry-leading practices.",
  },
  {
    icon: Palette,
    title: "Beautiful Design",
    description: "Crafted with attention to every detail. Elegant interfaces that delight and inspire.",
  },
  {
    icon: Layers,
    title: "Scalable Architecture",
    description: "Built to grow with your needs. From prototype to production, scale seamlessly.",
  },
];

const FeaturesSection = () => {
  return (
    <section id="features" className="py-32 relative">
      {/* Background accent */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] gradient-glow opacity-30" />
      
      <div className="container mx-auto px-6 relative z-10">
        {/* Section header */}
        <div className="text-center mb-20">
          <h2 className="text-4xl md:text-5xl font-heading font-bold text-foreground mb-6 animate-fade-up">
            Why Choose <span className="gradient-text">Us</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto font-light animate-fade-up" style={{ animationDelay: '0.1s' }}>
            We combine cutting-edge technology with thoughtful design to create 
            exceptional digital experiences.
          </p>
        </div>

        {/* Features grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => (
            <FeatureCard
              key={feature.title}
              icon={feature.icon}
              title={feature.title}
              description={feature.description}
              delay={0.1 * (index + 1)}
            />
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
