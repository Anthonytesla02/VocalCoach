import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, Flame, Star, Clock, Users, Mic } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import type { Achievement } from "@shared/schema";

interface AchievementsProps {
  userId: string;
}

interface AchievementBadgeProps {
  title: string;
  icon: string;
  color: string;
  unlocked: boolean;
}

function AchievementBadge({ title, icon, color, unlocked }: AchievementBadgeProps) {
  const getIcon = (iconName: string) => {
    switch (iconName) {
      case "fas fa-fire": return <Flame className="w-5 h-5" />;
      case "fas fa-star": return <Star className="w-5 h-5" />;
      case "fas fa-trophy": return <Trophy className="w-5 h-5" />;
      case "fas fa-clock": return <Clock className="w-5 h-5" />;
      case "fas fa-users": return <Users className="w-5 h-5" />;
      case "fas fa-microphone": return <Mic className="w-5 h-5" />;
      default: return <Star className="w-5 h-5" />;
    }
  };

  return (
    <div className={`text-center p-3 rounded-lg transition-all ${
      unlocked 
        ? `${color}/10 hover:${color}/20` 
        : 'bg-muted/30 opacity-50'
    }`}>
      <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-2 ${
        unlocked ? color : 'bg-muted'
      }`}>
        <div className={unlocked ? 'text-white' : 'text-muted-foreground'}>
          {getIcon(icon)}
        </div>
      </div>
      <p className={`text-xs font-medium ${
        unlocked ? getTextColor(color) : 'text-muted-foreground'
      }`}>
        {title}
      </p>
    </div>
  );
}

function getTextColor(bgColor: string): string {
  switch (bgColor) {
    case "bg-accent": return "text-accent";
    case "bg-primary": return "text-primary";
    case "bg-chart-3": return "text-chart-3";
    case "bg-destructive": return "text-destructive";
    default: return "text-foreground";
  }
}

export function Achievements({ userId }: AchievementsProps) {
  const { data: achievements, isLoading } = useQuery<Achievement[]>({
    queryKey: ["/api/users", userId, "achievements"],
  });

  const allAchievements = [
    { type: "streak_7", title: "7 Day Streak", icon: "fas fa-fire", color: "bg-accent" },
    { type: "score_80", title: "First 80+", icon: "fas fa-star", color: "bg-primary" },
    { type: "fluent_speaker", title: "Fluent Speaker", icon: "fas fa-microphone", color: "bg-muted" },
    { type: "time_master", title: "Time Master", icon: "fas fa-clock", color: "bg-chart-3" },
    { type: "social_speaker", title: "Social Speaker", icon: "fas fa-users", color: "bg-muted" },
    { type: "champion", title: "Champion", icon: "fas fa-trophy", color: "bg-muted" },
  ];

  if (isLoading) {
    return (
      <Card className="p-6 border border-border">
        <h3 className="text-lg font-bold text-foreground mb-4">Achievements</h3>
        <div className="grid grid-cols-3 gap-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="animate-pulse">
              <div className="w-12 h-12 bg-muted rounded-full mx-auto mb-2"></div>
              <div className="h-3 bg-muted rounded w-full"></div>
            </div>
          ))}
        </div>
      </Card>
    );
  }

  const unlockedTypes = achievements?.map(a => a.type) || [];

  return (
    <Card className="p-6 border border-border" data-testid="achievements">
      <h3 className="text-lg font-bold text-foreground mb-4">Achievements</h3>
      
      <div className="grid grid-cols-3 gap-3">
        {allAchievements.map((achievement) => (
          <AchievementBadge
            key={achievement.type}
            title={achievement.title}
            icon={achievement.icon}
            color={achievement.color}
            unlocked={unlockedTypes.includes(achievement.type)}
          />
        ))}
      </div>
    </Card>
  );
}
