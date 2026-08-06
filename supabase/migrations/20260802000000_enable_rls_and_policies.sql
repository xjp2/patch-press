-- Enable RLS on all tables that need it
ALTER TABLE IF EXISTS products ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS patches ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS site_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS cart_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS inventory_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS payment_logs ENABLE ROW LEVEL SECURITY;

-- Create payment_logs table if it doesn't exist (used by Stripe webhook)
CREATE TABLE IF NOT EXISTS payment_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  payment_intent_id TEXT,
  status TEXT,
  error_message TEXT,
  amount NUMERIC,
  currency TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payment_logs_payment_intent_id ON payment_logs(payment_intent_id);
CREATE INDEX IF NOT EXISTS idx_payment_logs_created_at ON payment_logs(created_at DESC);

ALTER TABLE IF EXISTS payment_logs ENABLE ROW LEVEL SECURITY;

-- Helper function to check if current user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$;

-- Products: public read, admin manage
DROP POLICY IF EXISTS "Products are publicly readable" ON products;
CREATE POLICY "Products are publicly readable" ON products
  FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "Only admins can manage products" ON products;
CREATE POLICY "Only admins can manage products" ON products
  FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

-- Patches: public read, admin manage
DROP POLICY IF EXISTS "Patches are publicly readable" ON patches;
CREATE POLICY "Patches are publicly readable" ON patches
  FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "Only admins can manage patches" ON patches;
CREATE POLICY "Only admins can manage patches" ON patches
  FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

-- Site content: public read, admin manage
DROP POLICY IF EXISTS "Site content is publicly readable" ON site_content;
CREATE POLICY "Site content is publicly readable" ON site_content
  FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "Only admins can manage site content" ON site_content;
CREATE POLICY "Only admins can manage site content" ON site_content
  FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

-- Orders: users own, admins all
DROP POLICY IF EXISTS "Users and admins can read orders" ON orders;
CREATE POLICY "Users and admins can read orders" ON orders
  FOR SELECT TO authenticated USING (user_id = auth.uid() OR is_admin());
DROP POLICY IF EXISTS "Users can create their own orders" ON orders;
CREATE POLICY "Users can create their own orders" ON orders
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "Users and admins can update orders" ON orders;
CREATE POLICY "Users and admins can update orders" ON orders
  FOR UPDATE TO authenticated USING (user_id = auth.uid() OR is_admin()) WITH CHECK (user_id = auth.uid() OR is_admin());
DROP POLICY IF EXISTS "Users and admins can delete orders" ON orders;
CREATE POLICY "Users and admins can delete orders" ON orders
  FOR DELETE TO authenticated USING (user_id = auth.uid() OR is_admin());

-- Order items: access via owning order
DROP POLICY IF EXISTS "Users and admins can read order items" ON order_items;
CREATE POLICY "Users and admins can read order items" ON order_items
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_items.order_id
        AND (orders.user_id = auth.uid() OR is_admin())
    )
  );
DROP POLICY IF EXISTS "Users can create order items for their orders" ON order_items;
CREATE POLICY "Users can create order items for their orders" ON order_items
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_items.order_id
        AND orders.user_id = auth.uid()
    )
  );
DROP POLICY IF EXISTS "Users and admins can update order items" ON order_items;
CREATE POLICY "Users and admins can update order items" ON order_items
  FOR UPDATE TO authenticated USING (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_items.order_id
        AND (orders.user_id = auth.uid() OR is_admin())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_items.order_id
        AND (orders.user_id = auth.uid() OR is_admin())
    )
  );
DROP POLICY IF EXISTS "Users and admins can delete order items" ON order_items;
CREATE POLICY "Users and admins can delete order items" ON order_items
  FOR DELETE TO authenticated USING (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_items.order_id
        AND (orders.user_id = auth.uid() OR is_admin())
    )
  );

-- Cart items: users own only
DROP POLICY IF EXISTS "Users can manage their own cart" ON cart_items;
CREATE POLICY "Users can manage their own cart" ON cart_items
  FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Profiles: users own, admins all
DROP POLICY IF EXISTS "Users and admins can read profiles" ON profiles;
CREATE POLICY "Users and admins can read profiles" ON profiles
  FOR SELECT TO authenticated USING (id = auth.uid() OR is_admin());
DROP POLICY IF EXISTS "Users and admins can update profiles" ON profiles;
CREATE POLICY "Users and admins can update profiles" ON profiles
  FOR UPDATE TO authenticated USING (id = auth.uid() OR is_admin()) WITH CHECK (id = auth.uid() OR is_admin());
DROP POLICY IF EXISTS "Admins can manage profiles" ON profiles;
CREATE POLICY "Admins can manage profiles" ON profiles
  FOR DELETE TO authenticated USING (is_admin());

-- Inventory logs: admin read only
DROP POLICY IF EXISTS "Admins can read inventory logs" ON inventory_logs;
CREATE POLICY "Admins can read inventory logs" ON inventory_logs
  FOR SELECT TO authenticated USING (is_admin());

-- Payment logs: admin read only
DROP POLICY IF EXISTS "Admins can read payment logs" ON payment_logs;
CREATE POLICY "Admins can read payment logs" ON payment_logs
  FOR SELECT TO authenticated USING (is_admin());
