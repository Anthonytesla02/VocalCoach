export function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function calculateWPM(wordCount: number, durationSeconds: number): number {
  if (durationSeconds === 0) return 0;
  return Math.round((wordCount / durationSeconds) * 60);
}

export async function uploadAudio(audioBlob: Blob, userId: string, practiceMode: string, transcript?: string, durationMs?: number) {
  // Check if we have a valid transcript
  const hasTranscript = transcript && transcript.trim();
  
  if (!hasTranscript) {
    // If speech recognition failed but we have audio, provide a helpful fallback error
    // In a real implementation, this could upload the audio for server-side transcription
    throw new Error("Speech recognition failed or no speech detected. Please try speaking more clearly and ensure your microphone is working. Make sure you're in a quiet environment and speaking directly into your microphone.");
  }

  // Validate other required parameters
  if (!userId) {
    throw new Error("User ID is required for analysis");
  }
  
  if (!practiceMode) {
    throw new Error("Practice mode is required for analysis");
  }
  
  if (!durationMs || durationMs < 1000) {
    throw new Error("Recording duration is too short. Please record for at least 1 second.");
  }

  try {
    // Send transcript for analysis
    const response = await fetch("/api/sessions/analyze", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        userId,
        practiceMode,
        transcript: transcript.trim(),
        durationMs: Math.max(1000, durationMs), // Ensure minimum duration
      }),
    });

    if (!response.ok) {
      let errorMessage = "Failed to analyze transcript";
      try {
        const errorData = await response.json();
        errorMessage = errorData.error || errorMessage;
      } catch (parseError) {
        console.error("Failed to parse error response:", parseError);
        errorMessage = `Server error (${response.status}): ${response.statusText}`;
      }
      throw new Error(errorMessage);
    }

    const result = await response.json();
    
    // Validate the response structure
    if (!result || !result.analysis) {
      throw new Error("Invalid response format from analysis service");
    }
    
    return result;
  } catch (error) {
    // Re-throw with additional context if it's a network error
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new Error("Network error: Unable to connect to analysis service. Please check your internet connection and try again.");
    }
    
    // Re-throw the original error if it's already a proper Error object
    if (error instanceof Error) {
      throw error;
    }
    
    // Handle any other unexpected error types
    throw new Error(`Unexpected error during analysis: ${String(error)}`);
  }
}

export function getScoreColor(score: number): string {
  if (score >= 80) return "text-accent";
  if (score >= 60) return "text-primary";
  if (score >= 40) return "text-chart-3";
  return "text-destructive";
}

export function getScoreBgColor(score: number): string {
  if (score >= 80) return "bg-accent/10";
  if (score >= 60) return "bg-primary/10";
  if (score >= 40) return "bg-chart-3/10";
  return "bg-destructive/10";
}
