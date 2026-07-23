import importlib.util
import subprocess
import sys
from pathlib import Path


def ensure_dependencies() -> None:
    requirements_path = Path(__file__).resolve().with_name("requirements.txt")
    if not requirements_path.is_file():
        return

    missing = []
    for line in requirements_path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        package_name = line.split("=", 1)[0].split(">", 1)[0].split("<", 1)[0].split("[", 1)[0].strip()
        if importlib.util.find_spec(package_name) is None:
            missing.append(line)

    if not missing:
        return

    print(f"Installing missing dependencies from {requirements_path.name}...")
    subprocess.check_call([sys.executable, "-m", "pip", "install", "-r", str(requirements_path)])
    print("Dependency installation completed. Please restart the app.")


ensure_dependencies()
