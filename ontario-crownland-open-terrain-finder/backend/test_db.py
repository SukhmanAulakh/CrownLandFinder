import sqlalchemy
from sqlalchemy import create_engine, text
import traceback

engine = create_engine('postgresql://crownland:crownland@db/crownland_db')
try:
    with engine.connect() as conn:
        conn.execute(text("CREATE TABLE access_points (id SERIAL PRIMARY KEY, geom_projected geometry(POINT, 3161));"))
        conn.execute(text("CREATE INDEX idx_access_points_geom_projected ON access_points USING GIST (geom_projected);"))
        conn.commit()
    print("SUCCESS")
except Exception as e:
    print("ERROR CAUGHT:")
    print(traceback.format_exc())
