import os
from flask import Flask, jsonify, render_template
from config import config_by_name
from app.extensions import db, cors, migrate
from app.routes.category_routes import category_bp
from app.routes.link_routes import link_bp


def create_app(config_name: str = None) -> Flask:
    """
    Application Factory Pattern for LinkVault.
    Initializes Flask application, database ORM, CORS, migrations, and blueprints.
    """
    base_dir = os.path.abspath(os.path.dirname(__file__))
    frontend_dir = os.path.abspath(os.path.join(base_dir, '..', '..', 'frontend'))
    
    app = Flask(__name__, 
                static_folder=os.path.join(frontend_dir, 'static'),
                template_folder=os.path.join(frontend_dir, 'templates'))

    # Determine configuration environment
    env = config_name or os.getenv("FLASK_ENV", "development")
    app.config.from_object(config_by_name.get(env, config_by_name["default"]))

    # Initialize extensions
    db.init_app(app)
    cors.init_app(app, resources={r"/api/*": {"origins": app.config.get("CORS_ORIGINS", "*")}})
    migrate.init_app(app, db)

    # Register Core REST Blueprints (Vijay's Domain)
    app.register_blueprint(category_bp, url_prefix="/api/categories")
    app.register_blueprint(link_bp, url_prefix="/api/links")

    # Dynamic Hook for Jaiharini's Short URL and Search Blueprints (if present)
    try:
        from app.routes.short_url_routes import short_url_bp  # type: ignore
        app.register_blueprint(short_url_bp)
    except (ImportError, AttributeError):
        pass

    try:
        from app.routes.auth_routes import auth_bp
        app.register_blueprint(auth_bp)
    except (ImportError, AttributeError):
        pass

    try:
        from app.routes.import_routes import import_bp
        app.register_blueprint(import_bp)
    except (ImportError, AttributeError):
        pass

    try:
        from app.routes.inbox_routes import inbox_bp
        app.register_blueprint(inbox_bp, url_prefix="/api/inbox")
    except (ImportError, AttributeError):
        pass

    # Frontend Dashboard route
    @app.route("/")
    def index():
        return render_template("index.html")

    @app.route("/favorites")
    def favorites_page():
        return render_template("index.html", initial_view="favorites")

    @app.route("/recent")
    def recent_page():
        return render_template("index.html", initial_view="recent")

    @app.route("/github")
    def github_page():
        return render_template("index.html", initial_category="github")
        
    @app.route("/google-drive")
    def google_drive_page():
        return render_template("index.html", initial_category="google-drive")
        
    @app.route("/google-meet")
    def google_meet_page():
        return render_template("index.html", initial_category="google-meet")
        
    @app.route("/youtube")
    def youtube_page():
        return render_template("index.html", initial_category="youtube")
        
    @app.route("/linkedin")
    def linkedin_page():
        return render_template("index.html", initial_category="linkedin")
        
    @app.route("/others")
    def others_page():
        return render_template("index.html", initial_category="others")

    @app.route("/profile")
    def profile_page():
        return render_template("profile.html")

    # Root Health Check route
    @app.route("/api/health", methods=["GET"])
    def health_check():
        return jsonify({
            "status": "online",
            "service": "LinkVault Backend API",
            "environment": env,
            "version": "1.0.0"
        }), 200

    # Global JSON error handlers
    @app.errorhandler(404)
    def not_found(error):
        return jsonify({
            "success": False,
            "error": "Resource not found"
        }), 404

    @app.errorhandler(400)
    def bad_request(error):
        return jsonify({
            "success": False,
            "error": "Bad request"
        }), 400

    @app.errorhandler(500)
    def internal_error(error):
        db.session.rollback()
        return jsonify({
            "success": False,
            "error": "Internal server error"
        }), 500

    return app
