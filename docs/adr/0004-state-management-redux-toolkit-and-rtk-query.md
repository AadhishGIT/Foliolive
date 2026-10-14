# ADR 0004: State Management via Redux Toolkit and RTK Query

## Status

Accepted

## Context

Foliolive handles two distinct categories of state across the shell host and micro-frontend boundaries:

1. **Global Session & Orchestration State**: Active portfolio selection, authenticated user session, real-time connection status (connected, reconnecting, disconnected).
2. **High-Frequency Real-Time Market & Risk Telemetry**: Price ticks arriving multiple times per second, dynamic portfolio valuation, and live limit breach feeds.
3. **Server Cache State**: Historical portfolio holdings, past stress scenarios, and user preferences fetched via REST APIs.

We evaluated:

- **React Context only**: Causes re-rendering waterfalls across child component trees on high-frequency price updates unless heavily partitioned with custom selector wrappers.
- **Zustand / Jotai**: Lightweight and great for atomic state, but lacks integrated normalized caching and declarative API mutation workflows out of the box.
- **Redux Toolkit (RTK) + RTK Query**: Industry standard for institutional web platforms, predictable unidirectional data flow, normalized cache with automatic invalidation (RTK Query), devtools time-travel inspection, and performant selector memoization (`createSelector`) to avoid unnecessary re-renders during rapid tick streams.

## Decision

We choose **Redux Toolkit (RTK) and RTK Query** for state management.

- **Host App (`apps/shell`)**: Owns global cross-cutting state (auth tokens, active portfolio ID, WebSocket connection state).
- **Remotes**: Leverage RTK Query for server API data caching, and use specialized local buffers / refs or RTK slices with memoized selectors for tick ingestion.
- High-frequency tick updates bypass full-tree React rendering passes by leveraging granular selectors and virtualized grid row bindings.

## Consequences

### Positive

- Strict predictability and robust devtools debugging for complex financial calculations.
- Automatic caching, deduplication, and polling/revalidation via RTK Query.
- Isolated subscriptions prevent full-dashboard re-renders when a single asset price ticks.

### Negative / Tradeoffs

- Slight boilerplate compared to unconstrained reactive stores; mitigated through Redux Toolkit's `createSlice` and `createApi`.
