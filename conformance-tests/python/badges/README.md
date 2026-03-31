# OSP Conformance Badges

Generate shields.io-style SVG badges for OSP conformance test results.

## Usage

Generate a single badge:

```bash
python generate_badges.py --level core --provider supabase --output ./badges/
```

Generate a failing badge:

```bash
python generate_badges.py --level core --status fail --output ./badges/
```

Generate all example badges:

```bash
python generate_badges.py --generate-examples --output ./examples/
```

## Conformance Levels

| Level      | Badge Color | Description                                 |
|------------|-------------|---------------------------------------------|
| `core`     | Green       | All 8 mandatory endpoints (6.1-6.8)        |
| `paid-core`| Green       | Core + paid provisioning + idempotent retry |
| `webhooks` | Green       | Core + webhook management + delivery        |
| `events`   | Green       | Core + audit event stream                   |
| `escrow`   | Green       | Core + escrow profiles and integration      |
| `full`     | Blue        | Core + Webhooks + Events + Escrow + extras  |

Failed badges are always red regardless of level.

## Automatic Badge Generation

The pytest plugin in `conftest.py` auto-generates badges after test runs.
Use the `--badge-output` flag:

```bash
pytest conformance-tests/python/ --badge-output ./badges/
```

## Badge Examples

Pre-generated example badges are in the `examples/` directory:

- `osp-core-pass.svg` -- Core conformance passing
- `osp-webhooks-pass.svg` -- Webhooks conformance passing
- `osp-events-pass.svg` -- Events conformance passing
- `osp-escrow-pass.svg` -- Escrow conformance passing
- `osp-full-pass.svg` -- Full conformance passing (blue)
- `osp-core-fail.svg` -- Core conformance failing (red)

## Integration

Embed a badge in Markdown:

```markdown
![OSP Conformance](https://your-ci.example.com/badges/osp-core-pass.svg)
```

## No External Dependencies

All badge generation uses Python standard library only. No `pip install` required.
