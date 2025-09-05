-- Disable email confirmation requirement
-- This allows users to sign up without email verification
UPDATE auth.config SET email_confirm = false;