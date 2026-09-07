import HeroSection from "@/components/landing/HeroSection";
import ProblemSection from "@/components/landing/ProblemSection";
import FeaturesSection from "@/components/landing/FeaturesSection";
import ExpertSection from "@/components/landing/ExpertSection";
import HowItWorksSection from "@/components/landing/HowItWorksSection";
import SocialProofSection from "@/components/landing/SocialProofSection";
import CtaSection from "@/components/landing/CtaSection";
import LandingFooter from "@/components/landing/LandingFooter";
import LandingNav from "@/components/landing/LandingNav";
import FloatingMascotCta from "@/components/landing/FloatingMascotCta";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      <LandingNav />
      <HeroSection />
      <ProblemSection />
      <FeaturesSection />
      <ExpertSection />
      <HowItWorksSection />
      <SocialProofSection />
      <CtaSection />
      <LandingFooter />
      <FloatingMascotCta />
    </div>
  );
}
