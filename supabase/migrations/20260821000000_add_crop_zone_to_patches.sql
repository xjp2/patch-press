-- Patch picture zone: which part of the patch image customers see in the picker.
-- Falls back to content_zone when unset (same convention as products.crop_zone
-- falling back to placement_zone).
ALTER TABLE public.patches ADD COLUMN IF NOT EXISTS crop_zone jsonb;
