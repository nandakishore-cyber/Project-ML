"""
seed_data.py — Populate the database with sample products and user accounts.

Run AFTER the backend has started at least once (so tables exist):
    cd backend
    python seed_data.py

Creates:
  - 1 admin user   (admin@dynprice.com / admin123)
  - 1 regular user  (user@dynprice.com / user123)
  - 12 sample products across 6 categories with category specs
"""

import os
import sys

# Add backend directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from database import SessionLocal, engine, Base
from models.user import User
from models.product import Product
from models.category_specs.mobile import Mobile
from models.category_specs.laptop import Laptop
from models.category_specs.television import Television
from models.category_specs.earphones import Earphones
from models.category_specs.smartwatch import Smartwatch
from models.category_specs.camera import Camera

import bcrypt


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def seed():
    db = SessionLocal()

    try:
        # ── Check if already seeded ──────────────────────────────────────
        if db.query(User).first():
            print("⚠️  Database already has data. Skipping seed.")
            print("   To re-seed, drop all tables first or delete existing rows.")
            return

        print("🌱 Seeding database...")

        # ── Users ────────────────────────────────────────────────────────
        admin = User(
            name="Admin",
            email="admin@dynprice.com",
            password_hash=hash_password("admin123"),
            is_admin=True,
        )
        customer = User(
            name="Test User",
            email="user@dynprice.com",
            password_hash=hash_password("user123"),
            is_admin=False,
        )
        db.add_all([admin, customer])
        db.flush()
        print(f"   ✅ Created admin user: admin@dynprice.com / admin123")
        print(f"   ✅ Created regular user: user@dynprice.com / user123")

        # ── Products ─────────────────────────────────────────────────────
        products_data = [
            # ── Mobile Phones ──
            {
                "product": {
                    "name": "iPhone 15 Pro Max",
                    "category": "Mobile Phone",
                    "sub_category": "Premium",
                    "base_price": 159900,
                    "current_price": 157999,
                    "competitor_price": 155000,
                    "demand": 92,
                    "stock": 45,
                    "rating": 4.7,
                    "reviews": 2340,
                    "discount": 2.0,
                    "season": "Normal",
                    "image_url": "https://store.storeimages.cdn-apple.com/4668/as-images.apple.com/is/iphone-15-pro-max-natural-titanium?wid=400",
                },
                "spec_model": Mobile,
                "spec": {
                    "brand": "Apple",
                    "screen_size": "6.7 inch",
                    "battery_mah": 4441,
                    "ram_gb": 8,
                    "storage_gb": 256,
                },
            },
            {
                "product": {
                    "name": "Samsung Galaxy A15",
                    "category": "Mobile Phone",
                    "sub_category": "Budget",
                    "base_price": 13999,
                    "current_price": 12499,
                    "competitor_price": 13500,
                    "demand": 78,
                    "stock": 200,
                    "rating": 4.1,
                    "reviews": 890,
                    "discount": 10.0,
                    "season": "Normal",
                    "image_url": "https://images.samsung.com/is/image/samsung/p6pim/in/galaxy-a15/gallery/in-galaxy-a15-sm-a155-489522-sm-a155fzkdins-thumb-539291228",
                },
                "spec_model": Mobile,
                "spec": {
                    "brand": "Samsung",
                    "screen_size": "6.5 inch",
                    "battery_mah": 5000,
                    "ram_gb": 6,
                    "storage_gb": 128,
                },
            },
            # ── Laptops ──
            {
                "product": {
                    "name": "MacBook Air M3",
                    "category": "Laptop",
                    "sub_category": "Premium",
                    "base_price": 114900,
                    "current_price": 112999,
                    "competitor_price": 113000,
                    "demand": 85,
                    "stock": 30,
                    "rating": 4.8,
                    "reviews": 1560,
                    "discount": 1.5,
                    "season": "Normal",
                    "image_url": "https://store.storeimages.cdn-apple.com/4668/as-images.apple.com/is/mba13-midnight-select-202402?wid=400",
                },
                "spec_model": Laptop,
                "spec": {
                    "brand": "Apple",
                    "processor": "Apple M3",
                    "ram_gb": 8,
                    "storage_gb": 256,
                    "screen_size": "13.6 inch",
                },
            },
            {
                "product": {
                    "name": "HP Pavilion 15",
                    "category": "Laptop",
                    "sub_category": "Mid",
                    "base_price": 55990,
                    "current_price": 52999,
                    "competitor_price": 54000,
                    "demand": 65,
                    "stock": 85,
                    "rating": 4.2,
                    "reviews": 720,
                    "discount": 5.0,
                    "season": "Normal",
                    "image_url": "https://in-media.apjonlinecdn.com/catalog/product/cache/b3b166914d87ce343d4dc5ec5117b502/c/0/c08a26742_1_1.png",
                },
                "spec_model": Laptop,
                "spec": {
                    "brand": "HP",
                    "processor": "Intel i5-1335U",
                    "ram_gb": 16,
                    "storage_gb": 512,
                    "screen_size": "15.6 inch",
                },
            },
            # ── Televisions ──
            {
                "product": {
                    "name": "Sony Bravia 55\" 4K OLED",
                    "category": "Television",
                    "sub_category": "Premium",
                    "base_price": 79990,
                    "current_price": 76999,
                    "competitor_price": 78000,
                    "demand": 55,
                    "stock": 20,
                    "rating": 4.6,
                    "reviews": 430,
                    "discount": 3.0,
                    "season": "Normal",
                    "image_url": "https://www.sony.co.in/image/5d02da5df552836db894cead8a68f5f3?fmt=pjpeg&wid=400",
                },
                "spec_model": Television,
                "spec": {
                    "brand": "Sony",
                    "screen_size": "55 inch",
                    "resolution": "4K UHD",
                    "display_type": "OLED",
                    "smart_tv": True,
                },
            },
            {
                "product": {
                    "name": "Mi TV 32\" HD Ready",
                    "category": "Television",
                    "sub_category": "Budget",
                    "base_price": 12999,
                    "current_price": 11499,
                    "competitor_price": 12500,
                    "demand": 88,
                    "stock": 150,
                    "rating": 4.0,
                    "reviews": 2100,
                    "discount": 12.0,
                    "season": "Festive",
                    "image_url": "https://i01.appmifile.com/v1/MI_18455B3E4DA706226CF7535A58E875F0267/pms_1632388567.52498489.png?width=400",
                },
                "spec_model": Television,
                "spec": {
                    "brand": "Xiaomi",
                    "screen_size": "32 inch",
                    "resolution": "HD Ready",
                    "display_type": "LED",
                    "smart_tv": True,
                },
            },
            # ── Earphones ──
            {
                "product": {
                    "name": "Sony WH-1000XM5",
                    "category": "Earphones",
                    "sub_category": "Premium",
                    "base_price": 29990,
                    "current_price": 27999,
                    "competitor_price": 28500,
                    "demand": 70,
                    "stock": 60,
                    "rating": 4.7,
                    "reviews": 3200,
                    "discount": 5.0,
                    "season": "Normal",
                    "image_url": "https://www.sony.co.in/image/bc79a74ac8b4cbe9d8e985ee44fc7fb5?fmt=pjpeg&wid=400",
                },
                "spec_model": Earphones,
                "spec": {
                    "brand": "Sony",
                    "earphone_type": "Over-ear",
                    "wireless": True,
                    "noise_cancellation": True,
                },
            },
            {
                "product": {
                    "name": "boAt Rockerz 450",
                    "category": "Earphones",
                    "sub_category": "Budget",
                    "base_price": 1499,
                    "current_price": 999,
                    "competitor_price": 1200,
                    "demand": 95,
                    "stock": 500,
                    "rating": 3.9,
                    "reviews": 15000,
                    "discount": 30.0,
                    "season": "Normal",
                    "image_url": "https://www.boat-lifestyle.com/cdn/shop/products/rockerz-450-bluetooth-headphone-boat-5_400x.png",
                },
                "spec_model": Earphones,
                "spec": {
                    "brand": "boAt",
                    "earphone_type": "On-ear",
                    "wireless": True,
                    "noise_cancellation": False,
                },
            },
            # ── Smartwatches ──
            {
                "product": {
                    "name": "Apple Watch Series 9",
                    "category": "Smartwatch",
                    "sub_category": "Premium",
                    "base_price": 41900,
                    "current_price": 39999,
                    "competitor_price": 40500,
                    "demand": 60,
                    "stock": 35,
                    "rating": 4.5,
                    "reviews": 980,
                    "discount": 4.0,
                    "season": "Normal",
                    "image_url": "https://store.storeimages.cdn-apple.com/4668/as-images.apple.com/is/watch-s9?wid=400",
                },
                "spec_model": Smartwatch,
                "spec": {
                    "brand": "Apple",
                    "display_type": "OLED Retina",
                    "water_resistant": True,
                    "gps": True,
                },
            },
            {
                "product": {
                    "name": "Noise ColorFit Pro 5",
                    "category": "Smartwatch",
                    "sub_category": "Budget",
                    "base_price": 2999,
                    "current_price": 2499,
                    "competitor_price": 2800,
                    "demand": 82,
                    "stock": 300,
                    "rating": 4.0,
                    "reviews": 5400,
                    "discount": 15.0,
                    "season": "Festive",
                    "image_url": "https://www.gonoise.com/cdn/shop/products/colorfit-pro-5-smartwatch-noise-1_400x.png",
                },
                "spec_model": Smartwatch,
                "spec": {
                    "brand": "Noise",
                    "display_type": "AMOLED",
                    "water_resistant": True,
                    "gps": False,
                },
            },
            # ── Cameras ──
            {
                "product": {
                    "name": "Canon EOS R50",
                    "category": "Camera",
                    "sub_category": "Premium",
                    "base_price": 75990,
                    "current_price": 72999,
                    "competitor_price": 74000,
                    "demand": 40,
                    "stock": 15,
                    "rating": 4.6,
                    "reviews": 310,
                    "discount": 3.5,
                    "season": "Normal",
                    "image_url": "https://in.canon/media/image/2023/02/02/96461a3d0dfe4fe6b8b77b27e9e28580_EOS-R50-BK-Front.png",
                },
                "spec_model": Camera,
                "spec": {
                    "brand": "Canon",
                    "megapixels": 24.2,
                    "sensor_type": "APS-C CMOS",
                    "video_resolution": "4K 30fps",
                },
            },
            {
                "product": {
                    "name": "GoPro Hero 12 Black",
                    "category": "Camera",
                    "sub_category": "Mid",
                    "base_price": 40490,
                    "current_price": 38999,
                    "competitor_price": 39500,
                    "demand": 58,
                    "stock": 40,
                    "rating": 4.4,
                    "reviews": 870,
                    "discount": 4.0,
                    "season": "Normal",
                    "image_url": "https://gopro.com/content/dam/help/hero12-black/HERO12-Black-Camera-Front.png",
                },
                "spec_model": Camera,
                "spec": {
                    "brand": "GoPro",
                    "megapixels": 27.0,
                    "sensor_type": "1/1.9 inch CMOS",
                    "video_resolution": "5.3K 60fps",
                },
            },
        ]

        for item in products_data:
            product = Product(**item["product"])
            db.add(product)
            db.flush()  # get product.id

            spec = item["spec_model"](product_id=product.id, **item["spec"])
            db.add(spec)
            print(f"   ✅ Added: {item['product']['name']} ({item['product']['category']} - {item['product']['sub_category']}) — ₹{item['product']['current_price']:,}")

        db.commit()
        print(f"\n🎉 Done! Seeded {len(products_data)} products and 2 users.")
        print(f"\n📋 Login Credentials:")
        print(f"   Admin:    admin@dynprice.com / admin123")
        print(f"   Customer: user@dynprice.com  / user123")

    except Exception as e:
        db.rollback()
        print(f"\n❌ Error seeding data: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed()
