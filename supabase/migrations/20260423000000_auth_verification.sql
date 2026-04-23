-- AUTH-PUB-001: Verification schema for tri-channel account activation
-- Tri-channel: email / telegram / whatsapp
-- Safety: bcrypt-hashed tokens only (INC-008: no silent stubs, no plain secrets)

ALTER TABLE public.intelink_unit_members
  ADD COLUMN IF NOT EXISTS verified_at timestamptz,
  ADD COLUMN IF NOT EXISTS verification_channel text,
  ADD COLUMN IF NOT EXISTS verification_token_hash text,
  ADD COLUMN IF NOT EXISTS verification_token_expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS verification_attempts integer NOT NULL DEFAULT 0;

ALTER TABLE public.intelink_unit_members
  DROP CONSTRAINT IF EXISTS intelink_unit_members_verification_channel_chk;

ALTER TABLE public.intelink_unit_members
  ADD CONSTRAINT intelink_unit_members_verification_channel_chk
  CHECK (verification_channel IS NULL OR verification_channel IN ('email','telegram','whatsapp'));

-- Backfill: existing active members are grandfathered as verified
-- Without this, all 3 current members lose access on deploy.
UPDATE public.intelink_unit_members
SET verified_at = COALESCE(approved_at, created_at, now()),
    verification_channel = CASE
        WHEN email IS NOT NULL THEN 'email'
        WHEN telegram_chat_id IS NOT NULL THEN 'telegram'
        ELSE 'email'
    END
WHERE verified_at IS NULL
  AND active = true;

CREATE INDEX IF NOT EXISTS intelink_unit_members_verification_token_hash_idx
  ON public.intelink_unit_members (verification_token_hash)
  WHERE verification_token_hash IS NOT NULL;

CREATE INDEX IF NOT EXISTS intelink_unit_members_verified_at_null_idx
  ON public.intelink_unit_members (id)
  WHERE verified_at IS NULL;

COMMENT ON COLUMN public.intelink_unit_members.verified_at IS
  'Account activation timestamp via tri-channel verify. NULL = unverified, middleware blocks access.';

COMMENT ON COLUMN public.intelink_unit_members.verification_channel IS
  'Which channel confirmed the account: email|telegram|whatsapp';

COMMENT ON COLUMN public.intelink_unit_members.verification_token_hash IS
  'bcrypt hash of 6-digit OTP. Never store plain (INC-008 safety).';
