import { Mistral } from "@mistralai/mistralai";

const mistral = new Mistral({
  apiKey: process.env.MISTRAL_API_KEY || "",
});

export async function analyzeAudio(transcript: string, durationSeconds: number) {
  try {
    const response = await mistral.chat.complete({
      model: "mistral-large-latest",
      messages: [
        {
          role: "system",
          content: `You are a speech coach analyzing a practice session. Analyze the provided transcript for speech patterns and provide detailed feedback.

Your analysis should include:
1. Filler word detection (um, uh, like, you know, etc.)
2. Speech metrics (words per minute, clarity assessment)
3. Energy and confidence evaluation
4. Specific recommendations for improvement

Respond with JSON in this exact format:
{
  "transcript": [
    {
      "start_ms": 0,
      "end_ms": 1000,
      "text": "segment text",
      "tokens": [
        {"t": "word", "type": "word", "start_ms": 0, "end_ms": 500},
        {"t": "um", "type": "filler", "start_ms": 500, "end_ms": 700}
      ]
    }
  ],
  "metrics": {
    "total_words": 50,
    "words_per_minute": 120,
    "total_fillers": 5,
    "fillers_per_minute": 12,
    "avg_pause_ms": 300,
    "energy_mean": -20,
    "pitch_median_hz": 180,
    "clarity_score": 0.85,
    "confidence": 0.90,
    "paceScore": 75,
    "fillerImprovement": 20
  },
  "fillerBreakdown": {
    "um": 3,
    "uh": 2,
    "like": 1
  },
  "highlights": [
    {"type": "filler", "start_ms": 0, "end_ms": 200, "text": "um"},
    {"type": "long_pause", "start_ms": 5000, "end_ms": 7000, "duration_ms": 2000}
  ],
  "recommendations": [
    {
      "id": "rec-breathe",
      "text": "Practice deep breathing before speaking",
      "description": "Try the 4-6-4 breathing technique to reduce filler words"
    }
  ],
  "score": 82
}`
        },
        {
          role: "user",
          content: `Please analyze this speech transcript:

Transcript: "${transcript}"
Duration: ${durationSeconds} seconds

Provide detailed analysis focusing on filler words, speaking pace, clarity, and overall performance. Calculate an overall score from 0-100 based on the quality of the speech.`
        },
      ],
      responseFormat: { type: "json_object" },
    });

    const analysisResult = JSON.parse(response.choices?.[0]?.message?.content || "{}");
    
    // Ensure we have all required fields with fallbacks
    return {
      transcript: analysisResult.transcript || [
        {
          start_ms: 0,
          end_ms: durationSeconds * 1000,
          text: transcript,
          tokens: tokenizeTranscript(transcript)
        }
      ],
      metrics: {
        total_words: analysisResult.metrics?.total_words || countWords(transcript),
        words_per_minute: analysisResult.metrics?.words_per_minute || calculateWPM(transcript, durationSeconds),
        total_fillers: analysisResult.metrics?.total_fillers || countFillers(transcript),
        fillers_per_minute: analysisResult.metrics?.fillers_per_minute || (countFillers(transcript) / (durationSeconds / 60)),
        avg_pause_ms: analysisResult.metrics?.avg_pause_ms || 400,
        energy_mean: analysisResult.metrics?.energy_mean || -18,
        pitch_median_hz: analysisResult.metrics?.pitch_median_hz || 180,
        clarity_score: analysisResult.metrics?.clarity_score || calculateClarityScore(transcript),
        confidence: analysisResult.metrics?.confidence || 0.85,
        paceScore: analysisResult.metrics?.paceScore || getPaceScore(calculateWPM(transcript, durationSeconds)),
        fillerImprovement: analysisResult.metrics?.fillerImprovement || Math.max(0, 100 - (countFillers(transcript) * 10))
      },
      fillerBreakdown: analysisResult.fillerBreakdown || getFillerBreakdown(transcript),
      highlights: analysisResult.highlights || generateHighlights(transcript),
      recommendations: analysisResult.recommendations || generateRecommendations(transcript, durationSeconds),
      score: analysisResult.score || calculateOverallScore(transcript, durationSeconds)
    };

  } catch (error) {
    console.error("Error analyzing transcript:", error);
    
    // Fallback analysis if Mistral fails
    return {
      transcript: [
        {
          start_ms: 0,
          end_ms: durationSeconds * 1000,
          text: transcript,
          tokens: tokenizeTranscript(transcript)
        }
      ],
      metrics: {
        total_words: countWords(transcript),
        words_per_minute: calculateWPM(transcript, durationSeconds),
        total_fillers: countFillers(transcript),
        fillers_per_minute: countFillers(transcript) / (durationSeconds / 60),
        avg_pause_ms: 400,
        energy_mean: -18,
        pitch_median_hz: 180,
        clarity_score: calculateClarityScore(transcript),
        confidence: 0.85,
        paceScore: getPaceScore(calculateWPM(transcript, durationSeconds)),
        fillerImprovement: Math.max(0, 100 - (countFillers(transcript) * 10))
      },
      fillerBreakdown: getFillerBreakdown(transcript),
      highlights: generateHighlights(transcript),
      recommendations: generateRecommendations(transcript, durationSeconds),
      score: calculateOverallScore(transcript, durationSeconds)
    };
  }
}

