import io
from pathlib import Path

from fastapi import UploadFile
from sqlalchemy import func, select

from app.core.db import SessionLocal
from app.models import InventoryItem
from app.services.actors import get_actor_by_email
from app.services.import_service import ensure_master_data, process_import


def main() -> None:
    with SessionLocal() as session:
        ensure_master_data(session)
        count = session.scalar(select(func.count(InventoryItem.id))) or 0
        if count:
            print("Seed skipped: inventory already present.")
            return
        actor = get_actor_by_email(session, "daniela.vargas@agp.demo")
        sample_file = Path(__file__).resolve().parents[3] / "data" / "sample" / "agp_inventory_sample.csv"
        if sample_file.exists():
            upload = UploadFile(filename=sample_file.name, file=io.BytesIO(sample_file.read_bytes()))
            process_import(session, actor, upload, replace_existing=True)
            print(f"Seed completed from {sample_file}.")
            return
        print("Master data ensured. Import sample data through the UI or POST /api/v1/imports.")


if __name__ == "__main__":
    main()
