"""SVG badge templates for OSP conformance badges.

Generates shields.io-style SVG badges with configurable text, colors,
and widths. No external dependencies -- uses Python standard library only.
"""

# Color palette
COLOR_GREEN = "#22c55e"   # Passing (core, webhooks, events, escrow)
COLOR_RED = "#ef4444"     # Failing
COLOR_BLUE = "#4f6df0"    # Full conformance
COLOR_LABEL_BG = "#555"   # Left side (label) background


def _text_width(text: str) -> int:
    """Estimate pixel width for a string rendered at ~11px Verdana.

    This uses a simple per-character average that closely matches
    shields.io badge rendering.  Good enough for badge sizing without
    pulling in a font metrics library.
    """
    wide = set("WMQOCDG")
    narrow = set("iljt!|:;.,1 ")
    width = 0
    for ch in text:
        if ch in wide:
            width += 9
        elif ch in narrow:
            width += 4
        elif ch.isupper():
            width += 7.5
        else:
            width += 6.5
    return int(width) + 10  # padding


def render_badge(
    label: str,
    message: str,
    color: str,
    label_color: str = COLOR_LABEL_BG,
) -> str:
    """Render a shields.io-style flat SVG badge.

    Parameters
    ----------
    label : str
        Left side text (e.g. "OSP").
    message : str
        Right side text (e.g. "Core ✓").
    color : str
        Hex color for the right side background.
    label_color : str
        Hex color for the left side background.

    Returns
    -------
    str
        Complete SVG document as a string.
    """
    label_w = _text_width(label)
    message_w = _text_width(message)
    total_w = label_w + message_w

    label_x = label_w / 2
    message_x = label_w + message_w / 2

    return f"""<svg xmlns="http://www.w3.org/2000/svg" width="{total_w}" height="20" role="img" aria-label="{label}: {message}">
  <title>{label}: {message}</title>
  <linearGradient id="s" x2="0" y2="100%">
    <stop offset="0" stop-color="#bbb" stop-opacity=".1"/>
    <stop offset="1" stop-opacity=".1"/>
  </linearGradient>
  <clipPath id="r">
    <rect width="{total_w}" height="20" rx="3" fill="#fff"/>
  </clipPath>
  <g clip-path="url(#r)">
    <rect width="{label_w}" height="20" fill="{label_color}"/>
    <rect x="{label_w}" width="{message_w}" height="20" fill="{color}"/>
    <rect width="{total_w}" height="20" fill="url(#s)"/>
  </g>
  <g fill="#fff" text-anchor="middle" font-family="Verdana,Geneva,DejaVu Sans,sans-serif" text-rendering="geometricPrecision" font-size="11">
    <text aria-hidden="true" x="{label_x}" y="15" fill="#010101" fill-opacity=".3">{label}</text>
    <text x="{label_x}" y="14">{label}</text>
    <text aria-hidden="true" x="{message_x}" y="15" fill="#010101" fill-opacity=".3">{message}</text>
    <text x="{message_x}" y="14">{message}</text>
  </g>
</svg>
"""


def badge_pass(level: str, provider: str | None = None) -> str:
    """Generate a passing conformance badge for the given level.

    Parameters
    ----------
    level : str
        One of: core, webhooks, events, escrow, full.
    provider : str or None
        Optional provider name to include in the label.
    """
    level_lower = level.lower()
    label = f"OSP {provider}" if provider else "OSP"
    display = level.capitalize()

    if level_lower == "full":
        color = COLOR_BLUE
    else:
        color = COLOR_GREEN

    message = f"{display} \u2713"
    return render_badge(label, message, color)


def badge_fail(level: str, provider: str | None = None) -> str:
    """Generate a failing conformance badge for the given level.

    Parameters
    ----------
    level : str
        One of: core, webhooks, events, escrow, full.
    provider : str or None
        Optional provider name to include in the label.
    """
    label = f"OSP {provider}" if provider else "OSP"
    message = "Failed"
    return render_badge(label, message, COLOR_RED)
