import db from '../src/db/index';
import { sql } from 'drizzle-orm';

async function migrate() {
  try {
    await db.execute(sql`ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "phone" varchar(255) DEFAULT '' NOT NULL;`);
    console.log('✅ Added phone column to User table');
    
    try {
      await db.execute(sql`ALTER TABLE "RefreshToken" ADD CONSTRAINT "RefreshToken_token_unique" UNIQUE ("token");`);
      console.log('✅ Added unique constraint to RefreshToken');
    } catch(e: any) {
      console.log('⚠️ Constraint already exists or data issue:', e.message);
    }
  } catch(e: any) {
    console.error('Migration error:', e.message);
  } finally {
    process.exit(0);
  }
}

migrate();
