-- Force admin users to change a password set for them by another admin.
ALTER TABLE "AdminUser" ADD COLUMN IF NOT EXISTS "mustChangePassword" BOOLEAN NOT NULL DEFAULT false;
