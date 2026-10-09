from datetime import datetime
from app.extensions import db


class Link(db.Model):
    __tablename__ = "links"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    title = db.Column(db.String(255), nullable=False, index=True)
    url = db.Column(db.Text, nullable=False)
    description = db.Column(db.Text, nullable=True)

    # Relational foreign key
    category_id = db.Column(
        db.Integer,
        db.ForeignKey("categories.id", ondelete="CASCADE"),
        nullable=True,
        index=True
    )

    # Link classification: 'github', 'drive', 'meet', 'youtube', 'linkedin', 'other'
    link_type = db.Column(db.String(50), default="other", nullable=False, index=True)

    # Favorite flag
    is_favorite = db.Column(db.Boolean, default=False, nullable=False, index=True)

    # HTTP Health Status tokens: 'healthy', 'broken', 'restricted', 'timeout'
    status = db.Column(db.String(50), default="healthy", nullable=False)
    status_code = db.Column(db.Integer, default=200, nullable=True)

    # Comma-delimited tags (e.g. "python,flask,backend")
    tags = db.Column(db.String(255), nullable=True)

    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    def __init__(self, **kwargs):
        super().__init__(**kwargs)

    def parse_tags_list(self) -> list:
        if not self.tags:
            return []
        return [tag.strip() for tag in self.tags.split(",") if tag.strip()]

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "title": self.title,
            "url": self.url,
            "original_url": self.url,
            "description": self.description or "",
            "context": self.description or "",
            "source": "Manual",
            "category_id": self.category_id,
            "category": self.category.name if self.category else None,
            "category_name": self.category.name if self.category else None,
            "category_color": self.category.color if self.category else None,
            "link_type": self.link_type,
            "is_favorite": self.is_favorite,
            "status": self.status,
            "health_status": self.status.capitalize() if self.status else "Unchecked",
            "status_code": self.status_code,
            "tags": self.parse_tags_list(),
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }

    def __repr__(self):
        return f"<Link {self.id}: {self.title}>"
