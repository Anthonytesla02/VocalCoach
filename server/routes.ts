import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertSessionSchema } from "@shared/schema";
import { analyzeAudio } from "./mistral";
import multer from "multer";
import path from "path";
import fs from "fs";

const upload = multer({ 
  dest: 'uploads/',
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB limit
});

export async function registerRoutes(app: Express): Promise<Server> {
  
  // Initialize demo user
  app.post("/api/users/init", async (req, res) => {
    try {
      const { userId } = req.body;
      
      // Check if user already exists
      const existingUser = await storage.getUser(userId);
      if (existingUser) {
        return res.json({ message: "User already exists", user: existingUser });
      }
      
      // Create demo user
      const user = await storage.createUser({
        username: userId,
        password: "demo-password"
      });
      
      res.json({ message: "User created", user });
    } catch (error) {
      console.error("Error initializing user:", error);
      res.status(500).json({ error: "Failed to initialize user" });
    }
  });
  
  // Get user progress
  app.get("/api/users/:userId/progress", async (req, res) => {
    try {
      const { userId } = req.params;
      
      // Auto-initialize user if not exists
      let user = await storage.getUser(userId);
      if (!user) {
        user = await storage.createUser({
          username: userId,
          password: "demo-password"
        });
      }
      
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

  // Process transcript from browser speech recognition
  app.post("/api/sessions/analyze", async (req, res) => {
    try {
      console.log("Received analysis request:", {
        hasUserId: !!req.body?.userId,
        hasPracticeMode: !!req.body?.practiceMode,
        hasTranscript: !!req.body?.transcript,
        hasDurationMs: !!req.body?.durationMs,
        bodyKeys: Object.keys(req.body || {}),
        body: req.body
      });
      
      const { userId, practiceMode, transcript, durationMs } = req.body;
      
      if (!userId || !practiceMode) {
        return res.status(400).json({ error: "Missing userId or practiceMode" });
      }
      
      if (!transcript || transcript.trim() === "") {
        return res.status(400).json({ error: "No transcript available - speech recognition may have failed" });
      }
      
      if (!durationMs || durationMs < 1000) {
        return res.status(400).json({ error: "Invalid session duration" });
      }

      console.log("Processing transcript:", transcript.substring(0, 100) + "...");
      
      // Analyze the transcription using Mistral
      const analysis = await analyzeAudio(transcript, durationMs / 1000);
      
      // Create session record
      const sessionData = {
        userId,
        durationMs,
        audioUri: null, // No audio file since we're using browser speech recognition
        transcript: analysis.transcript,
        metrics: analysis.metrics,
        fillerBreakdown: analysis.fillerBreakdown,
        highlights: analysis.highlights,
        recommendations: analysis.recommendations,
        score: analysis.score,
        practiceMode,
      };

      const session = await storage.createSession(sessionData);

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
      console.error("Error analyzing transcript:", error);
      res.status(500).json({ error: "Failed to analyze transcript" });
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
