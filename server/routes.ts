import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertSessionSchema } from "@shared/schema";
import { analyzeAudio, transcribeAudio } from "./openai";
import multer from "multer";
import path from "path";
import fs from "fs";

const upload = multer({ 
  dest: 'uploads/',
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB limit
});

export async function registerRoutes(app: Express): Promise<Server> {
  
  // Get user progress
  app.get("/api/users/:userId/progress", async (req, res) => {
    try {
      const { userId } = req.params;
      const progress = await storage.getUserProgress(userId);
      
      if (!progress) {
        return res.status(404).json({ error: "User progress not found" });
      }
      
      res.json(progress);
    } catch (error) {
      console.error("Error fetching user progress:", error);
      res.status(500).json({ error: "Failed to fetch user progress" });
    }
  });

  // Get user sessions
  app.get("/api/users/:userId/sessions", async (req, res) => {
    try {
      const { userId } = req.params;
      const limit = parseInt(req.query.limit as string) || 10;
      
      const sessions = await storage.getUserSessions(userId, limit);
      res.json(sessions);
    } catch (error) {
      console.error("Error fetching user sessions:", error);
      res.status(500).json({ error: "Failed to fetch user sessions" });
    }
  });

  // Get user achievements
  app.get("/api/users/:userId/achievements", async (req, res) => {
    try {
      const { userId } = req.params;
      const achievements = await storage.getUserAchievements(userId);
      res.json(achievements);
    } catch (error) {
      console.error("Error fetching user achievements:", error);
      res.status(500).json({ error: "Failed to fetch user achievements" });
    }
  });

  // Process audio recording
  app.post("/api/sessions/analyze", upload.single("audio"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No audio file provided" });
      }

      const { userId, practiceMode } = req.body;
      
      if (!userId || !practiceMode) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      console.log("Processing audio file:", req.file.filename);
      
      // Transcribe audio using OpenAI Whisper
      const transcriptionResult = await transcribeAudio(req.file.path);
      
      // Analyze the transcription
      const analysis = await analyzeAudio(transcriptionResult.text, transcriptionResult.duration);
      
      // Create session record
      const sessionData = {
        userId,
        durationMs: Math.round(transcriptionResult.duration * 1000),
        audioUri: req.file.filename,
        transcript: analysis.transcript,
        metrics: analysis.metrics,
        fillerBreakdown: analysis.fillerBreakdown,
        highlights: analysis.highlights,
        recommendations: analysis.recommendations,
        score: analysis.score,
        practiceMode,
      };

      const session = await storage.createSession(sessionData);

      // Clean up uploaded file
      fs.unlinkSync(req.file.path);

      res.json({
        sessionId: session.id,
        analysis: {
          transcript: analysis.transcript,
          metrics: analysis.metrics,
          fillerBreakdown: analysis.fillerBreakdown,
          highlights: analysis.highlights,
          recommendations: analysis.recommendations,
          score: analysis.score,
        }
      });
    } catch (error) {
      console.error("Error analyzing audio:", error);
      res.status(500).json({ error: "Failed to analyze audio" });
    }
  });

  // Generate AI passage for practice
  app.get("/api/practice/ai-passage", async (req, res) => {
    try {
      const passages = [
        "Explain your favorite hobby to someone who's never heard of it before. Focus on what makes it interesting and why you enjoy it.",
        "Describe a place you'd love to visit and what you would do there. Paint a vivid picture with your words.",
        "Tell us about a skill you've learned recently and how it has impacted your daily life.",
        "Share your thoughts on the importance of communication in building relationships.",
        "Describe a challenge you've overcome and what you learned from the experience.",
      ];
      
      const randomPassage = passages[Math.floor(Math.random() * passages.length)];
      res.json({ passage: randomPassage });
    } catch (error) {
      console.error("Error generating AI passage:", error);
      res.status(500).json({ error: "Failed to generate AI passage" });
    }
  });

  // Get session details
  app.get("/api/sessions/:sessionId", async (req, res) => {
    try {
      const { sessionId } = req.params;
      const session = await storage.getSession(sessionId);
      
      if (!session) {
        return res.status(404).json({ error: "Session not found" });
      }
      
      res.json(session);
    } catch (error) {
      console.error("Error fetching session:", error);
      res.status(500).json({ error: "Failed to fetch session" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
