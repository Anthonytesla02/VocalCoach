import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Trophy } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import type { UserProgress } from "@shared/schema";

interface ProgressOverviewProps {
  userId: string;
}

interface ProgressRingProps {
  percentage: number;
  label: string;
  color: string;
}

function ProgressRing({ percentage, label, color }: ProgressRingProps) {
  const radius = 28;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className="text-center">
      <div className="relative w-16 h-16 mx-auto mb-2">
        <svg className="w-16 h-16 transform -rotate-90">
          <circle
            cx="32"
            cy="32"
            r={radius}
            stroke="hsl(var(--muted))"
            strokeWidth="4"
            fill="none"
          />
          <circle
            cx="32"
            cy="32"
            r={radius}
            stroke={color}
            strokeWidth="4"
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className="transition-all duration-500"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={`text-xs font-bold`} style={{ color }}>
            {percentage}%
          </span>
        </div>
      </div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}

export function ProgressOverview({ userId }: ProgressOverviewProps) {
  const { data: progress, isLoading } = useQuery<UserProgress>({
    queryKey: ["/api/users", userId, "progress"],
  });

  if (isLoading) {
    return (
      <Card className="p-6 border border-border">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-muted rounded w-3/4"></div>
          <div className="h-2 bg-muted rounded"></div>
          <div className="grid grid-cols-2 gap-4">
            <div className="h-16 bg-muted rounded-full"></div>
            <div className="h-16 bg-muted rounded-full"></div>
          </div>
        </div>
      </Card>
    );
  }

  if (!progress) {
    return (
      <Card className="p-6 border border-border">
        <p className="text-muted-foreground text-center">No progress data available</p>
      </Card>
    );
  }

  const weeklyProgress = Math.round(((progress.weeklyCompleted || 0) / (progress.weeklyGoal || 1)) * 100);
  const fillerReduction = Math.round((progress.avgFillerReduction || 0) * 100);
  const paceControl = Math.round((progress.avgPaceControl || 0) * 100);

  return (
    <Card className="p-6 border border-border" data-testid="progress-overview">
      <h3 className="text-lg font-bold text-foreground mb-6">Your Progress</h3>
      
      {/* Weekly Goal */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-muted-foreground">Weekly Goal</span>
          <span className="text-sm font-medium text-foreground" data-testid="text-weekly-progress">
            {progress.weeklyCompleted}/{progress.weeklyGoal} sessions
          </span>
        </div>
        <Progress value={weeklyProgress} className="mb-2" />
      </div>

      {/* Progress Rings */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <ProgressRing
          percentage={fillerReduction}
          label="Filler Reduction"
          color="hsl(var(--accent))"
        />
        <ProgressRing
          percentage={paceControl}
          label="Pace Control"
          color="hsl(var(--primary))"
        />
      </div>

      {/* Recent Achievement */}
      <Card className="bg-accent/10 p-4">
        <div className="flex items-center space-x-3 mb-2">
          <div className="w-8 h-8 bg-accent rounded-full flex items-center justify-center">
            <Trophy className="w-4 h-4 text-accent-foreground" />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground" data-testid="text-achievement-title">
              {(progress.bestScore || 0) >= 85 ? "Clarity Champion!" : 
               (progress.currentStreak || 0) >= 7 ? "Consistency Master!" :
               (progress.totalSessions || 0) >= 10 ? "Dedicated Learner!" :
               "Getting Started!"}
            </p>
            <p className="text-xs text-muted-foreground" data-testid="text-achievement-desc">
              {(progress.bestScore || 0) >= 85 ? `Achieved ${progress.bestScore} score!` : 
               (progress.currentStreak || 0) >= 7 ? `${progress.currentStreak} day streak!` :
               (progress.totalSessions || 0) >= 10 ? `${progress.totalSessions} sessions completed!` :
               "Keep practicing to unlock achievements!"}
            </p>
          </div>
        </div>
      </Card>
    </Card>
  );
}
