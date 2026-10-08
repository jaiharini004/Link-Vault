from flask import Blueprint, request, jsonify
from app.services.category_service import CategoryService

category_bp = Blueprint("category_bp", __name__)


@category_bp.route("", methods=["GET"])
def get_categories():
    """
    GET /api/categories
    Fetch all categories with their associated links count.
    """
    categories = CategoryService.get_all_categories()
    return jsonify({
        "success": True,
        "count": len(categories),
        "data": [category.to_dict(include_links_count=True) for category in categories]
    }), 200


@category_bp.route("/<int:category_id>", methods=["GET"])
def get_category(category_id: int):
    """
    GET /api/categories/<id>
    Fetch a single category by ID.
    """
    category = CategoryService.get_category_by_id(category_id)
    if not category:
        return jsonify({
            "success": False,
            "error": "Category not found"
        }), 404

    return jsonify({
        "success": True,
        "data": category.to_dict(include_links_count=True)
    }), 200


@category_bp.route("", methods=["POST"])
def create_category():
    """
    POST /api/categories
    Create a new category.
    Payload: { "name": "Work", "color": "#1E3A8A", "icon": "briefcase", "description": "..." }
    """
    data = request.get_json(silent=True)
    if not data:
        return jsonify({
            "success": False,
            "error": "Invalid JSON request body"
        }), 400

    category, error = CategoryService.create_category(data)
    if error:
        status_code = 409 if "already exists" in error else 400
        return jsonify({
            "success": False,
            "error": error
        }), status_code

    return jsonify({
        "success": True,
        "message": "Category created successfully",
        "data": category.to_dict(include_links_count=True)
    }), 201


@category_bp.route("/<int:category_id>", methods=["PUT"])
def update_category(category_id: int):
    """
    PUT /api/categories/<id>
    Update an existing category.
    """
    data = request.get_json(silent=True)
    if not data:
        return jsonify({
            "success": False,
            "error": "Invalid JSON request body"
        }), 400

    category, error = CategoryService.update_category(category_id, data)
    if error:
        status_code = 404 if "not found" in error else 400
        return jsonify({
            "success": False,
            "error": error
        }), status_code

    return jsonify({
        "success": True,
        "message": "Category updated successfully",
        "data": category.to_dict(include_links_count=True)
    }), 200


@category_bp.route("/<int:category_id>", methods=["DELETE"])
def delete_category(category_id: int):
    """
    DELETE /api/categories/<id>
    Delete category by ID.
    """
    success, error = CategoryService.delete_category(category_id)
    if error:
        return jsonify({
            "success": False,
            "error": error
        }), 404

    return jsonify({
        "success": True,
        "message": "Category deleted successfully"
    }), 200
