import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Flame, Star } from "lucide-react";

interface DashboardHeaderProps {
  userName: string;
  currentStreak: number;
  onStartChallenge: () => void;
}

export function DashboardHeader({ userName, currentStreak, onStartChallenge }: DashboardHeaderProps) {
  const dailyChallenges = [
    "Explain your favorite hobby to someone who's never heard of it before",
    "Describe a place you'd love to visit and what you would do there",
    "Tell us about a skill you've learned recently and how it has impacted your daily life",
    "Share your thoughts on the importance of communication in building relationships",
    "Describe a challenge you've overcome and what you learned from the experience",
  ];

  const todaysChallenge = dailyChallenges[new Date().getDate() % dailyChallenges.length];

  return (
    <div className="gradient-bg rounded-2xl p-8 mb-8 text-white relative overflow-hidden" data-testid="dashboard-header">
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold mb-2" data-testid="text-greeting">
              Good morning, {userName}! 🌟
            </h1>
            <p className="text-white/80 text-lg">Ready to boost your speaking confidence today?</p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold flex items-center gap-2" data-testid="text-streak">
              <Flame className="w-6 h-6" />
              {currentStreak}
            </div>
            <div className="text-white/80 text-sm">Day Streak</div>
          </div>
        </div>
        
        <Card className="bg-white/20 backdrop-blur-sm border-white/30 text-white">
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold">Today's Challenge</h3>
              <span className="bg-white/30 px-3 py-1 rounded-full text-sm">2 min</span>
            </div>
            <p className="text-white/90 mb-4" data-testid="text-daily-challenge">
              "{todaysChallenge}"
            </p>
            <Button 
              onClick={onStartChallenge}
              className="bg-white text-primary hover:bg-white/90 transition-colors"
              data-testid="button-start-challenge"
            >
              Start Challenge
            </Button>
          </div>
        </Card>
      </div>
      <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-16 translate-x-16"></div>
      <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full translate-y-12 -translate-x-12"></div>
    </div>
  );
}