// Helper functions for fallback analysis
function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(word => word.length > 0).length;
}

function calculateWPM(text: string, durationSeconds: number): number {
  const wordCount = countWords(text);
  return Math.round((wordCount / durationSeconds) * 60);
}

function countFillers(text: string): number {
  const fillerWords = ['um', 'uh', 'like', 'you know', 'so', 'basically', 'actually', 'literally'];
  const words = text.toLowerCase().split(/\s+/);
  return words.filter(word => 
    fillerWords.some(filler => word.includes(filler.replace(' ', '')))
  ).length;
}

function getFillerBreakdown(text: string): Record<string, number> {
  const fillerWords = ['um', 'uh', 'like', 'you know', 'so'];
  const breakdown: Record<string, number> = {};
  const words = text.toLowerCase().split(/\s+/);
  
  fillerWords.forEach(filler => {
    breakdown[filler] = words.filter(word => word.includes(filler.replace(' ', ''))).length;
  });
  
  return breakdown;
}

function calculateClarityScore(text: string): number {
  const wordCount = countWords(text);
  const fillerCount = countFillers(text);
  const fillerRatio = wordCount > 0 ? fillerCount / wordCount : 0;
  return Math.max(0.3, Math.min(1.0, 1 - (fillerRatio * 2)));
}

function getPaceScore(wpm: number): number {
  // Optimal range is 110-140 WPM
  if (wpm >= 110 && wpm <= 140) return 100;
  if (wpm >= 90 && wpm <= 160) return 80;
  if (wpm >= 70 && wpm <= 180) return 60;
  return 40;
}

function tokenizeTranscript(text: string): Array<{t: string, type: string, start_ms: number, end_ms: number}> {
  const words = text.split(/\s+/);
  const fillerWords = ['um', 'uh', 'like', 'you', 'know', 'so', 'basically'];
  
  return words.map((word, index) => ({
    t: word,
    type: fillerWords.includes(word.toLowerCase()) ? 'filler' : 'word',
    start_ms: index * 500, // Rough estimation
    end_ms: (index + 1) * 500
  }));
}

function generateHighlights(text: string): Array<{type: string, start_ms: number, end_ms: number, text: string}> {
  const highlights: Array<{type: string, start_ms: number, end_ms: number, text: string}> = [];
  const fillerWords = ['um', 'uh', 'like'];
  const words = text.split(/\s+/);
  
  words.forEach((word, index) => {
    if (fillerWords.includes(word.toLowerCase())) {
      highlights.push({
        type: 'filler',
        start_ms: index * 500,
        end_ms: (index + 1) * 500,
        text: word
      });
    }
  });
  
  return highlights;
}

function generateRecommendations(text: string, durationSeconds: number): Array<{id: string, text: string, description: string}> {
  const recommendations = [];
  const wpm = calculateWPM(text, durationSeconds);
  const fillerCount = countFillers(text);
  
  if (fillerCount > 3) {
    recommendations.push({
      id: "rec-breathe",
      text: "Practice deep breathing before speaking",
      description: "Try the 4-6-4 breathing technique to reduce filler words"
    });
  }
  
  if (wpm < 110) {
    recommendations.push({
      id: "rec-pace",
      text: "Increase your speaking pace slightly",
      description: "Aim for 110-140 words per minute for better engagement"
    });
  } else if (wpm > 140) {
    recommendations.push({
      id: "rec-slow",
      text: "Slow down your speaking pace",
      description: "Speaking too fast can reduce clarity and comprehension"
    });
  }
  
  if (durationSeconds < 60) {
    recommendations.push({
      id: "rec-length",
      text: "Try longer practice sessions",
      description: "Aim for 2-3 minute sessions to build speaking endurance"
    });
  }
  
  return recommendations;
}

function calculateOverallScore(text: string, durationSeconds: number): number {
  const wpm = calculateWPM(text, durationSeconds);
  const fillerCount = countFillers(text);
  const wordCount = countWords(text);
  const clarityScore = calculateClarityScore(text);
  
  // Scoring rubric
  let score = 100;
  
  // Deduct for filler words (30% weight)
  const fillerPenalty = Math.min(30, (fillerCount / wordCount) * 100 * 0.3);
  score -= fillerPenalty;
  
  // Pace scoring (20% weight)
  const paceScore = getPaceScore(wpm);
  score = score * 0.8 + (paceScore * 0.2);
  
  // Clarity scoring (20% weight)
  score = score * 0.8 + (clarityScore * 100 * 0.2);
  
  // Duration bonus/penalty (10% weight)
  if (durationSeconds >= 120) score += 5; // Bonus for longer sessions
  if (durationSeconds < 30) score -= 10; // Penalty for very short sessions
  
  return Math.max(0, Math.min(100, Math.round(score)));
}