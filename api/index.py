import sys
import os

# Make sure the 'backend' folder is in sys.path so we can import 'app'
current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(current_dir)
backend_dir = os.path.join(parent_dir, 'backend')
sys.path.insert(0, backend_dir)

from app import create_app
from run import check_and_create_db, run_migrations

# Create the Flask application instance for Vercel
app = create_app('production')

# Create the application context to initialize the database constraints
with app.app_context():
    check_and_create_db()
    run_migrations()
