#!/usr/bin/env python3
"""Generate SVG conformance badges for OSP providers.

Usage examples:

    # Generate a passing Core badge
    python generate_badges.py --level core --output ./out/

    # Generate a failing badge for a named provider
    python generate_badges.py --level core --status fail --provider supabase --output ./out/

    # Generate all example badges
    python generate_badges.py --generate-examples --output ./examples/
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

# Allow running as a script from the badges/ directory.
sys.path.insert(0, str(Path(__file__).parent))

from badge_template import badge_fail, badge_pass  # noqa: E402

VALID_LEVELS = ("core", "webhooks", "events", "escrow", "full")


def generate_badge(
    level: str,
    status: str = "pass",
    provider: str | None = None,
) -> str:
    """Return SVG string for a conformance badge."""
    if level not in VALID_LEVELS:
        raise ValueError(f"Unknown level: {level!r}. Must be one of {VALID_LEVELS}")

    if status == "pass":
        return badge_pass(level, provider=provider)
    else:
        return badge_fail(level, provider=provider)


def generate_examples(output_dir: Path) -> list[Path]:
    """Generate the full set of example badges and return their paths."""
    output_dir.mkdir(parents=True, exist_ok=True)

    examples = [
        ("core", "pass"),
        ("webhooks", "pass"),
        ("events", "pass"),
        ("escrow", "pass"),
        ("full", "pass"),
        ("core", "fail"),
    ]

    paths: list[Path] = []
    for level, status in examples:
        svg = generate_badge(level, status=status)
        filename = f"osp-{level}-{status}.svg"
        path = output_dir / filename
        path.write_text(svg, encoding="utf-8")
        paths.append(path)
        print(f"  Generated {path}")

    return paths


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Generate SVG conformance badges for OSP providers.",
    )
    parser.add_argument(
        "--level",
        choices=VALID_LEVELS,
        help="Conformance level to generate a badge for.",
    )
    parser.add_argument(
        "--provider",
        default=None,
        help="Provider name to include in the badge label.",
    )
    parser.add_argument(
        "--status",
        choices=("pass", "fail"),
        default="pass",
        help="Badge status (default: pass).",
    )
    parser.add_argument(
        "--output",
        default=".",
        help="Output directory for generated SVG files.",
    )
    parser.add_argument(
        "--generate-examples",
        action="store_true",
        help="Generate the full set of example badges.",
    )

    args = parser.parse_args()

    output_dir = Path(args.output)
    output_dir.mkdir(parents=True, exist_ok=True)

    if args.generate_examples:
        print("Generating example badges:")
        generate_examples(output_dir)
        print("Done.")
        return

    if not args.level:
        parser.error("--level is required unless --generate-examples is used.")

    svg = generate_badge(args.level, status=args.status, provider=args.provider)

    suffix = "pass" if args.status == "pass" else "fail"
    if args.provider:
        filename = f"osp-{args.level}-{args.provider}-{suffix}.svg"
    else:
        filename = f"osp-{args.level}-{suffix}.svg"

    path = output_dir / filename
    path.write_text(svg, encoding="utf-8")
    print(f"Generated {path}")


if __name__ == "__main__":
    main()
