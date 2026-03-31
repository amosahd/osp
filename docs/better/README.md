# better-npm x OSP Integration Specs

This directory contains the integration specifications for how better-npm
should interact with OSP for service discovery, provisioning, vault
management, and environment generation.

## Command Specs

### Discovery
- [discover.md](discover.md) — `better discover` command spec
- [discover-filters.md](discover-filters.md) — Category and keyword filters

### Provisioning
- [provision.md](provision.md) — `better provision` command spec
- [provision-paid.md](provision-paid.md) — Free and paid request paths
- [provision-async.md](provision-async.md) — Async polling support

### Vault
- [vault.md](vault.md) — Local encrypted service vault
- [vault-metadata.md](vault-metadata.md) — Provider and rotation metadata
- [vault-migration.md](vault-migration.md) — Migration support

### Services
- [services-list.md](services-list.md) — `better services list` spec
- [services-status.md](services-status.md) — `better services status` spec
- [services-filters.md](services-filters.md) — Provider and environment filters

### Lifecycle
- [rotate.md](rotate.md) — Credential rotation command
- [deprovision.md](deprovision.md) — Provider teardown command
- [safety.md](safety.md) — Active env reference warnings

### Environment
- [env-mapping.md](env-mapping.md) — Provider bundle to env format mapping
- [env-frameworks.md](env-frameworks.md) — Next.js, Vite, generic .env
- [env-rotation.md](env-rotation.md) — Regeneration after credential rotation
