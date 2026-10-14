# ADR 0006: High-Frequency Grid Virtualization Approach

## Status

Accepted

## Context

Institutional portfolio managers frequently hold hundreds or thousands of positions across global equities, fixed income, and derivatives. In Foliolive, market prices update up to 1-2 times per second per instrument. Rendering thousands of un-virtualized DOM elements while receiving sub-second state updates causes severe frame drops, high input latency (degraded INP), and browser memory bloat.

We evaluated three approaches:

1. **Unvirtualized HTML `<table>` or CSS Grid**: Simple, but drops frames drastically beyond 100 rows under rapid DOM updates.
2. **Heavy Commercial Data Grids (ag-Grid Enterprise)**: Feature-rich, but large bundle footprint (1MB+), complex licensing, commercial pricing constraints, and difficult customization to match bespoke institutional dark design systems.
3. **Headless Virtualization (TanStack Virtual - `@tanstack/react-virtual`)**: Headless, lightweight (~10KB), framework-native, complete control over markup and Tailwind CSS styling, renders only the visible window of rows (plus a small overscan buffer), and supports dynamic row heights and smooth scrolling.

## Decision

We choose **TanStack Virtual (`@tanstack/react-virtual`)** for the portfolio holdings grid in `portfolio-mfe`.

Implementation strategy:

- Headless virtualizer computes visible row indices based on container scroll viewport.
- Render only ~20-30 active DOM nodes at any time regardless of portfolio size (even with 50,000 holdings).
- Flash cell changes with CSS transitions using memoized row components to avoid re-rendering rows whose mark prices have not changed.
- Custom keyboard navigation and screen-reader ARIA table attributes maintained for WCAG 2.2 AA compliance.

## Consequences

### Positive

- Sub-millisecond rendering times even with tens of thousands of holdings.
- Minimal bundle overhead (~10KB vs hundreds of KB for monolithic grid libraries).
- Complete aesthetic control matching the `@foliolive/ui` design system and dark theme.
- Preserves smooth 60fps scrolling and fast Interaction to Next Paint (INP < 100ms).

### Negative / Tradeoffs

- Grid features such as column pinning, sorting, and filtering must be orchestrated explicitly with utility hooks rather than relying on out-of-the-box grid plugins.
