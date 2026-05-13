"""optimize_geometry_precision_and_simplify

Revision ID: 7f1e312a549a
Revises: 
Create Date: 2026-05-13 02:09:43.647530

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '7f1e312a549a'
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema and optimize geometries."""
    # Optimize clupa_polygons
    op.execute("UPDATE clupa_polygons SET geom_projected = ST_QuantizeCoordinates(ST_SimplifyPreserveTopology(geom_projected, 0.1), 20)")
    op.execute("VACUUM FULL ANALYZE clupa_polygons")
    
    # Optimize candidate_units
    op.execute("UPDATE candidate_units SET geom_projected = ST_QuantizeCoordinates(ST_SimplifyPreserveTopology(geom_projected, 0.1), 20)")
    op.execute("VACUUM FULL ANALYZE candidate_units")


def downgrade() -> None:
    """Downgrade schema (No easy reversal for simplification)."""
    pass
