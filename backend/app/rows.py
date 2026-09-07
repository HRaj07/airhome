"""
Shared row-building rules for the carousels.

A carousel row is a shop window: the same title three times, or the same
photograph on two neighbouring cards, reads as broken even when the underlying
records are genuinely different. Category rows make this especially easy to hit
— "Chefs" pulls from every city at once, and every city has a
"Farm-to-table tasting menu at home".

So rows are built from a wider candidate pool than they display and then
filtered down: first occurrence of each title and of each cover photo wins, and
the rest are dropped rather than shown as duplicates.
"""
from typing import Callable, Dict, Iterable, List, Optional, Sequence, Tuple, TypeVar

from .photos import photo_id_of, same_shoot
from .utils import haversine_km

T = TypeVar("T")

#: How many candidates to gather per row before de-duplicating. Three times the
#: display size leaves room to drop repeats and still fill the row.
CANDIDATE_FACTOR = 3


def rank_cities_by_distance(
    city_coords: Iterable[Tuple[str, Optional[float], Optional[float]]],
    lat: float,
    lng: float,
    limit: int,
) -> Tuple[List[str], Dict[str, float]]:
    """The `limit` cities closest to (lat, lng), nearest first.

    `city_coords` is the result of grouping a table by city and averaging its
    coordinates — a city's average position is close enough for ordering rows,
    and it means one query instead of a per-city lookup.

    Every city with inventory is ranked, not just the busiest ones: with the
    headline cities tied on listing count, taking the nearest of the top 20 sent
    a guest in Delhi to Agra.

    Returns the ordered city names and their distances in kilometres, the latter
    so callers can word a row "Stay near X" only when X really is near.
    """
    ranked = sorted(
        ((city, haversine_km(lat, lng, clat or 0.0, clng or 0.0)) for city, clat, clng in city_coords),
        key=lambda pair: pair[1],
    )[:limit]
    return [city for city, _ in ranked], dict(ranked)


def group_candidates(
    items: Iterable[T],
    keys: Sequence[str],
    key_of: Callable[[T], str],
    per_row: int,
) -> Dict[str, List[T]]:
    """Bucket `items` by key, capped at enough candidates to de-duplicate a row.

    distinct_cards drops repeated titles and covers, so each bucket needs spares
    to still fill the row afterwards — CANDIDATE_FACTOR times the display size.
    Anything beyond that is serialization work for cards no one will see.
    """
    groups: Dict[str, List[T]] = {key: [] for key in keys}
    for item in items:
        group = groups.get(key_of(item))
        if group is not None and len(group) < per_row * CANDIDATE_FACTOR:
            group.append(item)
    return groups


def distinct_cards(
    candidates: Sequence[T],
    limit: int,
    title_of: Callable[[T], str],
    photo_of: Callable[[T], str],
    used_photos: Optional[set] = None,
) -> List[T]:
    """Up to `limit` cards, with no repeated title and no repeated cover photo.

    `used_photos` is shared across every row in one response and is what stops
    a photo appearing twice on one screen: the page shows two rows at a time,
    so de-duplicating each row on its own still let a Delhi card and a Noida
    card open on the same picture.

    Filling happens in two passes. The first takes only cards whose cover no
    row has used yet. If that leaves the row short — there are more cards than
    photographs — the second pass tops it up with covers seen in earlier rows,
    still never repeating one inside this row. So repeats get pushed as far
    down the page as the library allows instead of landing side by side."""
    chosen: List[T] = []
    seen_titles: set = set()
    row_photos: set = set()
    globally_used = used_photos if used_photos is not None else set()

    # Two different frames of the same person from the same shoot look like a
    # repeat to a guest, so a photo "clashes" with anything from its shoot,
    # not only with its exact twin. `used_photos` carries urls; the shoot
    # check parses the Pexels id back out of them.
    def clashes(photo: str, pool: set) -> bool:
        if photo in pool:
            return True
        pid = photo_id_of(photo)
        if pid is None:
            return False
        for other in pool:
            oid = photo_id_of(other)
            if oid is not None and same_shoot(pid, oid):
                return True
        return False

    def take(card: T) -> None:
        chosen.append(card)
        seen_titles.add((title_of(card) or "").strip().lower())
        photo = photo_of(card) or ""
        if photo:
            row_photos.add(photo)
            globally_used.add(photo)

    def free(card: T, *, globally: bool) -> bool:
        title = (title_of(card) or "").strip().lower()
        if title in seen_titles:
            return False
        photo = photo_of(card) or ""
        if not photo:
            return True
        if clashes(photo, row_photos):
            return False
        return not clashes(photo, globally_used) if globally else True

    for card in candidates:
        if len(chosen) >= limit:
            break
        if free(card, globally=True):
            take(card)

    if len(chosen) < limit:
        for card in candidates:
            if len(chosen) >= limit:
                break
            if card in chosen:
                continue
            if free(card, globally=False):
                take(card)

    if not chosen:
        return list(candidates[:limit])
    return chosen
