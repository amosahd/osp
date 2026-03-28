# Contributing to OSP

Thank you for your interest in contributing to the Open Service Protocol! OSP is developed in the open and welcomes contributions from anyone.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [How to Contribute](#how-to-contribute)
- [Service Improvement Proposals (SIPs)](#service-improvement-proposals-sips)
- [Pull Request Guidelines](#pull-request-guidelines)
- [Development Setup](#development-setup)
- [Repository Areas](#repository-areas)
- [Style Guide](#style-guide)
- [License](#license)

## Code of Conduct

This project follows the [Contributor Covenant Code of Conduct](https://www.contributor-covenant.org/version/2/1/code_of_conduct/). By participating, you are expected to uphold this code. Please report unacceptable behavior by opening an issue.

## How to Contribute

There are many ways to contribute to OSP:

- **Report bugs** in the specification or schemas by opening a GitHub Issue
- **Suggest improvements** by starting a GitHub Discussion
- **Submit fixes** for documentation, schemas, or reference implementations via Pull Requests
- **Propose protocol changes** through the SIP process (see below)
- **Write conformance tests** to improve protocol coverage
- **Build reference implementations** in additional languages

## Service Improvement Proposals (SIPs)

Protocol-level changes to OSP go through the **Service Improvement Proposal (SIP)** process. This ensures changes are well-considered and community-reviewed before being adopted.

### SIP Process

1. **Discussion**: Start a GitHub Discussion in the "SIPs" category describing the problem you want to solve and your proposed approach.
2. **Draft**: Once there is rough consensus that the problem is worth solving, create a formal SIP document as a Pull Request to `spec/sips/`.
3. **Review**: The community and maintainers review the SIP. Expect iteration — most SIPs go through multiple rounds of feedback.
4. **Acceptance**: Once approved by at least two maintainers, the SIP is merged and the corresponding spec/schema changes can be implemented.
5. **Implementation**: Submit PRs to update the spec, schemas, reference implementations, and conformance tests.

### SIP Template

```markdown
# SIP-XXXX: Title

## Summary
One-paragraph description of the proposal.

## Motivation
Why is this change needed? What problem does it solve?

## Specification
Detailed technical specification of the proposed change.

## Backwards Compatibility
How does this affect existing implementations?

## Security Considerations
Any security implications of the proposal.

## Reference Implementation
Link to a proof-of-concept implementation (if available).
```

### What Requires a SIP?

- New endpoints or protocol operations
- Changes to existing message formats
- New required fields in schemas
- Changes to the security model
- Changes to the discovery mechanism

### What Does NOT Require a SIP?

- Bug fixes in the specification text
- Clarifications to existing language
- New optional fields with sensible defaults
- Documentation improvements
- Reference implementation changes that don't affect the protocol
- New conformance tests for existing behavior

## Pull Request Guidelines

### Before Submitting

1. **Check existing issues and PRs** to avoid duplicating work.
2. **Open an issue first** for significant changes to discuss the approach.
3. **Fork the repository** and create a feature branch from `main`.

### PR Requirements

- **One concern per PR**: Keep pull requests focused on a single change.
- **Write descriptive titles**: Use a clear, concise title that describes what the PR does.
- **Include context in the description**: Explain *why* the change is needed, not just *what* changed.
- **Update tests**: If you change schemas or the spec, update conformance tests accordingly.
- **Update documentation**: If your change affects how providers or agents interact with the protocol, update the relevant docs.

### Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <description>

[optional body]

[optional footer(s)]
```

Types: `feat`, `fix`, `docs`, `schema`, `test`, `refactor`, `chore`

Scopes: `spec`, `schemas`, `ts-sdk`, `py-sdk`, `conformance`, `docs`

Examples:
```
feat(spec): add credential rotation endpoint
fix(schemas): correct provision-response required fields
docs(agents): clarify async provisioning flow
test(conformance): add tests for error response codes
```

### Review Process

1. All PRs require at least one maintainer approval.
2. Protocol changes (spec, schemas) require two maintainer approvals.
3. CI must pass (schema validation, conformance tests, linting).
4. Maintainers may request changes — this is normal and expected.

## Development Setup

### Prerequisites

- Node.js 20+ (for TypeScript reference implementation and schema validation)
- Python 3.11+ (for Python reference implementation and conformance tests)
- [ajv-cli](https://github.com/ajv-validator/ajv-cli) (for JSON Schema validation)

### Getting Started

```bash
# Clone the repository
git clone https://github.com/sardis-project/osp.git
cd osp

# Validate schemas
cd schemas && npm install && npm test

# Run TypeScript reference implementation tests
cd reference-implementation/typescript && npm install && npm test

# Run Python reference implementation tests
cd reference-implementation/python && pip install -e ".[dev]" && pytest

# Run conformance tests
cd conformance-tests && pip install -r requirements.txt && pytest
```

## Repository Areas

### `spec/`

The protocol specification. Changes here define what OSP *is*. Be precise with language — use RFC 2119 keywords (MUST, SHOULD, MAY) deliberately.

### `schemas/`

JSON Schema definitions (draft 2020-12). All schemas must:
- Validate against the JSON Schema meta-schema
- Include `$id`, `title`, and `description`
- Include `examples` for all non-trivial types
- Be referenced from the specification

### `reference-implementation/`

Reference implementations in TypeScript and Python. These serve as both documentation and validation of the spec. They should:
- Implement the full protocol
- Be well-documented with inline comments
- Follow idiomatic patterns for the language
- Include unit tests

### `conformance-tests/`

Tests that any OSP provider or agent implementation can run to verify compliance. These should:
- Test all MUST requirements from the spec
- Test common SHOULD recommendations
- Provide clear pass/fail output
- Be runnable against any HTTP endpoint

### `docs/`

Human-readable documentation. Keep it practical and example-driven.

### `examples/`

End-to-end examples showing real-world usage of OSP. Each example should include a README explaining what it demonstrates.

## Style Guide

### Specification

- Use [RFC 2119](https://www.rfc-editor.org/rfc/rfc2119) keywords precisely
- Write in present tense
- Be explicit about error conditions
- Include examples for every endpoint

### JSON Schemas

- Use `camelCase` for property names within schemas
- Use `snake_case` for file names
- Every schema file must end with `.schema.json`
- Include `$schema`, `$id`, `type`, `title`, `description`, and `properties`

### TypeScript

- Follow the project's ESLint + Prettier configuration
- Use strict TypeScript (`strict: true`)
- Prefer interfaces over type aliases for object shapes
- Export all public types

### Python

- Follow PEP 8
- Use type hints throughout
- Use Pydantic models for all protocol types
- Format with `black` and lint with `ruff`

## License

By contributing to OSP, you agree that your contributions will be licensed under the [Apache License 2.0](LICENSE).
