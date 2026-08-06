CREATE TABLE IF NOT EXISTS pending_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_intent_id text,
  user_id uuid REFERENCES auth.users(id),
  order_number text NOT NULL,
  customer_email text,
  customer_name text,
  items jsonb NOT NULL,
  total_amount numeric NOT NULL,
  currency text NOT NULL,
  shipping_address jsonb,
  shipping_country text,
  status text NOT NULL DEFAULT 'pending_payment',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pending_orders_payment_intent_id ON pending_orders(payment_intent_id);
CREATE INDEX IF NOT EXISTS idx_pending_orders_user_id ON pending_orders(user_id);

ALTER TABLE pending_orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users and admins can read pending orders" ON pending_orders;
CREATE POLICY "Users and admins can read pending orders" ON pending_orders
  FOR SELECT TO authenticated USING (user_id = auth.uid() OR is_admin());
