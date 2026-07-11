"""
Business logic for cargo/ULD management.
"""
from rest_framework.exceptions import ValidationError


class ULDService:
    @staticmethod
    def validate_weight(weight_kg, max_weight_kg):
        if max_weight_kg and weight_kg and weight_kg > max_weight_kg:
            raise ValidationError(
                f'ULD weight ({weight_kg}kg) exceeds its maximum capacity '
                f'({max_weight_kg}kg).'
            )


class CargoItemService:
    @staticmethod
    def validate_dangerous_goods(is_dangerous_goods, dangerous_goods_class):
        if is_dangerous_goods and not dangerous_goods_class:
            raise ValidationError(
                'Dangerous-goods class is required when '
                'is_dangerous_goods is True.'
            )
        if not is_dangerous_goods and dangerous_goods_class:
            raise ValidationError(
                'dangerous_goods_class must be blank when the item is not '
                'flagged as dangerous goods.'
            )


class CargoManifestService:
    @staticmethod
    def recalculate_total_weight(manifest):
        """Recomputes and persists total_weight_kg from the manifest's items."""
        total = sum(
            (item.weight_kg for item in manifest.items.all()),
            start=type(manifest.total_weight_kg)(0) if manifest.total_weight_kg is not None else 0
        )
        manifest.total_weight_kg = total
        manifest.save(update_fields=['total_weight_kg'])
        return manifest

    @staticmethod
    def validate_finalize(manifest):
        if not manifest.items.exists():
            raise ValidationError(
                'Cannot finalize a cargo manifest with no items.')
