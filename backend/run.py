import os
from dotenv import load_dotenv

# Load .env from root directory
load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))

from app import create_app
from app.extensions import db
from app.models.category import Category
from app.models.link import Link

app = create_app()


def seed_default_data():
    """Seed initial categories and sample links if the database is newly initialized."""
    if Category.query.first() is None:
        print("[LinkVault] Initializing default categories...")
        default_categories = [
            Category(name="github", color="#1E3A8A", icon="github", description="GitHub Repositories"),
            Category(name="google-drive", color="#2563EB", icon="drive", description="Google Drive Documents"),
            Category(name="google-meet", color="#7C3AED", icon="meet", description="Google Meet Links"),
            Category(name="youtube", color="#DC2626", icon="youtube", description="YouTube Videos"),
            Category(name="linkedin", color="#059669", icon="linkedin", description="LinkedIn Profiles and Posts"),
            Category(name="others", color="#64748B", icon="folder", description="Other Links"),
        ]
        db.session.add_all(default_categories)
        db.session.commit()

        # Seed initial sample links for immediate team frontend testing
        dev_cat = Category.query.filter_by(name="github").first()
        doc_cat = Category.query.filter_by(name="google-drive").first()
        media_cat = Category.query.filter_by(name="youtube").first()

        sample_links = [
            Link(
                title="LinkVault GitHub Repository",
                url="https://github.com/linkvault/core",
                description="Central source code for the LinkVault web application",
                category_id=dev_cat.id if dev_cat else None,
                link_type="github",
                is_favorite=True,
                status="healthy",
                status_code=200,
                tags="github,repo,python,backend"
            ),
            Link(
                title="Flask SQLAlchemy Documentation",
                url="https://flask-sqlalchemy.palletsprojects.com/",
                description="Official documentation for SQLAlchemy ORM extension in Flask",
                category_id=doc_cat.id if doc_cat else None,
                link_type="other",
                is_favorite=False,
                status="healthy",
                status_code=200,
                tags="flask,orm,database,docs"
            ),
            Link(
                title="Python Flask Web Architecture Tutorial",
                url="https://youtube.com/watch?v=sample123",
                description="RESTful API design and project structure overview",
                category_id=media_cat.id if media_cat else None,
                link_type="youtube",
                is_favorite=True,
                status="healthy",
                status_code=200,
                tags="video,tutorial,flask"
            ),
        ]
        db.session.add_all(sample_links)
        db.session.commit()
        print("[LinkVault] Default seed data initialized successfully.")


with app.app_context():
    # Automatically ensure PostgreSQL tables exist on launch
    try:
        db.create_all()
        seed_default_data()
        print("Connected to Supabase PostgreSQL database successfully.")
    except Exception as e:
        print(f"[Warning] Supabase database connection error: {e}")
        print("Please ensure your Supabase project is active and DATABASE_URL in .env is correct.")

if __name__ == "__main__":
    port = int(os.getenv("PORT", 5000))
    debug = os.getenv("FLASK_ENV", "development") == "development"
    print(f"LinkVault API Server running at http://127.0.0.1:{port}")
    app.run(host="0.0.0.0", port=port, debug=debug)
