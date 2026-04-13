from enum import Enum


class SourceSetStatus(str, Enum):
    COMPLETE = "Complete"
    INCOMPLETE = "Incomplete"
    ADDITIONALS = "Additionals"


class OperationalStatus(str, Enum):
    IN_STOCK = "In Stock"
    RESERVED = "Reserved"
    GROUPED = "Grouped"
    COMPLETED = "Completed"
    READY_FOR_DISPATCH = "Ready for Dispatch"
    DISPATCHED = "Dispatched"
    BLOCKED = "Blocked"
    REVIEW_NEEDED = "Review Needed"


class GroupingDecisionStatus(str, Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"


class GroupingSourceType(str, Enum):
    ADDITIONAL = "additional"
    INCOMPLETE = "incomplete"
    FREE_STOCK = "free_stock"


class AuditEventType(str, Enum):
    IMPORT = "import"
    GROUPING_ANALYSIS = "grouping_analysis"
    GROUPING_APPROVED = "grouping_approved"
    GROUPING_REJECTED = "grouping_rejected"
    SCAN = "scan"
    MOVEMENT = "movement"


class UserRole(str, Enum):
    ADMIN = "admin"
    COMMERCIAL_ANALYST = "commercial_analyst"
    WAREHOUSE_OPERATOR = "warehouse_operator"
    EXECUTIVE_READONLY = "executive_readonly"
