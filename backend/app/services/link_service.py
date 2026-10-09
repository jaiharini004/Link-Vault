from typing import List, Optional, Tuple, Dict, Any
from urllib.parse import urlparse
from app.extensions import db
from app.models.link import Link
from app.models.category import Category
import hashlib

def normalize_url(raw_url: str) -> Tuple[str, str]:
    """
    Normalizes a URL by stripping tracking parameters and fragments,
    and returning the normalized URL along with its SHA-256 hash.
    """
    parsed = urlparse(raw_url)
    # Rebuild URL without query and fragment to strip tracking
    normalized_url = f"{parsed.scheme}://{parsed.netloc}{parsed.path}"
    norm_hash = hashlib.sha256(normalized_url.encode('utf-8')).hexdigest()
    return normalized_url, norm_hash

def detect_link_type_fallback(url: str) -> str:
    """
    Automatic link type detector for common platforms.
    Can be used directly or interfaced with Jaiharini's intelligence module.
    """
    domain = urlparse(url).netloc.lower()
    if "github.com" in domain:
        return "github"
    elif "drive.google.com" in domain or "docs.google.com" in domain:
        return "drive"
    elif "meet.google.com" in domain:
        return "meet"
    elif "youtube.com" in domain or "youtu.be" in domain:
        return "youtube"
    elif "linkedin.com" in domain:
        return "linkedin"
    elif "notion.so" in domain or "notion.site" in domain:
        return "notion"
    elif "figma.com" in domain:
        return "figma"
    return "other"


