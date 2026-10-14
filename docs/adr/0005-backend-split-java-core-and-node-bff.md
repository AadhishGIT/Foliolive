# ADR 0005: Backend Split: Java Spring Boot Core API + Node.js BFF

## Status

Accepted

## Context

The platform requires two distinct backend workloads:

1. **Core Institutional Business Logic**: ACID transactions, portfolio ledger integrity, regulatory compliance limits, audit trails, and complex relational modeling with PostgreSQL.
2. **Real-Time Gateway & Client Orchestration (BFF)**: Low-overhead WebSocket connection management, high-frequency JSON streaming, client-specific API aggregation, authentication facade, and market simulation.

We evaluated:

- **Single Monolithic Spring Boot Backend**: Can handle WebSockets via STOMP/SockJS and business logic, but Spring WebSocket STOMP adds significant protocol abstraction overhead, makes high-frequency JSON streaming cumbersome to pair with TypeScript types, and creates tight coupling between client UI data requirements and enterprise domain models.
- **Single Node.js Backend**: Fast for WebSockets and I/O, but lacks Spring Boot's mature enterprise ecosystem (Spring Security JWT resource servers, Spring Data JPA, Hibernate, robust Flyway migrations, and institutional Java math libraries).
- **Two-Tier Architecture (Java Core API + Node.js BFF Gateway)**: The industry standard pattern for tier-1 financial and fintech architectures.

## Decision

We choose the **Split Backend Architecture**:

1. **Core API (`services/core-api`)**:
   - Built with **Java 21 + Spring Boot 3**.
   - Responsible for transactional persistence, Spring Security JWT authentication resource server, Flyway database migrations, and PostgreSQL data access via Spring Data JPA.
   - Provides OpenAPI/Swagger specifications for strict contract generation.
   - Exposes Actuator and Micrometer Prometheus metrics.
2. **BFF / Real-Time Gateway (`services/bff`)**:
   - Built with **Node.js 20 + TypeScript + Express + `ws`**.
   - Acts as the client-facing gateway (Reverse Proxy, JWT issuance, rate limiting, security headers via Helmet).
   - Manages WebSocket sessions, runs the deterministic Geometric Brownian Motion market simulator, and broadcasts live telemetry.
   - Shares TypeScript types directly with frontends via `@foliolive/shared-types`.

## Consequences

### Positive

- Separation of concerns: transactional stability in Java; real-time event-driven responsiveness in Node.js.
- Strong typing end-to-end: TypeScript contracts shared seamlessly between BFF and frontend apps.
- Enterprise readiness: Spring Security and JPA provide rock-solid auditability and data integrity.
- Independent scaling: The BFF can scale horizontally to handle thousands of concurrent client WebSocket connections without putting pressure on the transactional database pool.

### Negative / Tradeoffs

- Multi-runtime operations: Requires maintaining both Java (JVM) and Node.js toolchains in development and CI/CD.
- Network hop between BFF and Core API; mitigated by co-locating services in Docker Compose or AWS VPC private subnets.
