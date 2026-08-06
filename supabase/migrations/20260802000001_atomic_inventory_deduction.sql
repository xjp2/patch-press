-- Atomic inventory deduction for an order
CREATE OR REPLACE FUNCTION deduct_inventory_for_order(
  order_items jsonb,
  order_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  item jsonb;
  product_id uuid;
  product_qty integer;
  patch_id text;
  patch_count integer;
  previous_qty integer;
  new_qty integer;
BEGIN
  -- Service-role requests (e.g. Supabase Edge Functions) are allowed to deduct
  -- inventory for any order. All other callers must own the order or be admins.
  IF COALESCE(current_setting('request.jwt.claims', true), '{}')::jsonb->>'role' != 'service_role' THEN
    IF NOT EXISTS (
      SELECT 1 FROM orders
      WHERE id = order_id AND (user_id = auth.uid() OR is_admin())
    ) THEN
      RAISE EXCEPTION 'ORDER_NOT_FOUND_OR_UNAUTHORIZED';
    END IF;
  END IF;

  FOR item IN SELECT * FROM jsonb_array_elements(order_items) LOOP
    product_id := (item->>'productId')::uuid;
    product_qty := COALESCE((item->>'quantity')::integer, 1);

    -- Deduct product atomically; raise if stock insufficient
    UPDATE products
    SET quantity = quantity - product_qty,
        updated_at = now()
    WHERE id = product_id
      AND quantity >= product_qty
    RETURNING quantity + product_qty, quantity INTO previous_qty, new_qty;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'INSUFFICIENT_STOCK: product %', product_id;
    END IF;

    INSERT INTO inventory_logs (product_id, item_type, change_amount, previous_quantity, new_quantity, reason, order_id)
    VALUES (product_id, 'product', -product_qty, previous_qty, new_qty, 'Order ' || order_id, order_id);

    -- Deduct patches atomically; raise if stock insufficient
    FOR patch_id, patch_count IN SELECT key, value::integer FROM jsonb_each(item->'patchCounts') LOOP
      UPDATE patches
      SET quantity = quantity - patch_count,
          updated_at = now()
      WHERE id = patch_id::uuid
        AND quantity >= patch_count
      RETURNING quantity + patch_count, quantity INTO previous_qty, new_qty;

      IF NOT FOUND THEN
        RAISE EXCEPTION 'INSUFFICIENT_STOCK: patch %', patch_id;
      END IF;

      INSERT INTO inventory_logs (product_id, item_type, change_amount, previous_quantity, new_quantity, reason, order_id)
      VALUES (patch_id::uuid, 'patch', -patch_count, previous_qty, new_qty, 'Order ' || order_id || ' - ' || patch_count || 'x Patch used', order_id);
    END LOOP;
  END LOOP;

  RETURN jsonb_build_object('success', true, 'errors', '[]'::jsonb);
EXCEPTION
  WHEN OTHERS THEN
    -- Any failure rolls back the entire transaction
    RETURN jsonb_build_object('success', false, 'errors', jsonb_build_array(jsonb_build_object('message', SQLERRM)));
END;
$$;
