import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Download, Share, Bookmark, Lightbulb, Clock } from "lucide-react";
import { getScoreColor, getScoreBgColor } from "@/lib/audio-analysis";

interface PostSessionAnalysisProps {
  analysis: {
    sessionId: string;
    transcript: any[];
    metrics: any;
    fillerBreakdown: any;
    highlights: any[];
    recommendations: any[];
    score: number;
  };
  onTryAgain: () => void;
}

export function PostSessionAnalysis({ analysis, onTryAgain }: PostSessionAnalysisProps) {
  const handleDownload = () => {
    const dataStr = JSON.stringify(analysis, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    const exportFileDefaultName = `vocalize-session-${analysis.sessionId}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  const renderTranscriptWithHighlights = () => {
    if (!analysis.transcript || analysis.transcript.length === 0) {
      return <p className="text-muted-foreground">No transcript available</p>;
    }

    return (
      <div className="text-sm leading-relaxed">
        {analysis.transcript.map((segment: any, index: number) => (
          <span key={index} className="mr-1">
            {segment.tokens?.map((token: any, tokenIndex: number) => (
              <span
                key={tokenIndex}
                className={
                  token.type === 'filler' 
                    ? 'bg-destructive/20 text-destructive px-1 rounded' 
                    : token.type === 'pause'
                    ? 'bg-yellow-200 text-yellow-800 px-1 rounded'
                    : 'text-foreground'
                }
              >
                {token.t}{' '}
              </span>
            )) || <span className="text-foreground">{segment.text} </span>}
          </span>
        ))}
      </div>
    );
  };

  return (
    <Card className="p-8 border border-border" data-testid="post-session-analysis">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold text-foreground">Session Analysis</h3>
        <div className="flex items-center space-x-2">
          <span className="text-sm text-muted-foreground">Just completed</span>
          <Button variant="ghost" size="sm" onClick={handleDownload} data-testid="button-download">
            <Download className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Overall Score */}
      <Card className={`${getScoreBgColor(analysis.score)} p-6 mb-6`}>
        <div className="flex items-center justify-between mb-4">
          <h4 className="font-semibold text-foreground">Overall Performance</h4>
          <div className={`text-3xl font-bold ${getScoreColor(analysis.score)}`} data-testid="text-score">
            {analysis.score}
          </div>
        </div>
        <Progress value={analysis.score} className="mb-2" />
        <p className="text-sm text-muted-foreground">
          {analysis.score >= 80 ? "Excellent work! You're speaking with confidence." :
           analysis.score >= 60 ? "Great improvement! Keep practicing to build more confidence." :
           analysis.score >= 40 ? "Good progress! Focus on the recommendations below." :
           "Keep practicing! Small improvements lead to big changes."}
        </p>
      </Card>

      {/* Detailed Metrics */}
      <div className="grid sm:grid-cols-2 gap-4 mb-6">
        <Card className="bg-muted/30 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">Filler Words</span>
            <span className="text-lg font-bold text-destructive" data-testid="text-filler-count">
              {analysis.metrics?.total_fillers || 0}
            </span>
          </div>
          <div className="text-xs text-muted-foreground">
            {Object.entries(analysis.fillerBreakdown || {}).map(([word, count]) => (
              `${count} "${word}"`
            )).join(', ')}
          </div>
        </Card>
        
        <Card className="bg-muted/30 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">Speaking Pace</span>
            <span className="text-lg font-bold text-accent" data-testid="text-wpm">
              {analysis.metrics?.words_per_minute || 0} WPM
            </span>
          </div>
          <div className="text-xs text-muted-foreground">
            {analysis.metrics?.words_per_minute >= 110 && analysis.metrics?.words_per_minute <= 140 
              ? "Perfect conversational pace" 
              : "Consider adjusting your pace"}
          </div>
        </Card>
        
        <Card className="bg-muted/30 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">Energy Level</span>
            <span className="text-lg font-bold text-accent" data-testid="text-energy">
              {analysis.metrics?.energy_mean > -15 ? "High" : 
               analysis.metrics?.energy_mean > -25 ? "Good" : "Low"}
            </span>
          </div>
          <div className="text-xs text-muted-foreground">
            {analysis.metrics?.energy_mean > -15 ? "Engaging and lively" : 
             analysis.metrics?.energy_mean > -25 ? "Moderate energy" : "Try to be more energetic"}
          </div>
        </Card>
        
        <Card className="bg-muted/30 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">Clarity Score</span>
            <span className="text-lg font-bold text-accent" data-testid="text-clarity">
              {Math.round((analysis.metrics?.clarity_score || 0) * 100)}%
            </span>
          </div>
          <div className="text-xs text-muted-foreground">
            {(analysis.metrics?.clarity_score || 0) > 0.8 ? "Very clear pronunciation" :
             (analysis.metrics?.clarity_score || 0) > 0.6 ? "Good clarity" :
             "Work on pronunciation clarity"}
          </div>
        </Card>
      </div>

      {/* Transcript with Highlights */}
      <div className="mb-6">
        <h5 className="font-medium text-foreground mb-3">Transcript with Feedback</h5>
        <Card className="bg-muted/30 p-4" data-testid="transcript-display">
          {renderTranscriptWithHighlights()}
        </Card>
      </div>

      {/* Recommendations */}
      {analysis.recommendations && analysis.recommendations.length > 0 && (
        <div className="space-y-3 mb-6">
          <h5 className="font-medium text-foreground">Recommendations</h5>
          <div className="space-y-2">
            {analysis.recommendations.map((rec: any, index: number) => (
              <Card key={index} className={`flex items-start space-x-3 p-3 ${
                rec.id?.includes('breathe') ? 'bg-accent/10' : 'bg-primary/10'
              }`}>
                {rec.id?.includes('breathe') ? (
                  <Lightbulb className="w-5 h-5 text-accent mt-0.5" />
                ) : (
                  <Clock className="w-5 h-5 text-primary mt-0.5" />
                )}
                <div>
                  <p className="text-sm font-medium text-foreground">{rec.text}</p>
                  {rec.description && (
                    <p className="text-xs text-muted-foreground mt-1">{rec.description}</p>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex space-x-3">
        <Button onClick={onTryAgain} className="flex-1" data-testid="button-try-again">
          Try Again
        </Button>
        <Button variant="outline" size="icon" data-testid="button-share">
          <Share className="w-4 h-4" />
        </Button>
        <Button variant="outline" size="icon" data-testid="button-bookmark">
          <Bookmark className="w-4 h-4" />
        </Button>
      </div>
    </Card>
  );
}
