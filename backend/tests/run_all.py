"""
Runs every backend unit test module. Stdlib only — no pytest, no database.

    cd backend && python3 tests/run_all.py
"""
import pathlib
import subprocess
import sys

TESTS = ["tests.test_pricing", "tests.test_seed_data"]
BACKEND = pathlib.Path(__file__).resolve().parent.parent

failed = []
for module in TESTS:
    print(f"\n=== {module} ===")
    if subprocess.run([sys.executable, "-m", module], cwd=BACKEND).returncode != 0:
        failed.append(module)

print()
if failed:
    print(f"{len(failed)} module(s) FAILED: {', '.join(failed)}")
    sys.exit(1)
print("All backend tests passed.")
