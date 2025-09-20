import { sql, relations } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, real, jsonb, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const sessions = pgTable("sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  durationMs: integer("duration_ms").notNull(),
  audioUri: text("audio_uri"),
  videoUri: text("video_uri"),
  transcript: jsonb("transcript"),
  metrics: jsonb("metrics"),
  fillerBreakdown: jsonb("filler_breakdown"),
  highlights: jsonb("highlights"),
  recommendations: jsonb("recommendations"),
  score: integer("score").notNull(),
  practiceMode: text("practice_mode").notNull(), // "ai_passage" or "my_script"
  createdAt: timestamp("created_at").defaultNow(),
});

export const userProgress = pgTable("user_progress", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  totalSessions: integer("total_sessions").default(0),
  currentStreak: integer("current_streak").default(0),
  bestScore: integer("best_score").default(0),
  avgFillerReduction: real("avg_filler_reduction").default(0),
  avgPaceControl: real("avg_pace_control").default(0),
  weeklyGoal: integer("weekly_goal").default(7),
  weeklyCompleted: integer("weekly_completed").default(0),
  lastSessionAt: timestamp("last_session_at"),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const achievements = pgTable("achievements", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  type: text("type").notNull(), // "streak", "score", "sessions", etc.
  title: text("title").notNull(),
  description: text("description").notNull(),
  icon: text("icon").notNull(),
  unlockedAt: timestamp("unlocked_at").defaultNow(),
});

export const usersRelations = relations(users, ({ many }) => ({
  sessions: many(sessions),
  progress: many(userProgress),
  achievements: many(achievements),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, {
    fields: [sessions.userId],
    references: [users.id],
  }),
}));

export const userProgressRelations = relations(userProgress, ({ one }) => ({
  user: one(users, {
    fields: [userProgress.userId],
    references: [users.id],
  }),
}));

export const achievementsRelations = relations(achievements, ({ one }) => ({
  user: one(users, {
    fields: [achievements.userId],
    references: [users.id],
  }),
}));

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

export const insertSessionSchema = createInsertSchema(sessions).omit({
  id: true,
  createdAt: true,
});

export const insertUserProgressSchema = createInsertSchema(userProgress).omit({
  id: true,
  updatedAt: true,
});

export const insertAchievementSchema = createInsertSchema(achievements).omit({
  id: true,
  unlockedAt: true,
});

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Session = typeof sessions.$inferSelect;
export type InsertSession = z.infer<typeof insertSessionSchema>;
export type UserProgress = typeof userProgress.$inferSelect;
export type InsertUserProgress = z.infer<typeof insertUserProgressSchema>;
export type Achievement = typeof achievements.$inferSelect;
export type InsertAchievement = z.infer<typeof insertAchievementSchema>;
