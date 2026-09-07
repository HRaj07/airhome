"""
Runs every backend test module.

The first two are stdlib-only — pure logic and the seed's row builders, no
database, no pytest — so they run under any Python. The third boots the real
app against the seeded database and needs the project's dependencies; it is
skipped with a note when they aren't installed, rather than failing the run.

    cd backend && python3 tests/run_all.py          # the dependency-free suites
    cd backend && ./.venv/bin/python tests/run_all.py   # all three
"""
import importlib.util
import pathlib
import subprocess
import sys

PURE = ["tests.test_pricing", "tests.test_seed_data"]
NEEDS_APP = ["tests.test_api"]
BACKEND = pathlib.Path(__file__).resolve().parent.parent

failed = []
for module in PURE:
    print(f"\n=== {module} ===")
    if subprocess.run([sys.executable, "-m", module], cwd=BACKEND).returncode != 0:
        failed.append(module)

app_ready = all(importlib.util.find_spec(m) is not None for m in ("fastapi", "sqlalchemy", "httpx"))
for module in NEEDS_APP:
    if not app_ready:
        print(f"\n=== {module} (skipped) ===")
        print("Needs the app's dependencies. Run with the project venv:")
        print("  ./.venv/bin/python tests/run_all.py     (pip install -r requirements.txt first)")
        continue
    print(f"\n=== {module} ===")
    if subprocess.run([sys.executable, "-m", module], cwd=BACKEND).returncode != 0:
        failed.append(module)

print()
if failed:
    print(f"{len(failed)} module(s) FAILED: {', '.join(failed)}")
    sys.exit(1)
print("All backend tests passed.")
