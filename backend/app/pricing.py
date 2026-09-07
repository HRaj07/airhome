"""Pure pricing math, isolated from the DB layer so it can be unit tested
without any third-party dependencies."""
import datetime


def nights_between(check_in: datetime.date, check_out: datetime.date) -> int:
    return (check_out - check_in).days


def compute_price(nights: int, price_per_night: float, cleaning_fee: float, service_fee_pct: float):
    """Returns (subtotal, service_fee, total), each rounded to 2 decimals."""
    if nights <= 0:
        raise ValueError("nights must be positive")
    subtotal = round(nights * price_per_night, 2)
    service_fee = round(subtotal * service_fee_pct, 2)
    total = round(subtotal + cleaning_fee + service_fee, 2)
    return subtotal, service_fee, total


def date_ranges_overlap(a_start: datetime.date, a_end: datetime.date, b_start: datetime.date, b_end: datetime.date) -> bool:
    """Half-open interval overlap: [a_start, a_end) vs [b_start, b_end).
    A checkout date equal to another booking's check-in date is NOT an overlap."""
    return a_start < b_end and a_end > b_start
