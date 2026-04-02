from sqlalchemy import text
from app.db.database import engine

with engine.begin() as conn:
    conn.execute(text("ALTER TABLE posts ADD COLUMN IF NOT EXISTS platform_log TEXT;"))
    print("Column added successfully.")
