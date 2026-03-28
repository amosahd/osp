# OSP (Open Service Protocol)

## Overview
Open standard for AI agents to discover, provision, and manage developer services.

## Repository Structure
- spec/ — Protocol specification (osp-v1.0.md)
- schemas/ — JSON Schema definitions (draft 2020-12)
- reference-implementation/ — TypeScript and Python reference code
- conformance-tests/ — Provider and agent conformance test suites
- docs/ — Documentation
- examples/ — End-to-end examples

## Key Decisions
- Payment-rail agnostic: OSP does NOT define how payment happens
- Ed25519 for all signatures and credential encryption
- Provider self-registration via .well-known/osp.json
- Apache 2.0 license

## Development
- Schemas: JSON Schema draft 2020-12
- TypeScript reference: uses @modelcontextprotocol/sdk patterns
- Python reference: uses FastAPI + Pydantic
- Conformance tests: pytest (Python) + vitest (TypeScript)
