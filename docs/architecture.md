# Foliolive: Architecture & System Design

## 1. Executive Summary

Foliolive is an institutional-grade, real-time portfolio management and risk analytics web platform. It enables institutional portfolio managers, chief risk officers (CROs), and quantitative analysts to monitor live holdings, dynamic P&L updates, and multi-factor risk metrics (Value at Risk - VaR, Expected Shortfall, factor exposures, concentration indices) with sub-second latency and automated limit-breach detection.

The system is built on modern distributed principles: a Micro-Frontend (MFE) architecture using Module Federation over Vite, an aggregated Backend-for-Frontend (BFF) streaming gateway in Node.js/TypeScript, an enterprise Java 21 / Spring Boot 3 Core Domain API backed by PostgreSQL 16, and an observability pipeline powered by Prometheus, Grafana, and Core Web Vitals.

---

## 2. High-Level System Architecture

```mermaid
flowchart TD
    subgraph ClientLayer["Frontend Architecture (Micro-Frontends via Vite Module Federation)"]
        Shell["Host Shell (Port 3000)<br/>• Layout & Top Navigation<br/>• Global Auth & Session<br/>• Redux Store & Routing<br/>• Web Vitals Telemetry"]
        PortfolioMFE["Portfolio MFE (Port 3001)<br/>• Holdings Matrix<br/>• TanStack Virtual Grid<br/>• P&L Summary Aggregates<br/>• Asset Allocation"]
        RiskMFE["Risk MFE (Port 3002)<br/>• Parametric/Historical/MC VaR<br/>• Expected Shortfall (CVaR)<br/>• Concentration & Stress Tests<br/>• D3 Risk Surface Visuals"]
        AlertsMFE["Alerts MFE (Port 3003)<br/>• Risk Limit Policy Rules<br/>• Live Breach Audit Feed<br/>• Acknowledgment Flow"]
        SharedUI["@foliolive/ui<br/>Shared Design System & Radix Primitives"]
        RTClient["@foliolive/realtime-client<br/>Resilient WebSocket Client"]
    end

    subgraph GatewayLayer["Real-Time Gateway & Aggregation Layer"]
        BFF["BFF / Realtime Gateway (Port 4000)<br/>Node.js 20 + Express + ws<br/>• JWT Authentication & Issuance<br/>• Deterministic Market Simulator (GBM)<br/>• WebSocket Client Session Manager<br/>• Aggregated REST Endpoints<br/>• Prometheus Metrics Endpoint (/metrics)"]
    end

    subgraph CoreBackendLayer["Enterprise Domain Core"]
        CoreAPI["Core Domain API (Port 8080)<br/>Java 21 + Spring Boot 3<br/>• Spring Security JWT Resource Server<br/>• Spring Data JPA & Validation<br/>• Flyway Database Migrations<br/>• Spring Boot Actuator & Micrometer"]
        Postgres[("PostgreSQL 16 (Port 5432)<br/>• Portfolios & Holdings<br/>• Risk Limit Policies<br/>• Alert Breach Audit Logs<br/>• User Credentials & Roles")]
    end

    subgraph ObservabilityLayer["Observability & Telemetry"]
        Prometheus["Prometheus (Port 9090)<br/>Scrapes Core API & BFF Metrics"]
        Grafana["Grafana (Port 3100)<br/>Real-Time Dashboards & Alerts"]
    end

    Shell -->|Loads Remote Module| PortfolioMFE
    Shell -->|Loads Remote Module| RiskMFE
    Shell -->|Loads Remote Module| AlertsMFE
    PortfolioMFE -.-> SharedUI
    RiskMFE -.-> SharedUI
    AlertsMFE -.-> SharedUI
    Shell --> RTClient

    RTClient <==>|Bidirectional WebSocket (/ws)| BFF
    Shell ==>|REST / Auth API| BFF

    BFF ==>|Internal REST API| CoreAPI
    CoreAPI ==>|JDBC Pool (HikariCP)| Postgres

    Prometheus -->|Scrapes /actuator/prometheus| CoreAPI
    Prometheus -->|Scrapes /metrics| BFF
    Grafana -->|Queries| Prometheus
```

---

## 3. Data Flow Architecture

### 3.1 Real-Time Market Tick & P&L Pipeline

