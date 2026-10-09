from flask import Blueprint, request, jsonify, g
from werkzeug.security import generate_password_hash, check_password_hash
import secrets
from app.extensions import db
from app.models.user import User

auth_bp = Blueprint('auth_routes', __name__)

@auth_bp.route('/api/auth/signup', methods=['POST'])
def signup():
    data = request.get_json()
    email = data.get('email')
    password = data.get('password')
    
    if not email or not password:
        return jsonify({"success": False, "message": "Email and password are required"}), 400
        
    existing_user = User.query.filter_by(email=email).first()
    if existing_user:
        return jsonify({"success": False, "message": "User already exists"}), 400
        
    session_token = secrets.token_hex(32)
    new_user = User(
        email=email,
        password_hash=generate_password_hash(password),
        session_token=session_token
    )
    db.session.add(new_user)
    db.session.commit()
    
    # Initialize default categories for this user
    from run import seed_default_data_for_user
    seed_default_data_for_user(new_user.id)
    
    return jsonify({
        "success": True, 
        "message": "Account created successfully",
        "token": session_token
    }), 201

@auth_bp.route('/api/auth/signin', methods=['POST'])
def signin():
    data = request.get_json()
    email = data.get('email')
    password = data.get('password')
    
    if not email or not password:
        return jsonify({"success": False, "message": "Email and password are required"}), 400
        
    user = User.query.filter_by(email=email).first()
    if not user or not check_password_hash(user.password_hash, password):
        return jsonify({"success": False, "message": "Invalid email or password"}), 401
        
    session_token = secrets.token_hex(32)
    user.session_token = session_token
    db.session.commit()
        
    return jsonify({
        "success": True, 
        "message": "Signed in successfully",
        "token": session_token
    }), 200

@auth_bp.route('/api/auth/signout', methods=['POST'])
def signout():
    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.startswith("Bearer "):
        token = auth_header.split(" ")[1]
        user = User.query.filter_by(session_token=token).first()
        if user:
            user.session_token = None
            db.session.commit()
            
    return jsonify({"success": True, "message": "Signed out successfully"}), 200

@auth_bp.route('/api/auth/me', methods=['GET'])
def get_me():
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        return jsonify({"authenticated": False}), 401
        
    token = auth_header.split(" ")[1]
    user = User.query.filter_by(session_token=token).first()
    if not user:
        return jsonify({"authenticated": False}), 401
        
    return jsonify({
        "authenticated": True,
        "user": {
            "id": user.id,
            "username": user.email.split('@')[0],
            "email": user.email
        }
    }), 200

