import os
import sys
from sqlalchemy import create_engine, text
from geoalchemy2.elements import WKTElement

sys.path.insert(0, "/app")
from app.db.models.spatial import ClupaPolygon, ClupaOverlay, ProtectedArea, MunicipalBoundary, Road, Trail, WaterFeature

DB_USER = os.getenv("POSTGRES_USER", "crownland")
DB_PASS = os.getenv("POSTGRES_PASSWORD", "crownland")
DB_HOST = os.getenv("DB_HOST", "db")
DB_NAME = os.getenv("POSTGRES_DB", "crownland_db")
DB_URL = f"postgresql://{DB_USER}:{DB_PASS}@{DB_HOST}:5432/{DB_NAME}"

engine = create_engine(DB_URL)

def seed_test_data():
    print("Emptying existing test database...")
    with engine.begin() as conn:
        conn.execute(text("TRUNCATE clupa_polygons, clupa_overlays, protected_areas, municipal_boundaries CASCADE;"))
        
    print("Seeding massive dummy polygons...")
    from sqlalchemy.orm import Session
    
    # We will create a massive 10x10 km square representing 'Crown Land'
    # And a 3x3 km square representing a 'Protected Area' that sits inside it
    # The projected coordinate system 3161 uses meters. Let's assume an arbitrary center.
    
    # 10x10 km Crown Land (General Use)
    crown_land_wkt = "MULTIPOLYGON(((10000 10000, 20000 10000, 20000 20000, 10000 20000, 10000 10000)))"
    
    # 3x3 km Protected Area (inside the crown land)
    protected_wkt = "MULTIPOLYGON(((12000 12000, 15000 12000, 15000 15000, 12000 15000, 12000 12000)))"
    
    # 2x2 km Overlay (also inside the crown land, intersecting the edge)
    overlay_wkt = "MULTIPOLYGON(((18000 18000, 21000 18000, 21000 21000, 18000 21000, 18000 18000)))"
    
    # Municipality roughly covering half the crown land
    municipality_wkt = "MULTIPOLYGON(((5000 5000, 15000 5000, 15000 25000, 5000 25000, 5000 5000)))"

    with Session(engine) as session:
        clupa = ClupaPolygon(
            policy_ident="G1234",
            designation_eng="General Use Area",
            area_name="Test Crown Land",
            geom_raw=WKTElement(crown_land_wkt, srid=4269), # Ignoring raw reprojection accuracy for tests
            geom_projected=WKTElement(crown_land_wkt, srid=3161)
        )
        session.add(clupa)
        
        prot = ProtectedArea(
            name="Test Park",
            protected_type="Provincial Park",
            geom_raw=WKTElement(protected_wkt, srid=4269),
            geom_projected=WKTElement(protected_wkt, srid=3161)
        )
        session.add(prot)
        
        overlay = ClupaOverlay(
            overlay_type="Mining Hazard", # Example
            overlay_name="Test Hazard",
            geom_raw=WKTElement(overlay_wkt, srid=4269),
            geom_projected=WKTElement(overlay_wkt, srid=3161)
        )
        session.add(overlay)
        
        mun = MunicipalBoundary(
            municipality_name="Test Township",
            municipality_type="Township",
            geom_raw=WKTElement(municipality_wkt, srid=4269),
            geom_projected=WKTElement(municipality_wkt, srid=3161)
        )
        session.add(mun)
        
        session.commit()
    print("Database seeded with test geometries.")

if __name__ == "__main__":
    seed_test_data()
