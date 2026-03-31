-- Idempotent Stripe Checkout fulfillment: one ledger row per Stripe Checkout Session id.
CREATE UNIQUE INDEX IF NOT EXISTS credit_transactions_payment_ref_key
  ON public.credit_transactions (payment_ref)
  WHERE payment_ref IS NOT NULL;
