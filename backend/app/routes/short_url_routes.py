from flask import Blueprint, request, jsonify, redirect
from app.models.link import Link
from app.models.short_url import ShortURL
from app.services.short_url_service import create_short_url, record_click_event, get_short_url_response_ui_tokens

short_url_bp = Blueprint("short_url", __name__)

@short_url_bp.route('/api/links/<int:link_id>/shorten', methods=['POST'])
def shorten_link(link_id):
    """
    Exposes the endpoint to generate or retrieve a short URL for any saved link.
    """
    data = request.get_json() or {}
    custom_alias = data.get('custom_alias')
    
    link = Link.query.get(link_id)
    if not link:
        return jsonify({
            "status": "error",
            "message": "Link not found.",
            "ui_tokens": get_short_url_response_ui_tokens(False)
        }), 404

    try:
        short_entry = create_short_url(link_id, custom_alias)
        return jsonify({
            "status": "success",
            "short_code": short_entry.short_code,
            "short_url": f"{request.host_url}r/{short_entry.short_code}",
            "original_url": link.url,
            "clicks_count": short_entry.clicks_count,
            "ui_tokens": get_short_url_response_ui_tokens(True)
        }), 201
    except ValueError as e:
        return jsonify({
            "status": "error",
            "message": str(e),
            "ui_tokens": get_short_url_response_ui_tokens(False)
        }), 400

@short_url_bp.route('/r/<short_code>', methods=['GET'])
def redirect_short_url(short_code):
    """
    Looks up short codes or custom aliases, atomically increments click counters,
    and issues an HTTP 302 temporary redirect to the destination URL.
    """
    short_entry = ShortURL.query.filter(
        (ShortURL.short_code == short_code) | (ShortURL.custom_alias == short_code)
    ).first()

    if not short_entry or not short_entry.link:
        return jsonify({
            "status": "error",
            "message": "Short URL not found.",
            "ui_tokens": {
                "font_family": "'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, sans-serif",
                "text_color": "#1E293B",
                "badge_bg": "#FEE2E2",
                "badge_text": "#B91C1C"
            }
        }), 404
        
    record_click_event(short_entry.id)
    return redirect(short_entry.link.url, code=302)

@short_url_bp.route('/api/links/<int:link_id>/analytics', methods=['GET'])
def get_link_analytics(link_id):
    """
    Expose a lightweight endpoint to retrieve click statistics.
    """
    short_entry = ShortURL.query.filter_by(link_id=link_id).first()
    
    if not short_entry:
        return jsonify({
            "status": "error",
            "message": "Analytics not found for this link.",
        }), 404
        
    return jsonify({
        "link_id": link_id,
        "short_code": short_entry.short_code,
        "short_url": f"{request.host_url}r/{short_entry.short_code}",
        "total_clicks": short_entry.clicks_count,
        "created_at": short_entry.created_at.isoformat() + "Z" if short_entry.created_at else None,
        "ui_tokens": {
            "font_family": "Segoe UI",
            "metric_color": "#2563EB"
        }
    }), 200
