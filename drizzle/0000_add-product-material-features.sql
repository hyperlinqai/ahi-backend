-- Add material and features columns to Product table
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "material" text;
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "features" text;
