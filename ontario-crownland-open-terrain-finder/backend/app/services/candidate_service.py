import logging
from sqlalchemy import text

logger = logging.getLogger(__name__)

class CandidateBuilder:
    def __init__(self, db_engine):
        self.engine = db_engine

    def subdivide_and_exclude(self, min_area_m2: float = 50000.0):
        """
        1. Select all CLUPA polygons that are "General Use"
        2. ST_Difference with ProtectedAreas and Overlay exclusions
        3. Dump multi-polygons to single polygons
        4. Insert into candidate_units table where area > 5 hectares
        """
        logger.info("Executing candidate unit generation logic in PostGIS...")
        
        # This is a robust PostGIS chaining query. We find 'General Use Area' CLUPA polygons,
        # subtract all protected areas and overlays, and store the resulting usable chunks.
        sql = """
        WITH target_clupa AS (
            SELECT id, geom_projected 
            FROM clupa_polygons 
            WHERE designation_eng ILIKE '%General Use%'
               OR designation_eng ILIKE '%Enhanced Management%'
        ),
        exclusions AS (
            SELECT ST_Union(geom_projected) as geom
            FROM (
                SELECT geom_projected FROM protected_areas
                UNION ALL
                SELECT geom_projected FROM clupa_overlays
            ) all_exclusions
        ),
        differenced AS (
            SELECT 
                c.id as parent_id,
                ST_Difference(c.geom_projected, COALESCE(e.geom, ST_SetSRID('GEOMETRYCOLLECTION EMPTY'::geometry, 3161))) as geom_proj
            FROM target_clupa c
            CROSS JOIN exclusions e
        ),
        single_parts AS (
            SELECT 
                parent_id,
                ((ST_Dump(geom_proj)).geom)::geometry as geom_proj
            FROM differenced
        )
        INSERT INTO candidate_units (
            parent_clupa_id, 
            geom_projected, 
            area_m2, 
            centroid
        )
        SELECT 
            parent_id,
            geom_proj,
            ST_Area(geom_proj) as area_m2,
            ST_Centroid(geom_proj) as centroid
        FROM single_parts
        WHERE ST_Area(geom_proj) >= :min_area;
        """
        try:
            with self.engine.begin() as conn:
                conn.execute(text("TRUNCATE candidate_units CASCADE;"))
                result = conn.execute(text(sql), {"min_area": min_area_m2})
                logger.info(f"Successfully generated candidate units.")
        except Exception as e:
            logger.error(f"Failed to build candidate units: {e}")
            raise e
            
    def link_municipalities(self):
        """
        Intersecting candidate_units against municipal_boundaries
        Inserting results into candidate_municipality_overlaps table.
        """
        logger.info("Computing municipality overlaps...")
        
        sql = """
        INSERT INTO candidate_municipality_overlaps (
            candidate_unit_id, 
            municipality_id, 
            overlap_area_m2, 
            overlap_share
        )
        SELECT 
            cu.id,
            m.id as municipality_id,
            ST_Area(ST_Intersection(cu.geom_projected, m.geom_projected)) as overlap_area_m2,
            ST_Area(ST_Intersection(cu.geom_projected, m.geom_projected)) / cu.area_m2 as overlap_share
        FROM candidate_units cu
        JOIN municipal_boundaries m 
          ON ST_Intersects(cu.geom_projected, m.geom_projected)
        WHERE ST_Area(ST_Intersection(cu.geom_projected, m.geom_projected)) > 0;
        """
        try:
            with self.engine.begin() as conn:
                conn.execute(text("TRUNCATE candidate_municipality_overlaps CASCADE;"))
                conn.execute(text(sql))
                logger.info("Successfully linked municipalities.")
        except Exception as e:
            logger.error(f"Failed to link municipalities: {e}")
            raise e
