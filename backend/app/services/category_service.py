from typing import List, Optional, Tuple, Dict, Any
from app.extensions import db
from app.models.category import Category


class CategoryService:
    @staticmethod
    def get_all_categories() -> List[Category]:
        """Fetch all categories ordered by creation time."""
        return Category.query.order_by(Category.name.asc()).all()

    @staticmethod
    def get_category_by_id(category_id: int) -> Optional[Category]:
        """Fetch a category by its primary key ID."""
        return db.session.get(Category, category_id)

    @staticmethod
    def get_category_by_name(name: str) -> Optional[Category]:
        """Fetch a category by its name (case-insensitive)."""
        return Category.query.filter(Category.name.ilike(name.strip())).first()

    @staticmethod
    def create_category(data: Dict[str, Any]) -> Tuple[Optional[Category], Optional[str]]:
        """
        Create a new category with duplicate name validation.
        Returns: (Category, None) on success, or (None, error_message) on failure.
        """
        name = data.get("name", "").strip()
        if not name:
            return None, "Category name is required."

        if CategoryService.get_category_by_name(name):
            return None, f"Category with name '{name}' already exists."

        color = data.get("color", "#1E3A8A")
        icon = data.get("icon", "folder")
        description = data.get("description", "").strip()

        category = Category(
            name=name,
            color=color,
            icon=icon,
            description=description
        )
        db.session.add(category)
        db.session.commit()
        return category, None

    @staticmethod
    def update_category(category_id: int, data: Dict[str, Any]) -> Tuple[Optional[Category], Optional[str]]:
        """
        Update an existing category.
        Returns: (Category, None) on success, or (None, error_message) on failure.
        """
        category = CategoryService.get_category_by_id(category_id)
        if not category:
            return None, "Category not found."

        if "name" in data:
            new_name = data["name"].strip()
            if not new_name:
                return None, "Category name cannot be empty."

            # Check if another category has this name
            existing = Category.query.filter(
                Category.name.ilike(new_name),
                Category.id != category_id
            ).first()
            if existing:
                return None, f"Another category with name '{new_name}' already exists."
            category.name = new_name

        if "color" in data:
            category.color = data["color"]
        if "icon" in data:
            category.icon = data["icon"]
        if "description" in data:
            category.description = data["description"].strip()

        db.session.commit()
        return category, None

    @staticmethod
    def delete_category(category_id: int) -> Tuple[bool, Optional[str]]:
        """
        Delete a category by ID.
        Returns: (True, None) on success, or (False, error_message) on failure.
        """
        category = CategoryService.get_category_by_id(category_id)
        if not category:
            return False, "Category not found."

        db.session.delete(category)
        db.session.commit()
        return True, None
