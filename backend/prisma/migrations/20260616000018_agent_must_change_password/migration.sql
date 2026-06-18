-- Force a password change after an admin sets a portal user's password.
ALTER TABLE "AgentUser" ADD COLUMN IF NOT EXISTS "mustChangePassword" BOOLEAN NOT NULL DEFAULT false;
