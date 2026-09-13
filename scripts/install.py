#!/usr/bin/env python3
"""Install the complete Nexus-NAA Skill into a supported Agent directory."""

from __future__ import annotations

import argparse
import shutil
from datetime import datetime
from pathlib import Path

SKILL_NAME = "nexus-naa"
SKILL_ROOT = Path(__file__).resolve().parent.parent
USER_ROOTS = {
    "codex": Path.home() / ".agents" / "skills",
    "claude": Path.home() / ".claude" / "skills",
    "workbuddy": Path.home() / ".workbuddy" / "skills",
    "codebuddy": Path.home() / ".codebuddy" / "skills",
    "qoder": Path.home() / ".qoder" / "skills",
    "zcode": Path.home() / ".zcode" / "skills",
    "deepseek-harness": Path.home() / ".dsh" / "skills",
}
PROJECT_ROOTS = {
    "codex": Path(".agents") / "skills",
    "claude": Path(".claude") / "skills",
    "workbuddy": Path(".workbuddy") / "skills",
    "codebuddy": Path(".codebuddy") / "skills",
    "qoder": Path(".qoder") / "skills",
    "zcode": Path(".agents") / "skills",
    "deepseek-harness": Path(".dsh") / "skills",
}
ALIASES = {"deepseek": "deepseek-harness", "harness": "deepseek-harness"}
IGNORED = shutil.ignore_patterns(
    ".git", ".runtime", ".review", "node_modules", "coverage", "exports",
    "__pycache__", "*.pyc", "*.log", ".env", ".env.*",
)


def copy_skill(destination: Path, force: bool) -> Path:
    source = SKILL_ROOT.resolve()
    destination = destination.resolve()
    if destination == source or source in destination.parents:
        raise ValueError("安装目标不能是源码目录本身或其子目录。")
    if destination.exists():
        if not force:
            raise FileExistsError(f"目标已存在：{destination}；使用 --force 可先备份再替换。")
        stamp = datetime.now().strftime("%Y%m%d-%H%M%S")
        backup = destination.with_name(f"{destination.name}.backup-{stamp}")
        sequence = 1
        while backup.exists():
            backup = destination.with_name(f"{destination.name}.backup-{stamp}-{sequence}")
            sequence += 1
        destination.rename(backup)
        print(f"Backed up: {backup}")
    destination.parent.mkdir(parents=True, exist_ok=True)
    shutil.copytree(source, destination, ignore=IGNORED)
    return destination


def main() -> int:
    choices = [*USER_ROOTS, *ALIASES, "all"]
    parser = argparse.ArgumentParser(description="Install Nexus-NAA as an Agent Skill.")
    parser.add_argument("--tool", choices=choices, default="all")
    parser.add_argument("--scope", choices=["user", "project"], default="user")
    parser.add_argument("--project-root", type=Path, default=Path.cwd())
    parser.add_argument("--force", action="store_true", help="Back up and replace an existing installation.")
    args = parser.parse_args()
    selected = ALIASES.get(args.tool, args.tool)
    tools = list(USER_ROOTS) if selected == "all" else [selected]
    seen: set[Path] = set()
    for tool in tools:
        base = USER_ROOTS[tool] if args.scope == "user" else args.project_root.resolve() / PROJECT_ROOTS[tool]
        destination = (base / SKILL_NAME).resolve()
        if destination in seen:
            continue
        seen.add(destination)
        print(f"Installed: {copy_skill(destination, args.force)}")
    print("Restart or reload the Agent if the Skill does not appear immediately.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