class LinkService:
    @staticmethod
    def get_links(
        category_id: Optional[int] = None,
        is_favorite: Optional[bool] = None,
        link_type: Optional[str] = None,
        sort: str = "latest"
    ) -> List[Link]:
        """Fetch links with optional filtering and sorting."""
        query = Link.query

        if category_id is not None:
            query = query.filter(Link.category_id == category_id)

        if is_favorite is not None:
            query = query.filter(Link.is_favorite == is_favorite)

        if link_type:
            query = query.filter(Link.link_type == link_type.strip().lower())

        if sort == "oldest":
            query = query.order_by(Link.created_at.asc())
        elif sort == "title":
            query = query.order_by(Link.title.asc())
        else:  # default "latest"
            query = query.order_by(Link.created_at.desc())

        return query.all()

    @staticmethod
    def get_link_by_id(link_id: int) -> Optional[Link]:
        """Fetch single link by primary key."""
        return db.session.get(Link, link_id)

    @staticmethod
    def create_link(data: Dict[str, Any]) -> Tuple[Optional[Link], Optional[str]]:
        """
        Create a new link with validation and auto-type detection.
        Returns: (Link, None) or (None, error_message).
        """
        raw_url = data.get("url", "").strip()
        if not raw_url:
            return None, "URL is required."

        # Add default scheme if missing
        if not (raw_url.startswith("http://") or raw_url.startswith("https://")):
            raw_url = "https://" + raw_url

        title = data.get("title", "").strip()
        if not title:
            # Fallback title to domain or cleaned URL
            parsed = urlparse(raw_url)
            title = parsed.netloc or raw_url

        # Validate category if provided
        category_id = data.get("category_id")
        if category_id in ["", " "]:
            category_id = None
        
        if category_id:
            try:
                category_id = int(category_id)
                category = db.session.get(Category, category_id)
            except ValueError:
                category = Category.query.filter(Category.name.ilike(str(category_id))).first()
                if category:
                    category_id = category.id
                
            if not category:
                return None, f"Invalid category ID or name: {category_id}"

        # Link type detection
        link_type = data.get("link_type")
        if not link_type or link_type.strip().lower() == "auto":
            link_type = detect_link_type_fallback(raw_url)
        else:
            link_type = link_type.strip().lower()

        # Handle tags (supports list or comma-separated string)
        raw_tags = data.get("tags", "")
        if isinstance(raw_tags, list):
            tags = ",".join(str(t).strip() for t in raw_tags if str(t).strip())
        else:
            tags = str(raw_tags).strip()

        link = Link(
            title=title,
            url=raw_url,
            description=data.get("description", "").strip(),
            category_id=category_id,
            link_type=link_type,
            is_favorite=bool(data.get("is_favorite", False)),
            status=data.get("status", "healthy"),
            status_code=data.get("status_code", 200),
            tags=tags
        )

        db.session.add(link)
        db.session.commit()
        return link, None

    @staticmethod
    def update_link(link_id: int, data: Dict[str, Any]) -> Tuple[Optional[Link], Optional[str]]:
        """Update an existing link entity."""
        link = LinkService.get_link_by_id(link_id)
        if not link:
            return None, "Link not found."

        if "url" in data:
            raw_url = data["url"].strip()
            if not raw_url:
                return None, "URL cannot be empty."
            if not (raw_url.startswith("http://") or raw_url.startswith("https://")):
                raw_url = "https://" + raw_url
            link.url = raw_url

        if "title" in data:
            new_title = data["title"].strip()
            if not new_title:
                return None, "Title cannot be empty."
            link.title = new_title

        if "description" in data:
            link.description = data["description"].strip()

        if "category_id" in data:
            category_id = data["category_id"]
            if category_id in ["", " "]:
                category_id = None
            
            if category_id is not None:
                try:
                    category_id = int(category_id)
                    category = db.session.get(Category, category_id)
                except ValueError:
                    category = Category.query.filter(Category.name.ilike(str(category_id))).first()
                    if category:
                        category_id = category.id

                if not category:
                    return None, f"Invalid category ID or name: {category_id}"
            link.category_id = category_id

        if "link_type" in data:
            link.link_type = data["link_type"].strip().lower()

        if "is_favorite" in data:
            link.is_favorite = bool(data["is_favorite"])

        if "status" in data:
            link.status = data["status"]

        if "status_code" in data:
            link.status_code = data["status_code"]

        if "tags" in data:
            raw_tags = data["tags"]
            if isinstance(raw_tags, list):
                link.tags = ",".join(str(t).strip() for t in raw_tags if str(t).strip())
            else:
                link.tags = str(raw_tags).strip()

        db.session.commit()
        return link, None

    @staticmethod
    def delete_link(link_id: int) -> Tuple[bool, Optional[str]]:
        """Delete link by ID."""
        link = LinkService.get_link_by_id(link_id)
        if not link:
            return False, "Link not found."

        db.session.delete(link)
        db.session.commit()
        return True, None

    @staticmethod
    def toggle_favorite(link_id: int) -> Tuple[Optional[Link], Optional[str]]:
        """Toggle favorite status of a link."""
        link = LinkService.get_link_by_id(link_id)
        if not link:
            return None, "Link not found."

        link.is_favorite = not link.is_favorite
        db.session.commit()
        return link, None

    @staticmethod
    def get_dashboard_stats() -> Dict[str, Any]:
        """Summary metrics for Harini's dashboard statistics widgets."""
        total_links = Link.query.count()
        total_categories = Category.query.count()
        total_favorites = Link.query.filter_by(is_favorite=True).count()

        # Breakdown by platform
        platforms = db.session.query(
            Link.link_type, db.func.count(Link.id)
        ).group_by(Link.link_type).all()
        platform_breakdown = {ptype: count for ptype, count in platforms}

        # Breakdown by health status
        health = db.session.query(
            Link.status, db.func.count(Link.id)
        ).group_by(Link.status).all()
        health_breakdown = {status: count for status, count in health}

        # Short URL count — safe fallback if table doesn't exist yet
        total_short_urls = 0
        try:
            from app.models.short_url import ShortURL
            total_short_urls = ShortURL.query.count()
        except Exception:
            pass

        return {
            "total_links": total_links,
            "total_categories": total_categories,
            "total_favorites": total_favorites,
            "total_short_urls": total_short_urls,
            "platform_breakdown": platform_breakdown,
            "health_breakdown": health_breakdown,
        }
