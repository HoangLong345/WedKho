"""Warehouse allocation and spatial model prototype package."""
from .allocator import (
    BayLevel,
    Pallet,
    Suggestion,
    NoSafeSlot,
    assign,
    LIMIT,
    PATTERNS,
    CAPACITY,
    get_slot_patterns,
)
from .integration import (
    Warehouse,
    ConfirmationResult,
    get_bay_count_for_rack,
    get_bays_for_rack,
    is_forklift_passage,
)

__all__ = [
    "BayLevel",
    "Pallet",
    "Suggestion",
    "NoSafeSlot",
    "assign",
    "LIMIT",
    "PATTERNS",
    "CAPACITY",
    "get_slot_patterns",
    "Warehouse",
    "ConfirmationResult",
    "get_bay_count_for_rack",
    "get_bays_for_rack",
    "is_forklift_passage",
]
