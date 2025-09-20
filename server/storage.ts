import { users, sessions, userProgress, achievements, type User, type InsertUser, type Session, type InsertSession, type UserProgress, type InsertUserProgress, type Achievement, type InsertAchievement } from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, gte, sql } from "drizzle-orm";
import { randomUUID } from "crypto";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  createSession(session: InsertSession): Promise<Session>;
  getUserSessions(userId: string, limit?: number): Promise<Session[]>;
  getSession(id: string): Promise<Session | undefined>;
  
  getUserProgress(userId: string): Promise<UserProgress | undefined>;
  updateUserProgress(userId: string, progress: Partial<InsertUserProgress>): Promise<UserProgress>;
  
  getUserAchievements(userId: string): Promise<Achievement[]>;
  createAchievement(achievement: InsertAchievement): Promise<Achievement>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    
    // Create initial progress record
    await db.insert(userProgress).values({
      userId: user.id,
    });
    
    return user;
  }

  async createSession(insertSession: InsertSession): Promise<Session> {
    const [session] = await db
      .insert(sessions)
      .values(insertSession)
      .returning();
    
    // Update user progress
    await this.updateUserProgressAfterSession(insertSession.userId, session);
    
    return session;
  }

  async getUserSessions(userId: string, limit: number = 10): Promise<Session[]> {
    return await db
      .select()
      .from(sessions)
      .where(eq(sessions.userId, userId))
      .orderBy(desc(sessions.createdAt))
      .limit(limit);
  }

  async getSession(id: string): Promise<Session | undefined> {
    const [session] = await db.select().from(sessions).where(eq(sessions.id, id));
    return session || undefined;
  }

  async getUserProgress(userId: string): Promise<UserProgress | undefined> {
    const [progress] = await db.select().from(userProgress).where(eq(userProgress.userId, userId));
    return progress || undefined;
  }

  async updateUserProgress(userId: string, progressUpdate: Partial<InsertUserProgress>): Promise<UserProgress> {
    const [progress] = await db
      .update(userProgress)
      .set({ ...progressUpdate, updatedAt: new Date() })
      .where(eq(userProgress.userId, userId))
      .returning();
    
    return progress;
  }

  async getUserAchievements(userId: string): Promise<Achievement[]> {
    return await db
      .select()
      .from(achievements)
      .where(eq(achievements.userId, userId))
      .orderBy(desc(achievements.unlockedAt));
  }

  async createAchievement(insertAchievement: InsertAchievement): Promise<Achievement> {
    const [achievement] = await db
      .insert(achievements)
      .values(insertAchievement)
      .returning();
    
    return achievement;
  }

  private async updateUserProgressAfterSession(userId: string, session: Session) {
    const currentProgress = await this.getUserProgress(userId);
    if (!currentProgress) return;

    const recentSessions = await this.getUserSessions(userId, 5);
    
    // Calculate streak
    const today = new Date();
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
    const hasSessionToday = recentSessions.some(s => 
      s.createdAt && s.createdAt.toDateString() === today.toDateString()
    );
    const hasSessionYesterday = recentSessions.some(s => 
      s.createdAt && s.createdAt.toDateString() === yesterday.toDateString()
    );

    let newStreak = currentProgress.currentStreak || 0;
    if (hasSessionToday && !currentProgress.lastSessionAt) {
      newStreak = 1;
    } else if (hasSessionToday && hasSessionYesterday) {
      newStreak = (currentProgress.currentStreak || 0) + 1;
    } else if (!hasSessionYesterday) {
      newStreak = 1;
    }

    // Calculate averages
    const avgFillerReduction = recentSessions.length > 0 ? 
      recentSessions.reduce((acc, s) => {
        const metrics = s.metrics as any;
        return acc + (metrics?.fillerImprovement || 0);
      }, 0) / recentSessions.length : 0;

    const avgPaceControl = recentSessions.length > 0 ? 
      recentSessions.reduce((acc, s) => {
        const metrics = s.metrics as any;
        return acc + (metrics?.paceScore || 0);
      }, 0) / recentSessions.length : 0;

    await this.updateUserProgress(userId, {
      totalSessions: (currentProgress.totalSessions || 0) + 1,
      currentStreak: newStreak,
      bestScore: Math.max(currentProgress.bestScore || 0, session.score),
      avgFillerReduction,
      avgPaceControl,
      lastSessionAt: session.createdAt,
    });

    // Check for achievements
    await this.checkAchievements(userId, session, newStreak);
  }

  private async checkAchievements(userId: string, session: Session, streak: number) {
    const existingAchievements = await this.getUserAchievements(userId);
    const achievementTypes = existingAchievements.map(a => a.type);

    // Streak achievements
    if (streak >= 7 && !achievementTypes.includes("streak_7")) {
      await this.createAchievement({
        userId,
        type: "streak_7",
        title: "7 Day Streak",
        description: "Practiced for 7 days in a row",
        icon: "fas fa-fire",
      });
    }

    // Score achievements
    if (session.score >= 80 && !achievementTypes.includes("score_80")) {
      await this.createAchievement({
        userId,
        type: "score_80",
        title: "First 80+",
        description: "Achieved a score of 80 or higher",
        icon: "fas fa-star",
      });
    }

    // Time-based achievements
    if (session.durationMs >= 300000 && !achievementTypes.includes("time_master")) { // 5 minutes
      await this.createAchievement({
        userId,
        type: "time_master",
        title: "Time Master",
        description: "Completed a 5+ minute session",
        icon: "fas fa-clock",
      });
    }
  }
}

