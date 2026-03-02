#!/usr/bin/env python3
"""
Bulk Product Uploader with AI Background Removal
Uses rembg (AI-powered) for better background removal than basic trimming

Requirements:
  pip install rembg pillow supabase-py python-dotenv

Usage:
  1. Place images in: input/products/
     - product-name-front.png
     - product-name-back.png
  2. Run: python scripts/bulk-upload-python.py
"""

import os
import re
import uuid
from pathlib import Path
from PIL import Image
from supabase import create_client, Client
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Initialize Supabase
supabase: Client = create_client(
    os.getenv('VITE_SUPABASE_URL'),
    os.getenv('VITE_SUPABASE_ANON_KEY')
)

INPUT_DIR = Path('input/products')
OUTPUT_DIR = Path('output/processed')

def remove_background_rembg(input_path: Path, output_path: Path):
    """
    Remove background using rembg (AI-powered)
    Much better than basic white-trim for complex backgrounds
    """
    try:
        from rembg import remove
        
        # Open image
        with Image.open(input_path) as img:
            # Remove background
            output = remove(img)
            
            # Save as PNG (preserves transparency)
            output.save(output_path, 'PNG')
            
        print(f"✅ Background removed: {input_path.name}")
        
    except ImportError:
        print("⚠️  rembg not installed, falling back to Pillow method")
        remove_background_pillow(input_path, output_path)

def remove_background_pillow(input_path: Path, output_path: Path):
    """
    Fallback: Remove white background using Pillow
    Converts white pixels to transparent
    """
    with Image.open(input_path) as img:
        # Convert to RGBA if not already
        img = img.convert('RGBA')
        
        # Get image data
        data = img.getdata()
        
        # Create new data with white pixels made transparent
        new_data = []
        for item in data:
            r, g, b, a = item
            # If pixel is close to white (threshold 240), make transparent
            if r > 240 and g > 240 and b > 240:
                new_data.append((255, 255, 255, 0))  # Transparent
            else:
                new_data.append(item)
        
        img.putdata(new_data)
        img.save(output_path, 'PNG')
    
    print(f"✅ Background removed (Pillow): {input_path.name}")

def optimize_image(input_path: Path, output_path: Path, max_size: int = 800):
    """
    Optimize image for web:
    - Resize to max dimensions
    - Convert to WebP for smaller size
    """
    with Image.open(input_path) as img:
        # Convert to RGBA if needed
        if img.mode != 'RGBA':
            img = img.convert('RGBA')
        
        # Resize maintaining aspect ratio
        img.thumbnail((max_size, max_size), Image.Resampling.LANCZOS)
        
        # Save as WebP with transparency
        img.save(output_path, 'WEBP', quality=85, method=6)
    
    print(f"✅ Optimized: {input_path.name} -> {output_path.name}")

def upload_to_supabase(local_path: Path, product_id: str, image_type: str) -> str:
    """Upload image to Supabase Storage"""
    storage_path = f"products/{product_id}/{image_type}.webp"
    
    with open(local_path, 'rb') as f:
        supabase.storage.from_('assets').upload(
            storage_path,
            f,
            {'content-type': 'image/webp', 'cache-control': '3600'},
            file_options={'upsert': 'true'}
        )
    
    # Get public URL
    result = supabase.storage.from_('assets').get_public_url(storage_path)
    return result['publicURL']

def parse_product_files():
    """Parse input directory for product images"""
    if not INPUT_DIR.exists():
        print(f"❌ Input directory not found: {INPUT_DIR}")
        print("Please create: input/products/ and add your images")
        return []
    
    files = list(INPUT_DIR.glob('*'))
    products = {}
    
    pattern = re.compile(r'^(.+)-(front|back)\.(png|jpg|jpeg|webp)$', re.IGNORECASE)
    
    for file in files:
        match = pattern.match(file.name)
        if not match:
            continue
        
        product_name = match.group(1)
        image_type = match.group(2)
        
        if product_name not in products:
            # Convert filename to display name
            display_name = product_name.replace('-', ' ').title()
            products[product_name] = {
                'name': display_name,
                'base_price': 25.00,
                'width': 400,
                'height': 400,
                'inventory': 100,
                'front': None,
                'back': None
            }
        
        products[product_name][image_type] = file
    
    return products

def main():
    print("🚀 Starting Bulk Product Upload with AI Background Removal\n")
    
    # Ensure output directory exists
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    
    # Parse products
    products = parse_product_files()
    print(f"📦 Found {len(products)} products\n")
    
    if not products:
        print("No valid product images found.")
        print("Expected format: product-name-front.png, product-name-back.png")
        return
    
    for product_key, product in products.items():
        print(f"\n📝 Processing: {product['name']}")
        
        try:
            product_id = str(uuid.uuid4())
            front_url = ""
            back_url = ""
            
            # Process front image
            if product['front']:
                bg_removed = OUTPUT_DIR / f"{product_id}-front-nobg.png"
                optimized = OUTPUT_DIR / f"{product_id}-front.webp"
                
                remove_background_rembg(product['front'], bg_removed)
                optimize_image(bg_removed, optimized)
                front_url = upload_to_supabase(optimized, product_id, 'front')
                print(f"   🖼️  Front uploaded")
            
            # Process back image
            if product['back']:
                bg_removed = OUTPUT_DIR / f"{product_id}-back-nobg.png"
                optimized = OUTPUT_DIR / f"{product_id}-back.webp"
                
                remove_background_rembg(product['back'], bg_removed)
                optimize_image(bg_removed, optimized)
                back_url = upload_to_supabase(optimized, product_id, 'back')
                print(f"   🖼️  Back uploaded")
            
            # Insert to database
            supabase.table('products').insert({
                'id': product_id,
                'name': product['name'],
                'front_image_url': front_url,
                'back_image_url': back_url,
                'base_price': product['base_price'],
                'width': product['width'],
                'height': product['height'],
                'inventory': product['inventory'],
                'placement_zone': {
                    'x': 15,
                    'y': 25,
                    'width': 70,
                    'height': 60,
                    'type': 'rectangle'
                }
            }).execute()
            
            print(f"   ✅ Product created: {product_id}")
            
        except Exception as e:
            print(f"   ❌ Failed: {e}")
    
    print("\n✨ Bulk upload complete!")
    print("🔄 Run: npm run export-cms")
    print("🔄 Then: npm run build && npm run deploy")

if __name__ == '__main__':
    main()
