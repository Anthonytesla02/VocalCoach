import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

neonConfig.webSocketConstructor = ws;

// Only initialize database if USE_DB is true and DATABASE_URL is provided
let pool: Pool | null = null;
let db: any = null;

if (process.env.USE_DB === 'true' && process.env.DATABASE_URL) {
  try {
    pool = new Pool({ connectionString: process.env.DATABASE_URL });
    db = drizzle({ client: pool, schema });
  } catch (error) {
    console.warn('Failed to connect to database, falling back to MemStorage:', error);
  }
}

export { pool, db };