-- Add merchant availability (issue #8 / #31). Safe to run on existing DBs.
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS merchant_available BOOLEAN NOT NULL DEFAULT true;