// MemStorage implementation for in-memory storage without external dependencies
export class MemStorage implements IStorage {
  private users = new Map<string, User>();
  private sessionsMap = new Map<string, Session>();
  private progressMap = new Map<string, UserProgress>();
  private achievementsMap = new Map<string, Achievement[]>();

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    for (const user of Array.from(this.users.values())) {
      if (user.username === username) {
        return user;
      }
    }
    return undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const user: User = {
      id: randomUUID(),
      username: insertUser.username,
      password: insertUser.password,
      createdAt: new Date(),
    };
    
    this.users.set(user.id, user);
    
    // Create initial progress record
    const progress: UserProgress = {
      id: randomUUID(),
      userId: user.id,
      totalSessions: 0,
      currentStreak: 0,
      bestScore: 0,
      avgFillerReduction: 0,
      avgPaceControl: 0,
      weeklyGoal: 7,
      weeklyCompleted: 0,
      lastSessionAt: null,
      updatedAt: new Date(),
    };
    
    this.progressMap.set(user.id, progress);
    this.achievementsMap.set(user.id, []);
    
    return user;
  }

  async createSession(insertSession: InsertSession): Promise<Session> {
    const session: Session = {
      id: randomUUID(),
      userId: insertSession.userId,
      durationMs: insertSession.durationMs,
      audioUri: insertSession.audioUri || null,
      videoUri: insertSession.videoUri || null,
      transcript: insertSession.transcript || null,
      metrics: insertSession.metrics || null,
      fillerBreakdown: insertSession.fillerBreakdown || null,
      highlights: insertSession.highlights || null,
      recommendations: insertSession.recommendations || null,
      score: insertSession.score,
      practiceMode: insertSession.practiceMode,
      createdAt: new Date(),
    };
    
    this.sessionsMap.set(session.id, session);
    
    // Update user progress
    await this.updateUserProgressAfterSession(insertSession.userId, session);
    
    return session;
  }

  async getUserSessions(userId: string, limit: number = 10): Promise<Session[]> {
    const userSessions = Array.from(this.sessionsMap.values())
      .filter(session => session.userId === userId)
      .sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0))
      .slice(0, limit);
    
    return userSessions;
  }

  async getSession(id: string): Promise<Session | undefined> {
    return this.sessionsMap.get(id);
  }

  async getUserProgress(userId: string): Promise<UserProgress | undefined> {
    return this.progressMap.get(userId);
  }

  async updateUserProgress(userId: string, progressUpdate: Partial<InsertUserProgress>): Promise<UserProgress> {
    const currentProgress = this.progressMap.get(userId);
    if (!currentProgress) {
      throw new Error(`User progress not found for user ${userId}`);
    }
    
    const updatedProgress: UserProgress = {
      ...currentProgress,
      ...progressUpdate,
      updatedAt: new Date(),
    };
    
    this.progressMap.set(userId, updatedProgress);
    return updatedProgress;
  }

  async getUserAchievements(userId: string): Promise<Achievement[]> {
    return this.achievementsMap.get(userId) || [];
  }

  async createAchievement(insertAchievement: InsertAchievement): Promise<Achievement> {
    const achievement: Achievement = {
      id: randomUUID(),
      userId: insertAchievement.userId,
      type: insertAchievement.type,
      title: insertAchievement.title,
      description: insertAchievement.description,
      icon: insertAchievement.icon,
      unlockedAt: new Date(),
    };
    
    const userAchievements = this.achievementsMap.get(insertAchievement.userId) || [];
    userAchievements.push(achievement);
    userAchievements.sort((a, b) => (b.unlockedAt?.getTime() || 0) - (a.unlockedAt?.getTime() || 0));
    this.achievementsMap.set(insertAchievement.userId, userAchievements);
    
    return achievement;
  }

  private async updateUserProgressAfterSession(userId: string, session: Session) {
    const currentProgress = await this.getUserProgress(userId);
    if (!currentProgress) return;

    const recentSessions = await this.getUserSessions(userId, 5);
    
    // Calculate streak
    const today = new Date();
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
    const hasSessionToday = recentSessions.some(s => 
      s.createdAt && s.createdAt.toDateString() === today.toDateString()
    );
    const hasSessionYesterday = recentSessions.some(s => 
      s.createdAt && s.createdAt.toDateString() === yesterday.toDateString()
    );

    let newStreak = currentProgress.currentStreak || 0;
    if (hasSessionToday && !currentProgress.lastSessionAt) {
      newStreak = 1;
    } else if (hasSessionToday && hasSessionYesterday) {
      newStreak = (currentProgress.currentStreak || 0) + 1;
    } else if (!hasSessionYesterday) {
      newStreak = 1;
    }

    // Calculate averages
    const avgFillerReduction = recentSessions.length > 0 ? 
      recentSessions.reduce((acc, s) => {
        const metrics = s.metrics as any;
        return acc + (metrics?.fillerImprovement || 0);
      }, 0) / recentSessions.length : 0;

    const avgPaceControl = recentSessions.length > 0 ? 
      recentSessions.reduce((acc, s) => {
        const metrics = s.metrics as any;
        return acc + (metrics?.paceScore || 0);
      }, 0) / recentSessions.length : 0;

    await this.updateUserProgress(userId, {
      totalSessions: (currentProgress.totalSessions || 0) + 1,
      currentStreak: newStreak,
      bestScore: Math.max(currentProgress.bestScore || 0, session.score),
      avgFillerReduction,
      avgPaceControl,
      lastSessionAt: session.createdAt,
    });

    // Check for achievements
    await this.checkAchievements(userId, session, newStreak);
  }

  private async checkAchievements(userId: string, session: Session, streak: number) {
    const existingAchievements = await this.getUserAchievements(userId);
    const achievementTypes = existingAchievements.map(a => a.type);

    // Streak achievements
    if (streak >= 7 && !achievementTypes.includes("streak_7")) {
      await this.createAchievement({
        userId,
        type: "streak_7",
        title: "7 Day Streak",
        description: "Practiced for 7 days in a row",
        icon: "fas fa-fire",
      });
    }

    // Score achievements
    if (session.score >= 80 && !achievementTypes.includes("score_80")) {
      await this.createAchievement({
        userId,
        type: "score_80",
        title: "First 80+",
        description: "Achieved a score of 80 or higher",
        icon: "fas fa-star",
      });
    }

    // Time-based achievements
    if (session.durationMs >= 300000 && !achievementTypes.includes("time_master")) { // 5 minutes
      await this.createAchievement({
        userId,
        type: "time_master",
        title: "Time Master",
        description: "Completed a 5+ minute session",
        icon: "fas fa-clock",
      });
    }
  }
}

// Use MemStorage by default, DatabaseStorage only if USE_DB=true
export const storage = process.env.USE_DB === 'true' && db ? new DatabaseStorage() : new MemStorage();
