-- Add new columns for calendar connection status
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS has_google_calendar boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS google_token_expired boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS google_access_token text,
ADD COLUMN IF NOT EXISTS google_refresh_token text,
ADD COLUMN IF NOT EXISTS google_token_expires_at timestamp with time zone;