# ADR 0010: Observability Architecture, Distributed Tracing, and Web Vitals Pipeline

## Status

Accepted

## Date

2026-10-15

## Context

Institutional portfolio and risk surveillance platforms demand sub-second latency, deterministic performance envelopes, and absolute auditability. When institutional portfolio managers monitor high-frequency P&L fluctuations or quantitative risk limit breaches, observability cannot be an afterthought or fragmented across isolated logs.

We require a unified observability architecture covering:

1. **Distributed Tracing & Request Correlation**: Correlating transactions from user interactions in micro-frontends through the Node.js BFF gateway to the Java 21 Core API and PostgreSQL database.
2. **Real-User Monitoring (RUM) & Core Web Vitals**: Ingesting real-world user metrics (Largest Contentful Paint, Interaction to Next Paint, Cumulative Layout Shift) and institutional frontend performance metrics (Time to First Live Update, TanStack Virtual Grid DOM commit duration, and WebSocket reconnect frequency).
3. **Infrastructure & Platform Metrics**: Prometheus scraping and provisioned-as-code Grafana dashboards detailing WebSocket throughput, tick computation latency, JVM heap allocation, HikariCP pool saturation, and risk limit breaches.
4. **Structured JSON Logging**: Machine-readable JSON log formats with consistent correlation IDs across all microservices.

### Evaluated Alternatives

1. **Heavy Distributed Tracing Agents (OpenTelemetry Collector / Jaeger / Zipkin Daemon)**:
   - _Pros_: Full distributed span graph visualization.
   - _Cons_: Significant resource overhead, vendor-specific daemon requirements in local Docker development, and unnecessary complexity for a two-tier microservice architecture.
2. **Ad-Hoc Uncorrelated Console Logging**:
   - _Pros_: Trivial to implement.
   - _Cons_: Impossible to correlate a frontend user error or WebSocket drop with backend stack traces; violates institutional compliance and production audit standards.
3. **Lightweight Distributed Correlation (`X-Correlation-ID`) + Native Prometheus Exporters + BFF RUM Telemetry Gateway (Selected)**:
   - _Distributed Correlation_: A unified `X-Correlation-ID` header injected by the frontend, propagated across BFF and Core API, bound to SLF4J MDC in Java and Pino logger in Node.js.
   - _RUM Telemetry Ingestion_: A lightweight BFF `POST /telemetry` endpoint backed by `prom-client` histograms, receiving Core Web Vitals and frontend metrics via `navigator.sendBeacon` and `keepalive: true` fetch calls.
   - _Provisioned Grafana_: Grafana dashboards defined strictly in JSON files under source control (`infra/docker/grafana/provisioning/dashboards/foliolive-overview.json`) with zero manual UI configuration.

## Decision

We implement a three-tiered observability architecture:

### 1. Distributed Correlation ID Propagation (`X-Correlation-ID`)

- **Frontend Shell (`apps/shell/src/telemetry/correlation.ts`)**:
  - Global `window.fetch` interceptor automatically attaches an `X-Correlation-ID` header (UUID v4) to every outgoing HTTP request.
  - Maintains a session-level correlation ID in `sessionStorage` for tying user browser sessions to backend audit events.
- **Node.js BFF Gateway (`services/bff/src/server.ts`)**:
  - Express correlation ID middleware extracts incoming `X-Correlation-ID` or generates a fresh UUID.
  - Echoes `X-Correlation-ID` in HTTP response headers and CORS `exposedHeaders`.
  - Attaches `correlationId` to the Pino `httpLogger` context via `customProps`, ensuring all structured JSON logs include `{"correlationId":"..."}`.
  - Forwards `X-Correlation-ID` when communicating with downstream Core API services.
- **Core Domain API (`services/core-api/src/main/java/com/foliolive/core/config/CorrelationIdFilter.java`)**:
  - Spring `OncePerRequestFilter` intercepts all incoming requests before Spring Security.
  - Populates SLF4J `MDC` with key `correlationId` and attaches the header to the `HttpServletResponse`.
  - Clears `MDC` in a `finally` block to prevent thread pool pollution.
  - Outputs structured JSON logs via `logback-spring.xml`.

### 2. Frontend RUM & Core Web Vitals Ingestion

- **Shell Telemetry Reporter (`apps/shell/src/telemetry/web-vitals.ts`)**:
  - Leverages Google's `web-vitals` library to capture `LCP`, `INP`, and `CLS`.
  - Custom metrics:
    - `timeToFirstLiveUpdateMs`: Duration from socket initialization to the first decoded price tick or portfolio batch.
    - `gridRenderDurationMs`: High-resolution DOM commit and layout duration for 500 to 10,000-row virtual grid renders.
    - `wsReconnectCount`: Reconnection attempt counter with exponential backoff telemetry.
  - Dispatches to `${BFF_URL}/telemetry` using `navigator.sendBeacon` with fallback to `fetch(..., { keepalive: true })`.
- **BFF Telemetry Router & Prometheus Exporter (`services/bff/src/metrics.ts`)**:
  - Exposes `/telemetry` endpoint validating payloads via Zod.
  - Ingests measurements into Prometheus histograms:
    - `foliolive_web_vitals_lcp_seconds`
    - `foliolive_web_vitals_inp_seconds`
    - `foliolive_web_vitals_cls`
    - `foliolive_frontend_time_to_first_live_update_seconds`
    - `foliolive_frontend_grid_render_duration_seconds`
    - `foliolive_frontend_ws_reconnects_total`

### 3. Risk Surveillance & Real-Time Engine Observability

- Real-time limit breach events increment `foliolive_alerts_breach_total{severity, type}`.
- Active unacknowledged alert counts are tracked in `foliolive_active_alerts_total{severity}`.
- Simulator tick computation duration is tracked in `foliolive_bff_tick_duration_seconds` (p99 < 1ms).

### 4. Dashboards as Code

- Dashboard provisioned at `infra/docker/grafana/provisioning/dashboards/foliolive-overview.json`.
- Visual preview archived in `docs/screenshots/10-grafana-observability-dashboard.png`.

## Consequences

### Positive

- Complete request lifecycle visibility from frontend interaction to database execution.
- Real-user performance visibility without third-party SaaS tracking costs or privacy leaks.
- Zero manual dashboard drift: changes to Grafana panels are versioned in Git.
- Immediate breach detection with live Grafana threshold alerting.

### Negative / Trade-Offs

- Telemetry ingestion introduces modest network traffic (~1-2KB per session), mitigated by sendBeacon batching and non-blocking background dispatch.
