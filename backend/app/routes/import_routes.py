from flask import Blueprint, request, jsonify
from app.services.whatsapp_service import parse_whatsapp_chat
from app.models.link import Link
from app.models.category import Category
from app.extensions import db

import_bp = Blueprint('import_routes', __name__)

@import_bp.route('/api/import/whatsapp', methods=['POST'])
def import_whatsapp():
    """
    Accepts a multipart/form-data request containing a .txt file, parses it,
    and returns a staging table JSON payload with extracted links.
    """
    if 'file' not in request.files:
        return jsonify({"success": False, "message": "No file part in the request"}), 400
        
    file = request.files['file']
    if file.filename == '':
        return jsonify({"success": False, "message": "No selected file"}), 400
        
    if file and file.filename.endswith('.txt'):
        text_content = file.read().decode('utf-8', errors='ignore')
        
        parsed_result = parse_whatsapp_chat(text_content)
        
        ui_tokens = {
            "font_family": "'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, sans-serif",
            "header_color": "#1E3A8A",
            "accent_bg": "#F0F4FF",
            "border_color": "#CBD5E1",
            "text_muted": "#64748B",
            "text_body": "#334155"
        }
        
        return jsonify({
            "success": True,
            "total_extracted": parsed_result["total_extracted"],
            "platform_stats": parsed_result["platform_stats"],
            "staged_links": parsed_result["staged_links"],
            "ui_tokens": ui_tokens
        }), 200
        
    return jsonify({"success": False, "message": "Invalid file format, please upload a .txt file"}), 400


@import_bp.route('/api/import/confirm', methods=['POST'])
def import_confirm():
    """
    Accepts a JSON array of user-confirmed link records and batch creates Link model entries.
    """
    data = request.get_json()
    if not data or not isinstance(data, list):
        return jsonify({"success": False, "message": "Invalid payload, expected a JSON array"}), 400
        
    saved_count = 0
    
    for item in data:
        original_url = item.get("original_url")
        
        if not original_url:
            continue
            
        # Optional: create category if it doesn't exist
        category_name = item.get("category", "General")
        category = Category.query.filter_by(name=category_name).first()
        if not category:
            category = Category(name=category_name)
            db.session.add(category)
            db.session.flush() # To get the category id
            
        new_link = Link(
            url=original_url,
            title=item.get("title", "WhatsApp Link"),
            description=item.get("context", ""),
            category_id=category.id,
            link_type="other"
        )
        db.session.add(new_link)
        saved_count += 1
        
    db.session.commit()
    
    return jsonify({
        "success": True,
        "saved_count": saved_count,
        "message": f"Successfully imported {saved_count} links from WhatsApp export."
    }), 201
