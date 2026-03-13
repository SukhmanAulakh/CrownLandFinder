from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime, JSON
from sqlalchemy.sql import func
from geoalchemy2 import Geometry
from app.db.base import Base

# Note: We store source raw geometry in SRID 4269 (NAD83) and projected geometry in SRID 3161 (NAD83(CSRS) / Ontario MNR Lambert)
RAW_SRID = 4269
PROJ_SRID = 3161

class ClupaPolygon(Base):
    __tablename__ = "clupa_polygons"
    id = Column(Integer, primary_key=True, index=True)
    external_id = Column(String, index=True)
    policy_ident = Column(String, index=True)
    designation_eng = Column(String)
    category_eng = Column(String)
    area_name = Column(String)
    geom_raw = Column(Geometry(geometry_type='MULTIPOLYGON', srid=RAW_SRID, spatial_index=False))
    geom_projected = Column(Geometry(geometry_type='MULTIPOLYGON', srid=PROJ_SRID, spatial_index=False))
    source_id = Column(Integer, ForeignKey("data_sources.id"))

class ClupaOverlay(Base):
    __tablename__ = "clupa_overlays"
    id = Column(Integer, primary_key=True, index=True)
    external_id = Column(String, index=True)
    overlay_type = Column(String)
    overlay_name = Column(String)
    geom_raw = Column(Geometry(geometry_type='MULTIPOLYGON', srid=RAW_SRID, spatial_index=False))
    geom_projected = Column(Geometry(geometry_type='MULTIPOLYGON', srid=PROJ_SRID, spatial_index=False))
    source_id = Column(Integer, ForeignKey("data_sources.id"))

class MunicipalBoundary(Base):
    __tablename__ = "municipal_boundaries"
    id = Column(Integer, primary_key=True, index=True)
    external_id = Column(String, index=True)
    municipality_name = Column(String)
    municipality_type = Column(String)
    geom_raw = Column(Geometry(geometry_type='MULTIPOLYGON', srid=RAW_SRID, spatial_index=False))
    geom_projected = Column(Geometry(geometry_type='MULTIPOLYGON', srid=PROJ_SRID, spatial_index=False))
    source_id = Column(Integer, ForeignKey("data_sources.id"))

class ProtectedArea(Base):
    __tablename__ = "protected_areas"
    id = Column(Integer, primary_key=True, index=True)
    external_id = Column(String, index=True)
    protected_type = Column(String)  # Park, Reserve
    name = Column(String)
    geom_raw = Column(Geometry(geometry_type='MULTIPOLYGON', srid=RAW_SRID, spatial_index=False))
    geom_projected = Column(Geometry(geometry_type='MULTIPOLYGON', srid=PROJ_SRID, spatial_index=False))
    source_id = Column(Integer, ForeignKey("data_sources.id"))

class Road(Base):
    __tablename__ = "roads"
    id = Column(Integer, primary_key=True, index=True)
    external_id = Column(String, index=True)
    road_class = Column(String)
    name = Column(String)
    geom_raw = Column(Geometry(geometry_type='MULTILINESTRING', srid=RAW_SRID, spatial_index=False))
    geom_projected = Column(Geometry(geometry_type='MULTILINESTRING', srid=PROJ_SRID, spatial_index=False))
    source_id = Column(Integer, ForeignKey("data_sources.id"))

class Trail(Base):
    __tablename__ = "trails"
    id = Column(Integer, primary_key=True, index=True)
    external_id = Column(String, index=True)
    trail_name = Column(String)
    geom_raw = Column(Geometry(geometry_type='MULTILINESTRING', srid=RAW_SRID, spatial_index=False))
    geom_projected = Column(Geometry(geometry_type='MULTILINESTRING', srid=PROJ_SRID, spatial_index=False))
    source_id = Column(Integer, ForeignKey("data_sources.id"))

class WaterFeature(Base):
    __tablename__ = "water_features"
    id = Column(Integer, primary_key=True, index=True)
    external_id = Column(String, index=True)
    feature_type = Column(String)
    name = Column(String)
    geom_raw = Column(Geometry(geometry_type='GEOMETRY', srid=RAW_SRID, spatial_index=False)) # Can be point, line, poly
    geom_projected = Column(Geometry(geometry_type='GEOMETRY', srid=PROJ_SRID, spatial_index=False))
    source_id = Column(Integer, ForeignKey("data_sources.id"))

class AccessPoint(Base):
    __tablename__ = "access_points"
    id = Column(Integer, primary_key=True, index=True)
    external_id = Column(String, index=True)
    access_type = Column(String)
    name = Column(String)
    geom_raw = Column(Geometry(geometry_type='POINT', srid=RAW_SRID, spatial_index=False))
    geom_projected = Column(Geometry(geometry_type='POINT', srid=PROJ_SRID, spatial_index=False))
    source_id = Column(Integer, ForeignKey("data_sources.id"))

class DemTile(Base):
    __tablename__ = "dem_tiles"
    id = Column(Integer, primary_key=True, index=True)
    product_type = Column(String) # DTM, DEM
    tile_name = Column(String)
    raster_path = Column(String)
    resolution_m = Column(Float)
    bbox = Column(Geometry(geometry_type='POLYGON', srid=PROJ_SRID))
    source_id = Column(Integer, ForeignKey("data_sources.id"))

class CandidateUnit(Base):
    __tablename__ = "candidate_units"
    id = Column(Integer, primary_key=True, index=True)
    parent_clupa_id = Column(Integer, ForeignKey("clupa_polygons.id"))
    geom_projected = Column(Geometry(geometry_type='MULTIPOLYGON', srid=PROJ_SRID, spatial_index=False))
    area_m2 = Column(Float)
    centroid = Column(Geometry(geometry_type='POINT', srid=PROJ_SRID, spatial_index=False))
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class CandidateMunicipalityOverlap(Base):
    __tablename__ = "candidate_municipality_overlaps"
    id = Column(Integer, primary_key=True, index=True)
    candidate_unit_id = Column(Integer, ForeignKey("candidate_units.id"))
    municipality_id = Column(Integer, ForeignKey("municipal_boundaries.id"))
    overlap_area_m2 = Column(Float)
    overlap_share = Column(Float)

class CandidateScore(Base):
    __tablename__ = "candidate_scores"
    id = Column(Integer, primary_key=True, index=True)
    candidate_unit_id = Column(Integer, ForeignKey("candidate_units.id"))
    open_land_score = Column(Float)
    terrain_enclosure_score = Column(Float)
    classification = Column(String)
    explanation_json = Column(JSON)
    scoring_version = Column(String)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
