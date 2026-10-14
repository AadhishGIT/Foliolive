# ADR 0009: Cross-Micro-Frontend Communication and Shared State Contract

## Status

Accepted

## Date

2026-10-14

## Context

The Foliolive frontend architecture decomposes the portfolio management platform into four independent applications orchestrated via Module Federation (@module-federation/vite):

1. **Shell (Host)**: Authentication, navigation, theme, layout, connection status indicator, and dynamic remote orchestration.
2. **Portfolio MFE (Remote)**: High-frequency virtualized holdings grid, real-time P&L cards, D3 allocation donut and P&L history charts.
3. **Risk MFE (Remote)**: Multi-model VaR metrics, sector/asset exposure D3 bar charts, risk correlation heatmap, and method popover.
4. **Alerts MFE (Remote)**: Live breach notification feed, accessible live regions, and risk limit rule CRUD operations.

These remotes need to coordinate seamlessly on:

- **Authentication**: JWT access token, user role (`ROLE_PM` vs `ROLE_VIEWER`), and token refresh notifications.
- **Active Portfolio**: Currently selected portfolio ID (e.g. `port_global_alpha_01`), ensuring that switching portfolios in the Shell or Portfolio MFE immediately switches views across Risk and Alerts.
- **WebSocket Streaming**: Connection lifecycle status (`CONNECTED`, `CONNECTING`, `RECONNECTING`, `DISCONNECTED`) and real-time telemetry updates.

### Evaluated Alternatives

1. **Shared Monolithic Redux Store Across Federation**:
   - _Pros_: Single source of truth.
   - _Cons_: Tight coupling across independent teams and deployment artifacts. A change in one remote's reducer schema risks breaking the host or other remotes. Makes standalone development cumbersome because remotes require the host's entire Redux tree to function.

2. **DOM CustomEvents (`window.dispatchEvent`)**:
   - _Pros_: Zero external dependencies, native browser support.
   - _Cons_: No compile-time TypeScript safety, no state persistence (a remote mounted after an event fires misses that event), difficult testing, and risk of listener leaks.

3. **Typed Global Event Bus with State Replay & Shared React Singletons (Selected)**:
   - _Architecture_: Module Federation shares `react`, `react-dom`, and `react-router-dom` as singletons (`singleton: true`). Cross-cutting state is mediated by a strongly typed `CrossMfeEventBus` defined in `@foliolive/shared-types`.
   - _State Replay_: The bus retains the latest snapshot of critical state (`token`, `user`, `activePortfolioId`, `connectionStatus`) so newly mounted or dynamically loaded remotes immediately receive the current state upon subscription without waiting for the next user event.
   - _Independence_: Each remote manages its own localized Redux Toolkit store and RTK Query cache for domain-specific state (e.g., virtual grid scroll position, chart brush windows, local form state).

## Decision

We implement a **Typed Cross-MFE Event Bus with State Replay** combined with shared React singletons:

1. `@foliolive/shared-types` exposes `createMfeEventBus()` and typed event payload definitions (`MfeEventType`, `MfeEventPayloadMap`).
2. The Shell initializes the bus and attaches it to `window.__FOLIOLIVE_BUS__`.
3. Each remote initializes its connection to the bus. If running standalone in dev mode without the Shell, the bus provides safe default states (`pm_demo` credentials, `port_global_alpha_01`), enabling 100% standalone development and independent build verification.
4. WebSocket subscription coordination is centralized in the Shell / shared client, and multiplexed updates are dispatched across remotes via the typed bus.

## Consequences

### Positive

- **Decoupled Autonomy**: Remotes can be built, updated, and tested completely independently without sharing internal Redux state trees.
- **Type Safety**: All cross-boundary messages (portfolio changes, auth expiration, alert notifications) are statically validated in TypeScript.
- **Replay Safety**: Remotes loaded lazily via React.lazy/Suspense do not suffer from race conditions or missed initial states.
- **Fast Standalone Development**: Developers can run `pnpm --filter @foliolive/portfolio-mfe dev` in isolation without needing the entire platform running.

### Negative

- State is intentionally bifurcated between global orchestration state (event bus) and localized domain state (remote-internal Redux). Developers must know which category a given piece of state belongs to.
