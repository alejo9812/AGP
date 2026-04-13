from __future__ import annotations

from datetime import datetime
from typing import Optional

from sqlalchemy import JSON, Boolean, Date, DateTime, Enum, ForeignKey, Index, Integer, Numeric, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.db import Base
from app.models.enums import (
    AuditEventType,
    GroupingDecisionStatus,
    GroupingSourceType,
    OperationalStatus,
    SourceSetStatus,
    UserRole,
)


class TimestampMixin:
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
    )


class Customer(TimestampMixin, Base):
    __tablename__ = "customers"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)


class Vehicle(TimestampMixin, Base):
    __tablename__ = "vehicles"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(255), unique=True, index=True)


class ProductType(TimestampMixin, Base):
    __tablename__ = "product_types"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(100), unique=True, index=True)


class InventoryImportBatch(TimestampMixin, Base):
    __tablename__ = "inventory_import_batches"

    id: Mapped[int] = mapped_column(primary_key=True)
    batch_uuid: Mapped[str] = mapped_column(String(36), unique=True, index=True)
    file_name: Mapped[str] = mapped_column(String(255))
    source_type: Mapped[str] = mapped_column(String(20))
    total_rows: Mapped[int] = mapped_column(Integer, default=0)
    valid_rows: Mapped[int] = mapped_column(Integer, default=0)
    rows_needing_review: Mapped[int] = mapped_column(Integer, default=0)
    status: Mapped[str] = mapped_column(String(20), default="uploaded")

    inventory_items: Mapped[list[InventoryItem]] = relationship(back_populates="import_batch")  # type: ignore[name-defined]


class WarehouseLocation(TimestampMixin, Base):
    __tablename__ = "warehouse_locations"

    id: Mapped[int] = mapped_column(primary_key=True)
    code: Mapped[str] = mapped_column(String(50), unique=True, index=True)
    zone: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    aisle: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    level: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)


class User(TimestampMixin, Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_uuid: Mapped[str] = mapped_column(String(36), unique=True, index=True)
    full_name: Mapped[str] = mapped_column(String(255))
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    role: Mapped[UserRole] = mapped_column(Enum(UserRole))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)


class StatusCatalog(TimestampMixin, Base):
    __tablename__ = "status_catalog"

    id: Mapped[int] = mapped_column(primary_key=True)
    status_code: Mapped[OperationalStatus] = mapped_column(Enum(OperationalStatus), unique=True, index=True)
    display_name: Mapped[str] = mapped_column(String(100))
    description: Mapped[str] = mapped_column(Text)


