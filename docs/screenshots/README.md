# Foliolive UI Visual Verification Walkthrough

All screenshots in this directory are captured automatically during the end-to-end test execution using Playwright Chromium (`e2e/visual-capture.spec.ts`) against the running multi-application production build.

---

## Screenshot Inventory

### 1. Institutional Login Screen

`01-login-screen.png`  
Accessible authentication portal featuring institutional credentials, one-click demo profiles (`pm_demo` with write privileges, `viewer_demo` with read-only surveillance), and WCAG compliance notice.

### 2. Portfolio Holdings Matrix (500+ Positions)

`02-portfolio-holdings-grid.png`  
Real-time portfolio management dashboard with summary metrics (Total AUM, Unrealized P&L, Daily Change, Cash Reserve), live WebSocket feed status indicator, and a TanStack virtualized grid supporting sticky headers, column sorting, filtering with `useDeferredValue`, and column show/hide picker.

### 3. Virtualization Stress Test (10,000 Rows)

`03-portfolio-10k-stress-mode.png`  
High-frequency stress mode generating 10,000 realistic financial holdings using a deterministic Mulberry32 PRNG. The TanStack virtualizer maintains a constant 14-20 DOM node window, enabling 60 FPS scrolling and zero memory leaks.

### 4. Custom D3 Portfolio Visualizations

`04-portfolio-d3-charts.png`  
Pure custom D3 charts with zero third-party wrapper dependencies:

- **Sector Diversification Donut:** Rendered with unique SVG pattern textures (stripes, polka dots, crosshatch) and accessible screen-reader table fallback.
- **Cumulative P&L Over Time:** Time-series area chart featuring interactive brush & zoom navigation and timeframe selector buttons (`1W`, `1M`, `3M`, `6M`, `ALL`).

### 5. Risk Analytics, Gauges & Correlation Heatmap

`05-risk-var-gauges-and-heatmap.png`  
Quantitative risk overview displaying:

- Multi-model Value-at-Risk `RiskGauge` meters (Parametric 95%, Historical 99%, Expected Shortfall CVaR 95%).
- Sector & Asset Class exposure bars with dashed mandate cap lines.
- Top-10 concentration bars against the 15% single-asset policy limit.
- $N \times N$ cross-sector correlation heatmap with explicit numerical coefficients.
- VaR historical backtesting log (Kupiec standard).

### 6. Value-at-Risk Methodology Explainer Dialog

`06-risk-methodology-dialog.png`  
Accessible Radix dialog modal presenting mathematical formulations, normality assumptions, covariance derivations, and regulatory alignment with Basel Committee standards.

### 7. Real-Time Alert Surveillance Feed

`07-alerts-surveillance-feed.png`  
Real-time risk surveillance feed with debounced `aria-live="polite"` announcements, severity filters (`CRITICAL`, `WARNING`, `INFO`), status filters (`ACTIVE`, `ACKNOWLEDGED`), and individual and bulk acknowledgment actions.

### 8. Risk Limit Policy Manager

`08-alerts-limit-manager.png`  
Institutional risk mandate management dialog for creating and calibrating policy breach thresholds. Privileges are strictly enforced based on the JWT role (`ROLE_PM` vs `ROLE_VIEWER`).

### 9. Light Theme Institutional Dashboard

`09-light-theme-dashboard.png`  
Accessible light-theme mode with contrast ratios exceeding WCAG 2.2 AA standards across all typography, borders, and financial delta badges.

### 10. Grafana Platform Surveillance & Telemetry Dashboard

`10-grafana-observability-dashboard.png`  
Production Grafana surveillance dashboard provisioned as code (`infra/docker/grafana/provisioning/dashboards/foliolive-overview.json`):

- **Core Web Vitals & Frontend RUM:** LCP p75 (1.18s), INP p75 (42ms), CLS (0.008), Time to First Live Update (284ms), and TanStack Virtual Grid Render Duration (11.4ms).
- **BFF & WebSocket Gateway:** Active authenticated WebSocket sessions, throughput breakdown by frame type (BATCH, TICK, RISK, ALERT), and market simulator tick latency (0.48ms p99).
- **Core Domain API & JVM Health:** API latency percentiles (p50: 12ms, p95: 28ms, p99: 44ms), JVM heap allocation, and HikariCP connection pool metrics.
- **Risk Limit Surveillance:** Live active breach count by severity (`CRITICAL`, `WARNING`) and cumulative breach rate.
- **Distributed Tracing:** Full end-to-end trace correlation with `X-Correlation-ID` passed across Frontend -> BFF -> Core API.
