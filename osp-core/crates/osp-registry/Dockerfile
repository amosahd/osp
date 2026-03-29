# ---- Stage 1: Builder ----
FROM rust:1.77-slim AS builder

RUN apt-get update && apt-get install -y pkg-config libssl-dev && rm -rf /var/lib/apt/lists/*

WORKDIR /build

# Copy workspace manifests first for better layer caching
COPY Cargo.toml Cargo.lock ./
COPY crates/osp-crypto/Cargo.toml crates/osp-crypto/Cargo.toml
COPY crates/osp-manifest/Cargo.toml crates/osp-manifest/Cargo.toml
COPY crates/osp-vault/Cargo.toml crates/osp-vault/Cargo.toml
COPY crates/osp-cli/Cargo.toml crates/osp-cli/Cargo.toml
COPY crates/osp-provider/Cargo.toml crates/osp-provider/Cargo.toml
COPY crates/osp-registry/Cargo.toml crates/osp-registry/Cargo.toml
COPY crates/osp-conformance/Cargo.toml crates/osp-conformance/Cargo.toml
COPY crates/osp-sdk/Cargo.toml crates/osp-sdk/Cargo.toml

# Create stub lib.rs files so cargo can resolve the workspace
RUN for dir in crates/osp-crypto crates/osp-manifest crates/osp-vault crates/osp-cli crates/osp-provider crates/osp-registry crates/osp-conformance crates/osp-sdk; do \
        mkdir -p "$dir/src" && echo "" > "$dir/src/lib.rs"; \
    done && \
    # osp-cli needs a main.rs stub
    echo "fn main() {}" > crates/osp-cli/src/main.rs && \
    echo "fn main() {}" > crates/osp-registry/src/main.rs

# Pre-build dependencies (cached layer)
RUN cargo build --release --package osp-registry 2>/dev/null || true

# Copy actual source code
COPY crates/ crates/

# Build the registry binary
RUN cargo build --release --package osp-registry --bin osp-registry

# ---- Stage 2: Runtime ----
FROM debian:bookworm-slim

RUN apt-get update && \
    apt-get install -y --no-install-recommends ca-certificates curl sqlite3 && \
    rm -rf /var/lib/apt/lists/*

# Create non-root user
RUN groupadd --gid 1001 osp && \
    useradd --uid 1001 --gid osp --create-home osp

# Create data directory for SQLite
RUN mkdir -p /data && chown osp:osp /data

COPY --from=builder /build/target/release/osp-registry /usr/local/bin/osp-registry

USER osp

ENV PORT=8080
ENV DATABASE_URL=sqlite:///data/registry.db
ENV RUST_LOG=info

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:8080/health || exit 1

ENTRYPOINT ["osp-registry"]