class InventoryItem(TimestampMixin, Base):
    __tablename__ = "inventory_items"
    __table_args__ = (
        UniqueConstraint("source_id", name="uq_inventory_items_source_id"),
        Index("ix_inventory_items_lookup", "order_id", "vehicle_name", "product_name"),
        Index("ix_inventory_items_status", "set_status", "operational_status"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    source_id: Mapped[str] = mapped_column(String(36))
    order_id: Mapped[str] = mapped_column(String(50), index=True)
    serial: Mapped[str] = mapped_column(String(100), index=True)
    vehicle_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    created_date: Mapped[Optional[datetime]] = mapped_column(Date, nullable=True)
    product_name: Mapped[str] = mapped_column(String(100), index=True)
    invoice: Mapped[str] = mapped_column(String(100))
    invoice_cost: Mapped[float] = mapped_column(Numeric(12, 2))
    customer_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True, index=True)
    days_stored: Mapped[int] = mapped_column(Integer, index=True)
    set_status: Mapped[SourceSetStatus] = mapped_column(Enum(SourceSetStatus), index=True)
    operational_status: Mapped[OperationalStatus] = mapped_column(Enum(OperationalStatus), default=OperationalStatus.IN_STOCK)
    is_free_stock: Mapped[bool] = mapped_column(Boolean, default=False, index=True)
    needs_review: Mapped[bool] = mapped_column(Boolean, default=False, index=True)
    review_reasons: Mapped[list[str]] = mapped_column(JSON, default=list)
    customer_id: Mapped[Optional[int]] = mapped_column(ForeignKey("customers.id"), nullable=True)
    vehicle_id: Mapped[Optional[int]] = mapped_column(ForeignKey("vehicles.id"), nullable=True)
    product_type_id: Mapped[Optional[int]] = mapped_column(ForeignKey("product_types.id"), nullable=True)
    import_batch_id: Mapped[Optional[int]] = mapped_column(ForeignKey("inventory_import_batches.id"), nullable=True)
    location_id: Mapped[Optional[int]] = mapped_column(ForeignKey("warehouse_locations.id"), nullable=True)

    customer: Mapped[Optional[Customer]] = relationship()
    vehicle: Mapped[Optional[Vehicle]] = relationship()
    product_type: Mapped[Optional[ProductType]] = relationship()
    import_batch: Mapped[Optional[InventoryImportBatch]] = relationship(back_populates="inventory_items")
    location: Mapped[Optional[WarehouseLocation]] = relationship()
    qr_tag: Mapped[Optional[QrTag]] = relationship(back_populates="inventory_item", uselist=False)  # type: ignore[name-defined]

    @property
    def qr_token(self) -> Optional[str]:
        return self.qr_tag.qr_token if self.qr_tag else None


class GroupingRecommendation(TimestampMixin, Base):
    __tablename__ = "grouping_recommendations"
    __table_args__ = (
        Index("ix_grouping_recommendations_status", "decision_status", "receiver_item_id"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    recommendation_uuid: Mapped[str] = mapped_column(String(36), unique=True, index=True)
    receiver_item_id: Mapped[int] = mapped_column(ForeignKey("inventory_items.id"), index=True)
    decision_status: Mapped[GroupingDecisionStatus] = mapped_column(
        Enum(GroupingDecisionStatus),
        default=GroupingDecisionStatus.PENDING,
    )
    summary: Mapped[str] = mapped_column(Text)
    analysis_run_id: Mapped[str] = mapped_column(String(36), index=True)
    selected_donor_item_id: Mapped[Optional[int]] = mapped_column(ForeignKey("inventory_items.id"), nullable=True)
    decided_by_user_id: Mapped[Optional[int]] = mapped_column(ForeignKey("users.id"), nullable=True)
    decided_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    decision_notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    receiver_item: Mapped[InventoryItem] = relationship(foreign_keys=[receiver_item_id])
    selected_donor_item: Mapped[Optional[InventoryItem]] = relationship(foreign_keys=[selected_donor_item_id])
    decided_by: Mapped[Optional[User]] = relationship()
    matches: Mapped[list[GroupingMatch]] = relationship(back_populates="recommendation")  # type: ignore[name-defined]


class GroupingMatch(TimestampMixin, Base):
    __tablename__ = "grouping_matches"
    __table_args__ = (
        Index("ix_grouping_matches_rank", "recommendation_id", "rank"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    recommendation_id: Mapped[int] = mapped_column(ForeignKey("grouping_recommendations.id"), index=True)
    donor_item_id: Mapped[int] = mapped_column(ForeignKey("inventory_items.id"), index=True)
    source_type: Mapped[GroupingSourceType] = mapped_column(Enum(GroupingSourceType))
    rank: Mapped[int] = mapped_column(Integer)
    days_stored_at_decision: Mapped[int] = mapped_column(Integer)
    explanation: Mapped[str] = mapped_column(Text)

    recommendation: Mapped[GroupingRecommendation] = relationship(back_populates="matches")
    donor_item: Mapped[InventoryItem] = relationship(foreign_keys=[donor_item_id])


class StockMovement(TimestampMixin, Base):
    __tablename__ = "stock_movements"
    __table_args__ = (
        Index("ix_stock_movements_item", "inventory_item_id", "created_at"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    movement_uuid: Mapped[str] = mapped_column(String(36), unique=True, index=True)
    inventory_item_id: Mapped[int] = mapped_column(ForeignKey("inventory_items.id"), index=True)
    action: Mapped[str] = mapped_column(String(30), index=True)
    from_status: Mapped[Optional[OperationalStatus]] = mapped_column(Enum(OperationalStatus), nullable=True)
    to_status: Mapped[Optional[OperationalStatus]] = mapped_column(Enum(OperationalStatus), nullable=True)
    from_location_id: Mapped[Optional[int]] = mapped_column(ForeignKey("warehouse_locations.id"), nullable=True)
    to_location_id: Mapped[Optional[int]] = mapped_column(ForeignKey("warehouse_locations.id"), nullable=True)
    actor_user_id: Mapped[Optional[int]] = mapped_column(ForeignKey("users.id"), nullable=True)
    notes: Mapped[str] = mapped_column(Text, default="")

    inventory_item: Mapped[InventoryItem] = relationship()
    from_location: Mapped[Optional[WarehouseLocation]] = relationship(foreign_keys=[from_location_id])
    to_location: Mapped[Optional[WarehouseLocation]] = relationship(foreign_keys=[to_location_id])
    actor_user: Mapped[Optional[User]] = relationship()


class QrTag(TimestampMixin, Base):
    __tablename__ = "qr_tags"

    id: Mapped[int] = mapped_column(primary_key=True)
    qr_token: Mapped[str] = mapped_column(String(120), unique=True, index=True)
    inventory_item_id: Mapped[int] = mapped_column(ForeignKey("inventory_items.id"), unique=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    inventory_item: Mapped[InventoryItem] = relationship(back_populates="qr_tag")


class AuditLog(TimestampMixin, Base):
    __tablename__ = "audit_logs"
    __table_args__ = (
        Index("ix_audit_logs_event", "event_type", "created_at"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    event_uuid: Mapped[str] = mapped_column(String(36), unique=True, index=True)
    event_type: Mapped[AuditEventType] = mapped_column(Enum(AuditEventType), index=True)
    inventory_item_id: Mapped[Optional[int]] = mapped_column(ForeignKey("inventory_items.id"), nullable=True)
    recommendation_id: Mapped[Optional[int]] = mapped_column(ForeignKey("grouping_recommendations.id"), nullable=True)
    actor_user_id: Mapped[Optional[int]] = mapped_column(ForeignKey("users.id"), nullable=True)
    details: Mapped[dict] = mapped_column(JSON, default=dict)

    inventory_item: Mapped[Optional[InventoryItem]] = relationship()
    recommendation: Mapped[Optional[GroupingRecommendation]] = relationship()
    actor_user: Mapped[Optional[User]] = relationship()
