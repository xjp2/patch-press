-- Migration: Fix inventory_logs table to support both products and patches
-- Created: 2024-03-21
-- Purpose: Allow inventory logs to track both product and patch inventory changes

-- First, check if inventory_logs table exists and create it if not
CREATE TABLE IF NOT EXISTS inventory_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    product_id UUID NOT NULL,  -- Can be product ID or patch ID
    item_type VARCHAR(20) DEFAULT 'product' CHECK (item_type IN ('product', 'patch')),
    change_amount INTEGER NOT NULL,
    previous_quantity INTEGER NOT NULL,
    new_quantity INTEGER NOT NULL,
    reason TEXT NOT NULL,
    order_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add item_type column if it doesn't exist (for existing tables)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'inventory_logs' 
                   AND column_name = 'item_type') THEN
        ALTER TABLE inventory_logs ADD COLUMN item_type VARCHAR(20) DEFAULT 'product';
        ALTER TABLE inventory_logs ADD CONSTRAINT chk_item_type 
            CHECK (item_type IN ('product', 'patch'));
    END IF;
END $$;

-- Remove foreign key constraint if it exists (so patch IDs can be logged)
DO $$
DECLARE
    fk_constraint_name TEXT;
BEGIN
    SELECT tc.constraint_name INTO fk_constraint_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu 
        ON tc.constraint_name = kcu.constraint_name
    WHERE tc.table_name = 'inventory_logs'
        AND tc.constraint_type = 'FOREIGN KEY'
        AND kcu.column_name = 'product_id';
    
    IF fk_constraint_name IS NOT NULL THEN
        EXECUTE format('ALTER TABLE inventory_logs DROP CONSTRAINT %I', fk_constraint_name);
        RAISE NOTICE 'Dropped foreign key constraint: %', fk_constraint_name;
    END IF;
END $$;

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_inventory_logs_product_id ON inventory_logs(product_id);
CREATE INDEX IF NOT EXISTS idx_inventory_logs_item_type ON inventory_logs(item_type);
CREATE INDEX IF NOT EXISTS idx_inventory_logs_order_id ON inventory_logs(order_id);
CREATE INDEX IF NOT EXISTS idx_inventory_logs_created_at ON inventory_logs(created_at DESC);

-- Create function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS update_inventory_logs_updated_at ON inventory_logs;
CREATE TRIGGER update_inventory_logs_updated_at
    BEFORE UPDATE ON inventory_logs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Add comments for documentation
COMMENT ON TABLE inventory_logs IS 'Audit trail for all inventory changes (products and patches)';
COMMENT ON COLUMN inventory_logs.product_id IS 'ID of the product or patch (depending on item_type)';
COMMENT ON COLUMN inventory_logs.item_type IS 'Type of item: product or patch';
COMMENT ON COLUMN inventory_logs.change_amount IS 'Positive for restock, negative for deduction';
COMMENT ON COLUMN inventory_logs.order_id IS 'Associated order ID if change is order-related';

-- Update existing logs to set item_type based on whether product_id exists in products or patches table
UPDATE inventory_logs 
SET item_type = 'patch' 
WHERE product_id IN (SELECT id FROM patches);

UPDATE inventory_logs 
SET item_type = 'product' 
WHERE product_id IN (SELECT id FROM products);
