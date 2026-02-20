ALTER TABLE email_verifications ADD COLUMN purpose TEXT NOT NULL DEFAULT 'register';
CREATE INDEX IF NOT EXISTS idx_email_verifications_email_purpose ON email_verifications(email, purpose);
