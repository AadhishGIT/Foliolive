import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import WebSocket from 'ws';
import request from 'supertest';
import type { AddressInfo } from 'node:net';
import { createBffServer, type BffServerInstance } from '../src/server';
import {
  BatchServerMessageSchema,
  type WebSocketServerMessage,
  type WebSocketClientMessage,
} from '@foliolive/shared-types';

describe('WebSocket Integration Flow & Prometheus Metrics', () => {
  let bff: BffServerInstance;
  let serverPort: number;
  let wsUrl: string;
  let authToken: string;

  beforeAll(async () => {
    // Start BFF server on ephemeral port (0)
    bff = createBffServer({ seed: 42, defaultIntervalMs: 50 });
    const srv = await bff.start(0);
    const addr = srv.address() as AddressInfo;
    serverPort = addr.port;
    wsUrl = `ws://127.0.0.1:${serverPort}/ws`;

    // Authenticate to get valid token
    const loginRes = await request(bff.app)
      .post('/auth/login')
      .send({ username: 'pm_demo', password: 'Password123!' });

    authToken = loginRes.body.data.token;
  });

  afterAll(async () => {
    await bff.stop();
  });

  it('rejects connection without auth token with 401', async () => {
    await new Promise<void>((resolve) => {
      const client = new WebSocket(wsUrl);
      client.on('error', () => {
        // Expected handshake failure
      });
      client.on('close', (code) => {
        expect(code).toBe(1006); // Abnormal closure from 401 response
        resolve();
      });
    });
  });

  it('connects, receives CONNECTED handshake, subscribes, receives BATCH updates, and verifies metrics', async () => {
    const authedWsUrl = `${wsUrl}?token=${authToken}`;
    const client = new WebSocket(authedWsUrl);

    const receivedMessages: WebSocketServerMessage[] = [];

    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('WebSocket flow timed out waiting for BATCH message'));
      }, 5000);

      client.on('open', () => {
        // Subscribe to topics
        const subMsg: WebSocketClientMessage = {
          type: 'SUBSCRIBE',
          topics: ['prices', 'portfolio:port_global_alpha_01', 'alerts'],
        };
        client.send(JSON.stringify(subMsg));

        // Step simulator to produce ticks and evaluations
        bff.simulator.step(0.5);
        bff.wsGateway.flushBatch();
      });

      client.on('message', (data) => {
        const parsed = JSON.parse(data.toString()) as WebSocketServerMessage;
        receivedMessages.push(parsed);

        if (parsed.type === 'BATCH') {
          clearTimeout(timeout);
          resolve();
        }
      });

      client.on('error', (err) => {
        clearTimeout(timeout);
        reject(err);
      });
    });

    // 1. Verify CONNECTED message was received
    const connectedMsg = receivedMessages.find((m) => m.type === 'CONNECTED');
    expect(connectedMsg).toBeDefined();
    if (connectedMsg?.type === 'CONNECTED') {
      expect(connectedMsg.payload.authenticatedUser).toBe('pm_demo');
      expect(connectedMsg.payload.role).toBe('ROLE_PM');
    }

    // 2. Verify BATCH message was received and validates with Zod
    const batchMsg = receivedMessages.find((m) => m.type === 'BATCH');
    expect(batchMsg).toBeDefined();

    // Strict Zod schema validation
    const parsedBatch = BatchServerMessageSchema.safeParse(batchMsg);
    expect(parsedBatch.success).toBe(true);
    if (parsedBatch.success) {
      expect(parsedBatch.data.payload.ticks.length).toBeGreaterThan(0);
      expect(parsedBatch.data.payload.batchIntervalMs).toBe(100);

      const aaplTick = parsedBatch.data.payload.ticks.find((t) => t.symbol === 'AAPL');
      expect(aaplTick).toBeDefined();
      expect(aaplTick?.price).toBeGreaterThan(0);
    }

    // 3. Test client PING / PONG
    const pongReceived = await new Promise<boolean>((resolve) => {
      client.on('message', (data) => {
        const msg = JSON.parse(data.toString());
        if (msg.type === 'PONG') {
          resolve(true);
        }
      });
      client.send(JSON.stringify({ type: 'PING' }));
    });
    expect(pongReceived).toBe(true);

    // 4. Verify Prometheus /metrics endpoint reflects activity
    const metricsRes = await request(bff.app).get('/metrics').expect(200);
    const metricsText = metricsRes.text;

    expect(metricsText).toContain('foliolive_bff_active_websocket_connections 1');
    expect(metricsText).toContain('foliolive_bff_ws_messages_sent_total');
    expect(metricsText).toContain('type="CONNECTED"');
    expect(metricsText).toContain('type="BATCH"');
    expect(metricsText).toContain('foliolive_bff_simulator_ticks_total');

    client.close();
  });
});
