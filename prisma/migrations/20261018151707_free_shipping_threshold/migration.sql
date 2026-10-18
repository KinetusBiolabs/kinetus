-- Mike's change: free shipping from $249 (was $199). The threshold column already exists
-- (Admin > Settings, used by the cart and quoted across the site through lib/shipping.ts):
-- new rows default to 24900 cents, and the existing settings row is set to 24900 once.
-- Admin > Settings can change it afterwards.

-- AlterTable
ALTER TABLE "StoreSetting" ALTER COLUMN "freeShippingThresholdCents" SET DEFAULT 24900;

-- Existing settings row: $249.00.
UPDATE "StoreSetting" SET "freeShippingThresholdCents" = 24900;
