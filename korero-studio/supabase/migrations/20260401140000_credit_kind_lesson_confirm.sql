-- Ledger kind for locking in a lesson after instructor confirms slots (credits or Stripe).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'credit_transaction_kind'
      AND e.enumlabel = 'lesson_confirm'
  ) THEN
    ALTER TYPE public.credit_transaction_kind ADD VALUE 'lesson_confirm';
  END IF;
END
$$;
