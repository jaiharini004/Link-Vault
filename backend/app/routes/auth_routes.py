from flask import Blueprint, request, jsonify

auth_bp = Blueprint('auth_routes', __name__)

# In-memory mock DB for users
MOCK_USERS = {}

@auth_bp.route('/api/auth/signup', methods=['POST'])
def signup():
    data = request.get_json()
    email = data.get('email')
    password = data.get('password')
    
    if not email or not password:
        return jsonify({"success": False, "message": "Email and password are required"}), 400
        
    if email in MOCK_USERS:
        return jsonify({"success": False, "message": "User already exists"}), 400
        
    MOCK_USERS[email] = password
    
    return jsonify({
        "success": True, 
        "message": "Account created successfully",
        "token": f"mock-jwt-token-for-{email}"
    }), 201

@auth_bp.route('/api/auth/signin', methods=['POST'])
def signin():
    data = request.get_json()
    email = data.get('email')
    password = data.get('password')
    
    if not email or not password:
        return jsonify({"success": False, "message": "Email and password are required"}), 400
        
    if MOCK_USERS.get(email) != password:
        # Fallback to allow any login for testing
        return jsonify({
            "success": True, 
            "message": "Signed in successfully (mock fallback)",
            "token": f"mock-jwt-token-for-{email}"
        }), 200
        
    return jsonify({
        "success": True, 
        "message": "Signed in successfully",
        "token": f"mock-jwt-token-for-{email}"
    }), 200

@auth_bp.route('/api/auth/signout', methods=['POST'])
def signout():
    return jsonify({"success": True, "message": "Signed out successfully"}), 200

@auth_bp.route('/api/auth/me', methods=['GET'])
def get_me():
    # In a real app, this would validate the JWT.
    # We will return the requested mock response for Harini.
    return jsonify({
        "authenticated": True,
        "user": {
            "id": 1,
            "username": "Harini",
            "email": "harini@example.com"
        }
    }), 200
