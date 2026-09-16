#!/usr/bin/env python3
from __future__ import annotations

import importlib.util
from pathlib import Path


HERE = Path(__file__).resolve().parent
BUILD = HERE / "build-chest-assets-v2.py"
spec = importlib.util.spec_from_file_location("chest_builder_v2", BUILD)
module = importlib.util.module_from_spec(spec)
assert spec.loader is not None
spec.loader.exec_module(module)

validator = module.load_v1_validator()
rows = validator.validation_rows()
validator.validate_exact(rows)
validator.write_reports(rows)
print(f"PASS: {len(rows)} WebP files validated")
