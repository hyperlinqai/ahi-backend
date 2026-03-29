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

    await db.execute(sql`
      DO $$
      BEGIN
        BEGIN
          ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'MANAGER';
          ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'SUPPORT';
          ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'CATALOG_MANAGER';
        EXCEPTION
          WHEN duplicate_object THEN NULL;
        END;
      END $$;
    `);
    console.log('✅ Synced Role enum values');

    await db.execute(sql`ALTER TABLE "CartItem" ADD COLUMN IF NOT EXISTS "variantId" text;`);
    console.log('✅ Ensured CartItem.variantId column exists');

    await db.execute(sql`
      UPDATE "CartItem" AS ci
      SET "variantId" = pv.id
      FROM LATERAL (
        SELECT id
        FROM "ProductVariant"
        WHERE "productId" = ci."productId"
        ORDER BY "createdAt" ASC, id ASC
        LIMIT 1
      ) AS pv
      WHERE ci."variantId" IS NULL;
    `);
    console.log('✅ Backfilled CartItem.variantId from the first product variant');

    const [{ count: missingVariantCount }] = await db.execute<{ count: number }>(sql`
      SELECT COUNT(*)::int AS count
      FROM "CartItem"
      WHERE "variantId" IS NULL;
    `);

    if (missingVariantCount > 0) {
      throw new Error(`CartItem rows without variants remain: ${missingVariantCount}`);
    }

    await db.execute(sql`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname = 'CartItem_cartId_productId_unique'
        ) THEN
          ALTER TABLE "CartItem" DROP CONSTRAINT "CartItem_cartId_productId_unique";
        END IF;
      END $$;
    `);
    console.log('✅ Removed old CartItem cartId/productId uniqueness');

    await db.execute(sql`ALTER TABLE "CartItem" ALTER COLUMN "variantId" SET NOT NULL;`);
    console.log('✅ Enforced CartItem.variantId NOT NULL');

    await db.execute(sql`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname = 'CartItem_variantId_ProductVariant_id_fk'
        ) THEN
          ALTER TABLE "CartItem"
          ADD CONSTRAINT "CartItem_variantId_ProductVariant_id_fk"
          FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id")
          ON DELETE CASCADE ON UPDATE NO ACTION;
        END IF;
      END $$;
    `);
    console.log('✅ Added CartItem.variantId foreign key');

    await db.execute(sql`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname = 'CartItem_cartId_variantId_unique'
        ) THEN
          ALTER TABLE "CartItem"
          ADD CONSTRAINT "CartItem_cartId_variantId_unique" UNIQUE ("cartId", "variantId");
        END IF;
      END $$;
    `);
    console.log('✅ Added CartItem cartId/variantId uniqueness');
  } catch(e: any) {
    console.error('Migration error:', e.message);
  } finally {
    process.exit(0);
  }
}

migrate();
