import { users, sessions, userProgress, achievements, type User, type InsertUser, type Session, type InsertSession, type UserProgress, type InsertUserProgress, type Achievement, type InsertAchievement } from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, gte, sql } from "drizzle-orm";

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

export const storage = new DatabaseStorage();
