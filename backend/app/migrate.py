"""Additive schema migration for the committed SQLite database.

`Base.metadata.create_all()` creates missing tables but never adds columns to
tables that already exist, and the demo database ships pre-seeded. So on
start-up, compare each model's columns with the live table and `ALTER TABLE
ADD COLUMN` whatever is missing, with the model's default as the value.
"""
from sqlalchemy import inspect, text

from .database import Base


def _sql_default(column) -> str:
    default = column.default.arg if column.default is not None else None
    if callable(default) or default is None:
        return ""
    if isinstance(default, bool):
        return f" DEFAULT {1 if default else 0}"
    if isinstance(default, (int, float)):
        return f" DEFAULT {default}"
    escaped = str(default).replace("'", "''")
    return f" DEFAULT '{escaped}'"


def ensure_columns(engine) -> list:
    """Add any model column the live table lacks. Returns what was added."""
    inspector = inspect(engine)
    existing_tables = set(inspector.get_table_names())
    added = []
    with engine.begin() as conn:
        for table in Base.metadata.sorted_tables:
            if table.name not in existing_tables:
                continue
            present = {c["name"] for c in inspector.get_columns(table.name)}
            for column in table.columns:
                if column.name in present:
                    continue
                col_type = column.type.compile(dialect=engine.dialect)
                conn.execute(
                    text(f'ALTER TABLE "{table.name}" ADD COLUMN "{column.name}" {col_type}{_sql_default(column)}')
                )
                added.append(f"{table.name}.{column.name}")
    return added
