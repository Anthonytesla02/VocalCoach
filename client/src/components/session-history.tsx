import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import { useQuery } from "@tanstack/react-query";
import type { Session } from "@shared/schema";
import { getScoreColor } from "@/lib/audio-analysis";

interface SessionHistoryProps {
  userId: string;
}

export function SessionHistory({ userId }: SessionHistoryProps) {
  const { data: sessions, isLoading } = useQuery<Session[]>({
    queryKey: ["/api/users", userId, "sessions"],
  });

  if (isLoading) {
    return (
      <Card className="p-6 border border-border">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-muted rounded w-1/2"></div>
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
              <div className="space-y-2">
                <div className="h-3 bg-muted rounded w-24"></div>
                <div className="h-2 bg-muted rounded w-16"></div>
              </div>
              <div className="h-8 w-8 bg-muted rounded"></div>
            </div>
          ))}
        </div>
      </Card>
    );
  }

  if (!sessions || sessions.length === 0) {
    return (
      <Card className="p-6 border border-border">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-foreground">Recent Sessions</h3>
        </div>
        <div className="text-center py-8 text-muted-foreground">
          <p>No sessions yet. Start practicing to see your history here!</p>
        </div>
      </Card>
    );
  }

  const getSessionTypeColor = (practiceMode: string) => {
    switch (practiceMode) {
      case "ai_passage": return "bg-accent";
      case "my_script": return "bg-primary";
      default: return "bg-chart-3";
    }
  };

  const getSessionTitle = (practiceMode: string) => {
    switch (practiceMode) {
      case "ai_passage": return "AI Challenge";
      case "my_script": return "Custom Practice";
      default: return "Practice Session";
    }
  };

  return (
    <Card className="p-6 border border-border" data-testid="session-history">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-foreground">Recent Sessions</h3>
        <Button variant="ghost" size="sm" className="text-primary hover:text-primary/80">
          View All
        </Button>
      </div>
      
      <div className="space-y-3">
        {sessions.slice(0, 3).map((session) => (
          <Card key={session.id} className="flex items-center justify-between p-3 bg-muted/30 border-none">
            <div className="flex items-center space-x-3">
              <div className={`w-2 h-2 rounded-full ${getSessionTypeColor(session.practiceMode)}`}></div>
              <div>
                <p className="text-sm font-medium text-foreground" data-testid={`text-session-title-${session.id}`}>
                  {getSessionTitle(session.practiceMode)}
                </p>
                <p className="text-xs text-muted-foreground" data-testid={`text-session-time-${session.id}`}>
                  {Math.round(session.durationMs / 60000)} min • {
                    session.createdAt ? formatDistanceToNow(new Date(session.createdAt), { addSuffix: true }) : 'Recently'
                  }
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className={`text-lg font-bold ${getScoreColor(session.score)}`} data-testid={`text-session-score-${session.id}`}>
                {session.score}
              </p>
              <p className="text-xs text-muted-foreground">Score</p>
            </div>
          </Card>
        ))}
      </div>
    </Card>
  );
}
