-- Add unique constraint to prevent duplicate usernames per day
-- Run this in Supabase SQL Editor

ALTER TABLE predictions 
ADD CONSTRAINT unique_user_per_day 
UNIQUE (discord_username, challenge_date);

-- This ensures that even if the application code fails,
-- the database will prevent duplicate entries
