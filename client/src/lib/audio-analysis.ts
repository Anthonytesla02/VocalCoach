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
  // If we have a transcript from speech recognition, send it directly
  if (transcript && transcript.trim()) {
    const response = await fetch("/api/sessions/analyze", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        userId,
        practiceMode,
        transcript: transcript.trim(),
        durationMs: durationMs || Math.max(1000, audioBlob.size / 100), // Use provided duration or estimate
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to analyze transcript");
    }

    return response.json();
  }

  // Fallback to original audio upload method
  const formData = new FormData();
  formData.append("audio", audioBlob, "recording.webm");
  formData.append("userId", userId);
  formData.append("practiceMode", practiceMode);

  const response = await fetch("/api/sessions/analyze", {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to analyze audio");
  }

  return response.json();
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
