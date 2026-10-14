# ADR 0003: Real-Time Transport: WebSocket vs Server-Sent Events (SSE)

## Status

Accepted

## Context

An institutional risk and trading platform requires live telemetry with minimal latency:

- Continuous high-frequency market price ticks (500ms - 1000ms cadence)
- Streaming portfolio P&L adjustments
- Instantaneous alert dispatches upon risk limit breaches
- Client subscription filtering (portfolio selection, custom symbol watchlists)
- Heartbeat / liveness checks to monitor network connectivity

We evaluated two standard real-time web protocols:

1. **Server-Sent Events (SSE)**: Built on HTTP, native automatic reconnect in browsers, unidirectional (server-to-client only). Client-to-server commands (subscribing/unsubscribing to assets, heartbeat ping/pong, alert acknowledgment) require separate out-of-band HTTP POST requests with separate TLS handshakes and connection multiplexing overhead.
2. **WebSocket (`ws`)**: Full-duplex bidirectional TCP stream over a single persistent connection. Enables low-latency bidirectional message exchange, native binary or JSON framing, minimal packet header overhead (2-10 bytes vs hundreds of HTTP header bytes per request), and unified subscription semantics.

## Decision

We choose **WebSocket (`ws` on Node.js BFF)** with a dedicated client package (`@foliolive/realtime-client`).

Key protocol design points:

- Single bidirectional connection per client session (`/ws`).
- Typed JSON message protocol (`SUBSCRIBE_PORTFOLIO`, `SUBSCRIBE_MARKET`, `TICK`, `PORTFOLIO_UPDATE`, `RISK_UPDATE`, `ALERT_FIRED`, `PING`, `PONG`).
- Client-side exponential backoff with random jitter upon disconnection.
- Periodic heartbeat ping-pong (every 15s) with dead-connection detection.
- Automatic resubscription of registered topics upon reconnection.

## Consequences

### Positive

- Sub-millisecond transport overhead for high-frequency price updates.
- Bidirectional channel simplifies subscription filtering and ping/pong liveness checks without firing separate HTTP POSTs.
- Reduced server resource overhead compared to thousands of independent polling HTTP requests.

### Negative / Tradeoffs

- Stateful connections require sticky sessions or external pub/sub (Redis) if scaling horizontally across multiple BFF instances.
- Requires custom reconnect and buffering logic on the client (encapsulated in `@foliolive/realtime-client`).
