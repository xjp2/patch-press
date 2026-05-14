-- Migration: Add quantity columns to products and patches tables
-- Created: 2024-03-20
-- Purpose: Track inventory quantities for products and patches

-- Add quantity column to products table
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS quantity INTEGER DEFAULT 0;

-- Add quantity column to patches table
ALTER TABLE patches 
ADD COLUMN IF NOT EXISTS quantity INTEGER DEFAULT 0;

-- Create index for efficient inventory queries
CREATE INDEX IF NOT EXISTS idx_products_quantity ON products(quantity);
CREATE INDEX IF NOT EXISTS idx_patches_quantity ON patches(quantity);

-- Add comments for documentation
COMMENT ON COLUMN products.quantity IS 'Current stock quantity available for purchase';
COMMENT ON COLUMN patches.quantity IS 'Current stock quantity available for use on products';

-- Set default quantities for existing records
UPDATE products SET quantity = 10 WHERE quantity IS NULL OR quantity = 0;
UPDATE patches SET quantity = 50 WHERE quantity IS NULL OR quantity = 0;
