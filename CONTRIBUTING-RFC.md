# RFC Process for OSP Protocol Changes

This document describes the formal RFC (Request for Comments) process for proposing changes to the Open Service Protocol. For general contribution guidelines, see [CONTRIBUTING.md](CONTRIBUTING.md).

## When Is an RFC Required?

An RFC is required for:

- New protocol endpoints or operations
- Changes to existing message formats or schemas
- New required fields in any protocol object
- Changes to the security model (signing, encryption, nonce handling)
- Changes to the discovery mechanism (`.well-known/osp.json` format)
- New conformance requirements
- Changes to the versioning or negotiation scheme

An RFC is **not** required for:

- Bug fixes in specification text
- Clarifications to existing language
- New optional fields with sensible defaults
- Documentation improvements
- Reference implementation changes that don't affect the protocol
- New conformance tests for existing behavior

## RFC Lifecycle

```
Draft --> Review --> Accepted/Rejected --> Implemented
```

### 1. Draft

The author opens a Pull Request to `spec/rfcs/` with a new file named `RFC-XXXX-short-title.md` using the template below. The PR title must begin with `RFC:`.

At this stage, the RFC is a proposal. It does not need to be perfect -- its purpose is to start a structured conversation.

**Requirements to enter Draft:**
- Follows the RFC template completely
- Has a clear problem statement
- Includes at least one concrete design option

### 2. Review

Once submitted, the RFC enters community review:

- **Minimum review period:** 14 days for minor changes, 30 days for major changes (new endpoints, security model changes, breaking changes).
- **Maintainers** are responsible for triaging and labeling the RFC (`rfc:minor` or `rfc:major`).
- **Community members** provide feedback via PR review comments.
- The author iterates on the RFC based on feedback. Each revision should be a new commit, not a force-push, to preserve review history.
- Maintainers may request changes, ask for benchmarks, or require a proof-of-concept implementation.

### 3. Accepted or Rejected

**Acceptance criteria:**
- Minor RFCs: Approval from at least **2 maintainers**.
- Major RFCs: Approval from at least **3 maintainers** plus no unresolved objections from any maintainer during a 7-day final comment period.
- Community vote may be called for contentious changes. A simple majority of participating voters is required, with a minimum quorum of 5 votes.

**Rejection:** An RFC may be rejected if:
- The problem is out of scope for OSP
- The design introduces unacceptable security risks
- There is no consensus after extended discussion
- The author abandons the RFC (no activity for 60 days)

Rejected RFCs are merged into `spec/rfcs/rejected/` for historical reference.

### 4. Implemented

Once accepted, the RFC is merged into `spec/rfcs/`. The author or another contributor then submits follow-up PRs to:

1. Update `spec/osp-v1.0.md` (or the relevant version)
2. Update JSON schemas in `schemas/`
3. Update reference implementations in `reference-implementation/`
4. Add conformance tests in `conformance-tests/`

The RFC is considered fully implemented when all follow-up PRs are merged and the conformance test suite passes.

## RFC Template

```markdown
# RFC-XXXX: Title

**Author:** [Your Name / GitHub handle]
**Status:** Draft
**Created:** YYYY-MM-DD
**Updated:** YYYY-MM-DD
**Discussion:** [Link to GitHub PR]

## Summary

One paragraph explaining the proposal at a high level.

## Motivation

Why is this change needed? What problem does it solve? What use cases does it enable?

Include concrete examples where the current protocol is insufficient.

## Detailed Design

The technical specification of the proposed change. This section should be detailed
enough that someone could implement it from this description alone.

Include:
- New or modified protocol objects (with field tables)
- New or modified endpoints (with request/response examples)
- New or modified JSON schemas
- Sequence diagrams for complex flows
- Error handling behavior

## Alternatives Considered

What other designs were considered and why were they rejected?

For each alternative, explain:
- The approach
- Its advantages
- Why it was not chosen

## Backwards Compatibility

How does this change affect existing implementations?

- Does it break existing agents? Existing providers?
- Can it be introduced as a minor version bump (1.0 -> 1.1), or does it require a major version (2.0)?
- What is the migration path for existing implementations?
- Is there a deprecation period for replaced functionality?

## Security Implications

Analyze the security impact of this proposal:

- Does it introduce new attack vectors?
- Does it change the trust model?
- Does it affect credential handling?
- What mitigations are proposed for any new risks?
- Reference relevant entries from the OSP threat model (spec Section 8.10)
```

## Versioning Policy

OSP follows [Semantic Versioning](https://semver.org/) for the protocol specification:

- **Patch (1.0.x):** Typo fixes, clarifications that don't change behavior. No RFC required.
- **Minor (1.x.0):** New optional features, new optional fields, new RECOMMENDED behaviors. Minor RFC required. Backward compatible -- a v1.1 provider MUST accept v1.0 requests.
- **Major (x.0.0):** Breaking changes to required fields, removed endpoints, changed security model. Major RFC required. Providers SHOULD support the previous major version for at least 12 months.

### Breaking Change Policy

A change is considered breaking if it:

- Removes or renames a required field
- Changes the semantics of an existing required field
- Removes an endpoint
- Changes the authentication or signing scheme
- Makes a previously optional field required

Breaking changes **always** require a new major version and a major RFC with:

- A 30-day minimum review period
- 3+ maintainer approvals
- A documented migration guide
- A minimum 12-month overlap period where both versions are supported

## Who Reviews?

### Maintainers

Current maintainers are listed in the repository's [CODEOWNERS](.github/CODEOWNERS) file. Maintainers are responsible for:

- Triaging and labeling RFCs
- Providing technical review
- Making accept/reject decisions
- Ensuring security implications are fully considered

### Community

Anyone can comment on an RFC. Community input is especially valued for:

- Real-world use cases that validate or challenge the proposal
- Implementation experience from providers or agent developers
- Security review from domain experts
- Accessibility and internationalization concerns

### Subject Matter Experts

For RFCs touching specific areas, maintainers may request review from:

- **Cryptography changes:** At least one reviewer with cryptographic engineering experience
- **Payment method additions:** Review from the relevant payment protocol maintainers
- **Agent identity changes:** Review from identity/attestation system maintainers

## Process for Urgent Security Fixes

Security vulnerabilities that require protocol changes bypass the normal RFC timeline:

1. Report the vulnerability privately via the project's security policy.
2. Maintainers assess severity and draft a fix RFC.
3. The RFC is reviewed by maintainers only (not public) until a fix is available.
4. Once a fix is ready, the RFC is published simultaneously with the patched spec version.
5. Minimum review period is waived, but at least 2 maintainer approvals are still required.