1. **Simulation Source**: The BFF runs an in-memory, deterministic Market Simulator initialized with a fixed seed (`SIMULATION_SEED=42`). It generates tick events using Geometric Brownian Motion (GBM) with asset-specific drift and annualized volatility parameters.
2. **WebSocket Broadcast**: Active WebSocket connections receive typed `TICK` messages.
3. **Frontend Ingestion**: The `@foliolive/realtime-client` package ingests raw tick messages, validates message schemas, and triggers registered subscriber callbacks.
4. **Virtual Grid Update**: The Portfolio MFE receives mark updates and computes live unrealized P&L and daily return percentages with batched state transitions to avoid DOM thrashing.

### 3.2 Risk Limit Evaluation & Alerting Pipeline

1. **Tick Processing**: When simulated market prices fluctuate beyond safety envelopes or portfolio VaR calculations exceed defined policy caps, breach conditions are triggered.
2. **Alert Event Dispatch**: The BFF emits an `ALERT_FIRED` message down the WebSocket connection to all subscribed managers.
3. **Action & Audit**: The Alerts MFE highlights the breach in high-contrast red/amber styling, increments unacknowledged alert counters, and records acknowledgment events back to the backend.

### 3.3 Core REST & Transactional Data

1. **User Authentication**: Client sends credentials to BFF (`/api/v1/auth/login`). BFF verifies credentials against Core API and issues an HMAC-SHA256 signed JWT.
2. **Data Persistence**: Core API handles all portfolio management mutations (orders, rebalancing, policy limit creation) with ACID guarantees in PostgreSQL 16.
3. **Database Migration**: Flyway manages versioned database migrations (`V1__init_schema.sql`), ensuring strict reproducibility across local, Docker, CI, and production environments.

---

## 4. Micro-Frontend Architecture & Module Federation Contract

### 4.1 Host Shell (`apps/shell`)

- Responsible for outer layout (Top navigation bar, breadcrumbs, status indicators).
- Hosts the global Redux store (`store/index.ts`) for authentication and session status.
- Implements `RemoteWrapper` providing React `Suspense` and `ErrorBoundary` fallback semantics. If any remote micro-frontend fails or network disconnects, the rest of the application remains fully functional.

### 4.2 Portfolio MFE (`apps/portfolio-mfe`)

- Exposes `./PortfolioApp`.
- Manages portfolio overview metrics (AUM, Total P&L, Realized/Unrealized gains).
- Hosts the TanStack Virtual tabular grid for scaling to thousands of high-frequency asset allocations.

### 4.3 Risk MFE (`apps/risk-mfe`)

- Exposes `./RiskApp`.
- Renders Parametric VaR, Historical Simulation VaR, Monte Carlo VaR, and Expected Shortfall (CVaR).
- Houses stress scenario simulations (e.g., 2008 Financial Crisis, COVID Shock, Interest Rate +100bps).
- Custom D3.js visualization surfaces.

### 4.4 Alerts MFE (`apps/alerts-mfe`)

- Exposes `./AlertsApp`.
- Manages risk limit policies and live breach audit streams with real-time acknowledgment flows.

---

## 5. Security & Compliance Baseline

1. **Defense in Depth**: Frontends communicate exclusively through the BFF. Internal Core API services are shielded from direct public internet exposure.
2. **Stateless JWT**: Standardized JSON Web Tokens signed with HMAC-SHA256. Expired tokens are rejected; credentials are encrypted using bcrypt.
3. **HTTP Security Headers**: BFF enforces modern CSP, HSTS, X-Content-Type-Options, and X-Frame-Options via `helmet`.
4. **CORS Isolation**: Controlled origins preventing unauthorized cross-origin socket or fetch manipulation.
5. **OWASP Top 10 Alignment**: Documented in `docs/security.md`.

---

## 6. Observability & Real-User Monitoring (RUM)

1. **Prometheus Metrics**:
   - `foliolive_bff_active_websocket_connections`: Active concurrent WebSocket connections.
   - `foliolive_bff_market_ticks_broadcast_total`: Total market ticks dispatched by simulator.
   - Core API JVM metrics: garbage collection frequency, heap usage, HTTP request duration, and HikariCP connection pool saturation.
2. **Grafana Dashboards**: Automatically provisioned via Docker Compose for immediate inspection of system latency and health.
3. **Core Web Vitals**: Shell host records real-user metrics (LCP, INP, CLS, FCP, TTFB) using `web-vitals`.
