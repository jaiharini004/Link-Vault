import os
from dotenv import load_dotenv

# Load .env from root directory
load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))

from app import create_app
from app.extensions import db
from app.models.category import Category
from app.models.link import Link
from app.models.user import User

app = create_app()

def seed_default_data_for_user(user_id):
    """Seed initial categories and sample links for a specific newly registered user."""
    # Check if this user already has categories
    if Category.query.filter_by(user_id=user_id).first() is not None:
        return

    print(f"[LinkVault] Initializing default categories for user {user_id}...")
    default_categories = [
        Category(name="github", color="#1E3A8A", icon="github", description="GitHub Repositories", user_id=user_id),
        Category(name="google-drive", color="#2563EB", icon="drive", description="Google Drive Documents", user_id=user_id),
        Category(name="google-meet", color="#7C3AED", icon="meet", description="Google Meet Links", user_id=user_id),
        Category(name="youtube", color="#DC2626", icon="youtube", description="YouTube Videos", user_id=user_id),
        Category(name="linkedin", color="#059669", icon="linkedin", description="LinkedIn Profiles and Posts", user_id=user_id),
        Category(name="others", color="#64748B", icon="folder", description="Other Links", user_id=user_id),
    ]
    db.session.add_all(default_categories)
    db.session.commit()

with app.app_context():
    # Automatically ensure PostgreSQL tables exist on launch
    try:
        db.create_all()
        
        # Safely add the new last_checked_at column if it doesn't exist
        from sqlalchemy import text
        try:
            db.session.execute(text("ALTER TABLE links ADD COLUMN last_checked_at TIMESTAMP"))
            db.session.commit()
        except Exception:
            db.session.rollback() # Column already exists
            
        # Migration: Add user_id to existing categories and links
        try:
            db.session.execute(text("ALTER TABLE categories ADD COLUMN user_id INTEGER"))
            db.session.commit()
            print("[LinkVault] Added user_id column to categories table.")
        except Exception:
            db.session.rollback()

        try:
            db.session.execute(text("ALTER TABLE links ADD COLUMN user_id INTEGER"))
            db.session.commit()
            print("[LinkVault] Added user_id column to links table.")
        except Exception:
            db.session.rollback()

        # If there are orphan categories or links, assign them to the first user (if exists)
        first_user = User.query.first()
        if first_user:
            db.session.execute(text(f"UPDATE categories SET user_id = {first_user.id} WHERE user_id IS NULL"))
            db.session.execute(text(f"UPDATE links SET user_id = {first_user.id} WHERE user_id IS NULL"))
            db.session.commit()
            
        print("Connected to Supabase PostgreSQL database successfully.")
    except Exception as e:
        print(f"[Warning] Supabase database connection error: {e}")
        print("Please ensure your Supabase project is active and DATABASE_URL in .env is correct.")

if __name__ == "__main__":
    port = int(os.getenv("PORT", 5000))
    debug = os.getenv("FLASK_ENV", "development") == "development"
    print(f"LinkVault API Server running at http://127.0.0.1:{port}")
    app.run(host="0.0.0.0", port=port, debug=debug)
