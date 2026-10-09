from datetime import datetime
from app.extensions import db


class Category(db.Model):
    __tablename__ = "categories"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    name = db.Column(db.String(100), unique=True, nullable=False, index=True)
    color = db.Column(db.String(20), default="#1E3A8A", nullable=False)
    icon = db.Column(db.String(50), default="folder", nullable=False)
    description = db.Column(db.String(255), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relational cascade: deleting a category cascades to linked items or reassigns
    links = db.relationship(
        "Link",
        backref="category",
        lazy="dynamic",
        cascade="all, delete-orphan"
    )

    def __init__(self, **kwargs):
        super().__init__(**kwargs)

    def to_dict(self, include_links_count: bool = True) -> dict:
        data = {
            "id": self.id,
            "name": self.name,
            "color": self.color,
            "icon": self.icon,
            "description": self.description or "",
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }
        if include_links_count:
            data["links_count"] = self.links.count()
        return data

    def __repr__(self):
        return f"<Category {self.id}: {self.name}>"
