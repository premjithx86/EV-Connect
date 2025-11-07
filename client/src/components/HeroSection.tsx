import { Button } from "@/components/ui/button";
import { MapPin, Users, HelpCircle, BookOpen } from "lucide-react";
import heroImage from "@assets/generated_images/Hero_image_EV_charging_baa78b3f.png";

export function HeroSection() {
  return (
    <div className="relative min-h-[600px] md:min-h-[500px] flex items-center justify-center overflow-hidden">
      <div 
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${heroImage})` }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/50 to-black/70" />
      
      <div className="relative z-10 max-w-4xl mx-auto px-4 text-center text-white">
        <h1 className="font-display font-bold text-5xl md:text-6xl mb-6">
          Connect with the EV Community
        </h1>
        <p className="text-xl mb-8 text-white/90 max-w-2xl mx-auto">
          Find charging stations, share your journey, and get expert advice from fellow electric vehicle enthusiasts.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button 
            size="lg" 
            variant="default"
            className="text-base backdrop-blur-sm"
            data-testid="button-get-started"
          >
            Get Started
          </Button>
          <Button 
            size="lg" 
            variant="outline"
            className="text-base backdrop-blur-md bg-white/10 text-white border-white/30 hover:bg-white/20"
            data-testid="button-explore"
          >
            Explore Features
          </Button>
        </div>

        <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-6 text-white">
          <div className="flex flex-col items-center gap-2">
            <MapPin className="h-8 w-8" />
            <span className="text-sm font-medium">Find Stations</span>
          </div>
          <div className="flex flex-col items-center gap-2">
            <Users className="h-8 w-8" />
            <span className="text-sm font-medium">Communities</span>
          </div>
          <div className="flex flex-col items-center gap-2">
            <HelpCircle className="h-8 w-8" />
            <span className="text-sm font-medium">Q&A Forum</span>
          </div>
          <div className="flex flex-col items-center gap-2">
            <BookOpen className="h-8 w-8" />
            <span className="text-sm font-medium">Knowledge Hub</span>
          </div>
        </div>
      </div>
    </div>
  );
}
