"""
The domain's enumerations, kept free of any SQLAlchemy import.

`models.py` re-exports these, so `models.PropertyType` still works everywhere.
They live apart so that pure logic — pricing, the seed's row builders and their
tests — can be imported and run without a database driver present.
"""
import enum


class PropertyType(str, enum.Enum):
    entire_home = "entire_home"
    private_room = "private_room"
    shared_room = "shared_room"
    hotel_room = "hotel_room"


class BookingStatus(str, enum.Enum):
    confirmed = "confirmed"
    cancelled = "cancelled"


class ExperienceKind(str, enum.Enum):
    """Experiences are hosted activities (food tours, workshops...); services are
    bookable professionals (photographers, trainers, chefs...). They share one
    table because the booking model — a date, a headcount, a per-guest price —
    is identical; `kind` drives which tab they appear under."""

    experience = "experience"
    service = "service"
