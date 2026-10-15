"""Package only tracked public site files for GitHub Pages."""

import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
ASSET_SUFFIXES = {".css", ".js", ".png", ".jpg", ".jpeg", ".svg", ".webp",
                  ".gif", ".ico", ".json", ".md", ".py", ".yaml", ".yml"}


def main():
    destination = Path(sys.argv[1]).resolve() if len(sys.argv) > 1 else ROOT / "_site"
    destination.mkdir(parents=True, exist_ok=False)
    paths = subprocess.check_output(
        ["git", "ls-files", "-z"], cwd=ROOT
    ).decode("utf-8").split("\0")
    count = 0
    for name in filter(None, paths):
        relative = Path(name)
        include = (
            name == ".nojekyll"
            or (relative.suffix == ".html" and
                (len(relative.parts) == 1 or relative.parts[0] == "tutorials"))
            or (relative.parts[0] == "assets" and relative.suffix.lower() in ASSET_SUFFIXES)
        )
        if not include:
            continue
        source = ROOT / relative
        if source.is_symlink() or not source.is_file():
            raise ValueError(f"Not a regular public file: {name}")
        target = destination / relative
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(source, target)
        count += 1
    if not (destination / "index.html").is_file():
        raise ValueError("Missing site entry point")
    print(f"Packaged {count} tracked public files to {destination}")


if __name__ == "__main__":
    main()
