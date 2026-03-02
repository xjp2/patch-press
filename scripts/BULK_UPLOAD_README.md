# Bulk Product Upload Guide

This guide explains how to upload 100s of products with automatic background removal.

## 📁 Folder Structure

```
app/
├── input/
│   └── products/          # Put your raw images here
│       ├── product-1-front.png
│       ├── product-1-back.png
│       ├── product-2-front.png
│       └── product-2-back.png
├── output/
│   └── processed/         # Processed images (auto-created)
└── scripts/
    ├── bulk-upload-products.ts      # TypeScript/Node version
    ├── bulk-upload-python.py        # Python version (better quality)
    └── BULK_UPLOAD_README.md        # This file
```

## 🎯 Naming Convention

**IMPORTANT**: Name your files exactly like this:

```
product-name-front.png     # Front image
product-name-back.png      # Back image (optional)
```

Examples:
- `canvas-tote-front.png` + `canvas-tote-back.png`
- `blue-keychain-front.png` + `blue-keychain-back.png`
- `summer-edition-front.png` (back optional)

## 🚀 Option 1: Python Script (Recommended)

Uses **AI-powered background removal** (rembg) for best results.

### Setup

```bash
# Install Python dependencies
pip install rembg pillow supabase-py python-dotenv

# Or use conda
conda install -c conda-forge rembg pillow
pip install supabase-py python-dotenv
```

### Run

```bash
# 1. Put images in input/products/
# 2. Run the script
python scripts/bulk-upload-python.py
```

### Features
- ✅ AI background removal (removes white/any color background)
- ✅ Auto-resize to web-friendly sizes
- ✅ Convert to WebP (smaller file size)
- ✅ Upload to Supabase Storage
- ✅ Insert into products table with default placement zone

## 🚀 Option 2: TypeScript/Node Script

Uses Sharp.js (fast but basic background removal).

### Setup

```bash
# Install dependencies (already in package.json)
npm install sharp
```

### Run

```bash
# Compile and run
npx ts-node scripts/bulk-upload-products.ts
```

## 📊 Processing 500 Products

### Before Upload
```bash
# Check your images
ls input/products/ | wc -l    # Should show ~1000 files (500 products × 2 sides)
```

### After Upload
- Images processed and optimized
- Saved to Supabase Storage
- Products created in database

### Update Static CMS
```bash
# Export to static files
npm run export-cms

# Commit and deploy
git add public/cms/
git commit -m "Add 500 new products"
git push origin main

# Or click "Rebuild Site" in Admin Panel
```

## 🎨 Background Removal Quality

| Method | Quality | Speed | Best For |
|--------|---------|-------|----------|
| **Python + rembg** | ⭐⭐⭐ Excellent | Medium | Complex backgrounds, hair, edges |
| **TypeScript + Sharp** | ⭐⭐ Good | Fast | Clean white backgrounds |
| **Manual** | ⭐⭐⭐⭐⭐ Perfect | Slow | When precision matters |

### Tips for Best Results

1. **Use consistent lighting** when photographing products
2. **Clean white background** in original photos
3. **High resolution** originals (script will resize)
4. **Center the product** in the frame

## 💾 Storage Calculation

Uploading 500 products (1000 images):

| Format | Avg Size | Total | Supabase Free Tier |
|--------|----------|-------|-------------------|
| Original PNG | 2 MB | 2 GB | ❌ Exceeds limit |
| Optimized WebP | 300 KB | 300 MB | ✅ Perfect |

The scripts automatically optimize to WebP!

## 🔧 Customization

### Change Default Prices

Edit the script and modify:
```python
'base_price': 25.00,  # Change to your default price
```

### Change Default Inventory

```python
'inventory': 100,  # Change default stock level
```

### Change Image Size

```python
max_size = 800  # Change max dimension (pixels)
```

## ⚠️ Troubleshooting

### "rembg not found"
```bash
pip install rembg
# or
pip install rembg[cpu]  # CPU-only version (smaller)
```

### "Supabase connection failed"
- Check your `.env` file has `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
- Ensure you're in the `app/` directory

### Images not processing
- Ensure filenames follow the pattern: `name-front.png`, `name-back.png`
- Supported formats: PNG, JPG, JPEG, WEBP
- Check that `input/products/` folder exists

## 📈 Performance

Processing time for 500 products:
- **Python + rembg**: ~30-45 minutes (AI processing takes time)
- **TypeScript + Sharp**: ~5-10 minutes (faster but lower quality)

Run it once and let it work!

## 🎉 After Upload

1. Products are in Supabase database ✓
2. Images are in Supabase Storage ✓
3. Run `npm run export-cms` to update static files ✓
4. Click "Rebuild Site" or push to GitHub to deploy ✓

Your 500 products are now live! 🚀
