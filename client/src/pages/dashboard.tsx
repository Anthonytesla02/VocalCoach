import { useState } from "react";
import { DashboardHeader } from "@/components/dashboard-header";
import { RecordingInterface } from "@/components/recording-interface";
import { PostSessionAnalysis } from "@/components/post-session-analysis";
import { ProgressOverview } from "@/components/progress-overview";
import { SessionHistory } from "@/components/session-history";
import { Achievements } from "@/components/achievements";
import { Mic, Bell, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";

// Mock user ID for demo - in real app this would come from auth
const DEMO_USER_ID = "demo-user-123";

export default function Dashboard() {
  const [currentAnalysis, setCurrentAnalysis] = useState<any>(null);

  const { data: userProgress } = useQuery<{currentStreak: number}>({
    queryKey: ["/api/users", DEMO_USER_ID, "progress"],
  });

  const handleAnalysisComplete = (analysis: any) => {
    setCurrentAnalysis(analysis);
  };

  const handleTryAgain = () => {
    setCurrentAnalysis(null);
  };

  const handleStartChallenge = () => {
    setCurrentAnalysis(null);
    // Scroll to recording interface
    document.getElementById("recording-interface")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="bg-card border-b border-border sticky top-0 z-50" data-testid="navigation">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <Mic className="w-4 h-4 text-primary-foreground" />
              </div>
              <span className="text-xl font-bold text-foreground" data-testid="text-app-name">
                Vocalize
              </span>
            </div>
            
            <div className="hidden md:flex items-center space-x-6">
              <a href="#" className="text-foreground hover:text-primary transition-colors">
                Practice
              </a>
              <a href="#" className="text-muted-foreground hover:text-primary transition-colors">
                Progress
              </a>
              <a href="#" className="text-muted-foreground hover:text-primary transition-colors">
                Challenges
              </a>
            </div>

            <div className="flex items-center space-x-3">
              <Button variant="ghost" size="icon" data-testid="button-notifications">
                <Bell className="w-4 h-4" />
              </Button>
              <div className="w-8 h-8 bg-accent rounded-full flex items-center justify-center">
                <User className="w-4 h-4 text-accent-foreground" />
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Dashboard Header */}
        <DashboardHeader 
          userName="Alex"
          currentStreak={userProgress?.currentStreak || 0}
          onStartChallenge={handleStartChallenge}
        />

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Practice Area */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Recording Interface */}
            <div id="recording-interface">
              <RecordingInterface 
                userId={DEMO_USER_ID}
                onAnalysisComplete={handleAnalysisComplete}
              />
            </div>

            {/* Post-Session Analysis */}
            {currentAnalysis && (
              <PostSessionAnalysis 
                analysis={currentAnalysis.analysis}
                onTryAgain={handleTryAgain}
              />
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            
            {/* Progress Overview */}
            <ProgressOverview userId={DEMO_USER_ID} />

            {/* Recent Sessions */}
            <SessionHistory userId={DEMO_USER_ID} />

            {/* Achievements & Badges */}
            <Achievements userId={DEMO_USER_ID} />
          </div>
        </div>
      </div>
    </div>
  );
}
