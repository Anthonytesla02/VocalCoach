import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Mic, MicOff, Loader2, Bot, Edit3 } from "lucide-react";
import { useAudioRecorder } from "@/hooks/use-audio-recorder";
import { formatDuration, uploadAudio } from "@/lib/audio-analysis";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";

interface RecordingInterfaceProps {
  userId: string;
  onAnalysisComplete: (analysis: any) => void;
}

export function RecordingInterface({ userId, onAnalysisComplete }: RecordingInterfaceProps) {
  const [practiceMode, setPracticeMode] = useState<"ai_passage" | "my_script">("ai_passage");
  const [enableCamera, setEnableCamera] = useState(false);
  const [enableRealTimeHints, setEnableRealTimeHints] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [waveformData, setWaveformData] = useState<number[]>(Array(7).fill(0));
  const [liveMetrics, setLiveMetrics] = useState({
    wpm: 0,
    fillers: 0,
    energy: "Good",
    clarity: 0,
  });

  const { toast } = useToast();
  const recorder = useAudioRecorder();

  const { data: aiPassage } = useQuery<{passage: string}>({
    queryKey: ["/api/practice/ai-passage"],
    enabled: practiceMode === "ai_passage",
  });

  // Handle analysis when recording stops and we have an audio blob
  useEffect(() => {
    if (recorder.audioBlob && !recorder.isRecording && !isProcessing) {
      setIsProcessing(true);
      const processAnalysis = async () => {
        try {
          const analysis = await uploadAudio(
            recorder.audioBlob!, 
            userId, 
            practiceMode, 
            recorder.transcript,
            recorder.duration * 1000 // Convert seconds to milliseconds
          );
          onAnalysisComplete(analysis);
          recorder.reset();
        } catch (error) {
          console.error("Analysis failed:", error);
          toast({
            title: "Analysis Failed",
            description: error instanceof Error ? error.message : "Failed to analyze your recording",
            variant: "destructive",
          });
        } finally {
          setIsProcessing(false);
        }
      };
      processAnalysis();
    }
  }, [recorder.audioBlob, recorder.isRecording, isProcessing]);

  const handleRecordToggle = async () => {
    if (recorder.isRecording) {
      recorder.stopRecording();
    } else {
      await recorder.startRecording((data) => {
        setWaveformData(data.map(val => Math.max(20, val / 2.55))); // Convert to percentage
        
        // Simulate live metrics (in real app, this would come from WebSocket)
        if (enableRealTimeHints && recorder.duration > 5) {
          setLiveMetrics({
            wpm: 100 + Math.floor(Math.random() * 40),
            fillers: Math.floor(recorder.duration / 10),
            energy: ["Low", "Good", "High"][Math.floor(Math.random() * 3)],
            clarity: 75 + Math.floor(Math.random() * 20),
          });
        }
      });
    }
  };

  if (recorder.error) {
    toast({
      title: "Recording Error",
      description: recorder.error,
      variant: "destructive",
    });
  }

  return (
    <Card className="p-8 border border-border" data-testid="recording-interface">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-foreground mb-2">Practice Session</h2>
        <p className="text-muted-foreground">Choose your practice mode and start building confidence</p>
      </div>

      {/* Practice Mode Selection */}
      <div className="grid sm:grid-cols-2 gap-4 mb-8">
        <Button
          variant={practiceMode === "ai_passage" ? "default" : "outline"}
          className="p-6 h-auto justify-start"
          onClick={() => setPracticeMode("ai_passage")}
          data-testid="button-ai-passage"
        >
          <div className="flex items-start space-x-3">
            <Bot className="w-6 h-6 mt-1" />
            <div className="text-left">
              <div className="font-semibold mb-1">AI Passage</div>
              <p className="text-sm opacity-80">Practice with AI-generated content tailored to your level</p>
            </div>
          </div>
        </Button>
        
        <Button
          variant={practiceMode === "my_script" ? "default" : "outline"}
          className="p-6 h-auto justify-start"
          onClick={() => setPracticeMode("my_script")}
          data-testid="button-my-script"
        >
          <div className="flex items-start space-x-3">
            <Edit3 className="w-6 h-6 mt-1" />
            <div className="text-left">
              <div className="font-semibold mb-1">My Script</div>
              <p className="text-sm opacity-80">Bring your own content to practice with</p>
            </div>
          </div>
        </Button>
      </div>

      {/* AI Passage Display */}
      {practiceMode === "ai_passage" && aiPassage?.passage && (
        <Card className="p-4 mb-6 bg-muted/30">
          <p className="text-sm text-foreground" data-testid="text-ai-passage">
            "{aiPassage.passage}"
          </p>
        </Card>
      )}

      {/* Recording Controls */}
      <Card className="bg-muted/30 p-8 mb-6">
        {/* Live Waveform Visualization */}
        <div className="flex items-center justify-center space-x-1 mb-8 h-20" data-testid="waveform-display">
          {waveformData.map((height, index) => (
            <div
              key={index}
              className={`w-2 rounded-full transition-all duration-200 ${
                recorder.isRecording ? 'bg-primary' : 'bg-muted'
              }`}
              style={{ 
                height: recorder.isRecording ? `${height}%` : '20%',
                opacity: recorder.isRecording ? 1 : 0.3
              }}
            />
          ))}
        </div>

        {/* Recording Button */}
        <div className="text-center mb-6">
          <Button
            onClick={handleRecordToggle}
            disabled={isProcessing}
            className={`w-20 h-20 rounded-full p-0 transition-all duration-300 ${
              recorder.isRecording 
                ? 'bg-destructive hover:bg-destructive/90' 
                : 'bg-primary hover:bg-primary/90'
            }`}
            data-testid="button-record"
          >
            {isProcessing ? (
              <Loader2 className="w-8 h-8 animate-spin text-primary-foreground" />
            ) : recorder.isRecording ? (
              <MicOff className="w-8 h-8 text-primary-foreground" />
            ) : (
              <Mic className="w-8 h-8 text-primary-foreground" />
            )}
          </Button>
          <p className="text-muted-foreground mt-3">
            {recorder.isRecording 
              ? `Recording... ${formatDuration(recorder.duration)}`
              : isProcessing 
              ? "Processing..."
              : "Click to start recording"
            }
          </p>
        </div>

        {/* Recording Options */}
        <div className="flex items-center justify-center space-x-6">
          <label className="flex items-center space-x-2 cursor-pointer">
            <Checkbox 
              checked={enableCamera}
              onCheckedChange={(checked) => setEnableCamera(checked as boolean)}
              data-testid="checkbox-camera"
            />
            <span className="text-sm text-foreground">Enable camera</span>
          </label>
          <label className="flex items-center space-x-2 cursor-pointer">
            <Checkbox 
              checked={enableRealTimeHints}
              onCheckedChange={(checked) => setEnableRealTimeHints(checked as boolean)}
              data-testid="checkbox-hints"
            />
            <span className="text-sm text-foreground">Real-time hints</span>
          </label>
        </div>
      </Card>

      {/* Live Feedback HUD */}
      {recorder.isRecording && enableRealTimeHints && recorder.duration > 5 && (
        <Card className="bg-secondary/50 backdrop-blur-sm p-4 grid grid-cols-4 gap-4" data-testid="live-feedback">
          <div className="text-center">
            <div className="text-2xl font-bold text-accent" data-testid="live-wpm">{liveMetrics.wpm}</div>
            <div className="text-xs text-muted-foreground">WPM</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-destructive" data-testid="live-fillers">{liveMetrics.fillers}</div>
            <div className="text-xs text-muted-foreground">Fillers</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-accent" data-testid="live-energy">{liveMetrics.energy}</div>
            <div className="text-xs text-muted-foreground">Energy</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-accent" data-testid="live-clarity">{liveMetrics.clarity}%</div>
            <div className="text-xs text-muted-foreground">Clarity</div>
          </div>
        </Card>
      )}
    </Card>
  );
}
