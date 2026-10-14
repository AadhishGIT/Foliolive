# ADR 0002: Micro-Frontends via Module Federation

## Status

Accepted

## Context

Foliolive consists of distinct financial operational domains:

1. Holdings and real-time P&L tracking (`portfolio-mfe`)
2. Quantitative risk analytics and VaR modeling (`risk-mfe`)
3. Risk limit compliance and alert streams (`alerts-mfe`)

In enterprise financial institutions, these domains are typically owned by distinct specialized teams (Portfolio Management Systems team, Quantitative Risk Engineering team, Compliance & Operations team). A monolithic frontend forces locked-step deployments, creates bundle bloat, and couples release cadences.

We considered three architectural alternatives for decomposing the frontend:

1. **iframes**: Strict sandboxing and isolation, but terrible UX, fragmented keyboard accessibility, difficult shared state and auth propagation, duplicate runtime loading, and poor responsiveness.
2. **Web Components (Custom Elements)**: Framework-agnostic, but cumbersome integration with React 18 concurrent features, manual event bridge overhead, and duplicate CSS/styling token isolation difficulties.
3. **Build-time npm packages**: Simple monorepo imports, but requires full shell rebuild and redeployment on any remote domain update; not true micro-frontends.
4. **Runtime Module Federation (`@module-federation/vite`)**: Loads remote JavaScript modules asynchronously over HTTP while deduplicating and sharing common vendor libraries (`react`, `react-dom`, `@foliolive/ui`).

## Decision

We choose **Module Federation via `@module-federation/vite`** as the micro-frontend integration mechanism.

- The Host Shell (`apps/shell`) acts as the composition container, handling top-level layout, navigation, global auth, and route dispatching.
- Each domain app (`portfolio-mfe`, `risk-mfe`, `alerts-mfe`) is an independent remote exposing a standalone container component (`./PortfolioApp`, `./RiskApp`, `./AlertsApp`).
- Shared singleton dependencies (`react`, `react-dom`) are resolved once at runtime, avoiding duplicated memory footprint.
- Each remote can be run, developed, tested, and deployed independently in standalone mode or mounted inside the shell.
- The Shell wraps each remote inside a `RemoteWrapper` equipped with React `Suspense` and an `ErrorBoundary`, ensuring an outage in one remote does not crash the host.

## Consequences

### Positive

- Independent build, test, and deployment cycles for each financial domain.
- Zero runtime duplication of React and core design system assets.
- Resilient isolation: failure in one remote yields a graceful fallback card without crashing the portfolio manager's dashboard.
- Seamless developer experience with Vite's rapid Hot Module Replacement (HMR).

### Negative / Tradeoffs

- Requires coordinated versioning of shared contracts (`@foliolive/shared-types`).
- Remote endpoints must be reachable or proxy-configured in development and production environments.
