import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createBffServer, type BffServerInstance } from '../src/server';

describe('BFF Distributed Tracing & Telemetry RUM Pipeline', () => {
  let bff: BffServerInstance;

  beforeAll(async () => {
    bff = createBffServer({ seed: 42 });
    await bff.start(0);
  });

  afterAll(async () => {
    await bff.stop();
  });

  describe('Distributed Correlation ID Middleware', () => {
    it('generates a new UUID correlation ID when header is missing', async () => {
      const res = await request(bff.app).get('/health').expect(200);

      const header = res.headers['x-correlation-id'];
      expect(header).toBeDefined();
      expect(typeof header).toBe('string');
      // UUID format verification
      expect(header).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
    });

    it('echoes back an existing X-Correlation-ID header provided by client', async () => {
      const customId = 'frontend-trace-session-987654';
      const res = await request(bff.app)
        .get('/health')
        .set('X-Correlation-ID', customId)
        .expect(200);

      expect(res.headers['x-correlation-id']).toBe(customId);
    });
  });

  describe('POST /telemetry Core Web Vitals & Custom Metrics Ingestion', () => {
    it('accepts a single Core Web Vitals LCP payload and returns success', async () => {
      const res = await request(bff.app)
        .post('/telemetry')
        .set('X-Correlation-ID', 'corr-rum-lcp-1')
        .send({
          name: 'LCP',
          value: 1250,
          rating: 'good',
          unit: 'millisecond',
          page: '/portfolio',
        })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.ingested).toBe(1);
    });

    it('accepts INP and CLS metrics', async () => {
      const resInp = await request(bff.app)
        .post('/telemetry')
        .send({
          name: 'INP',
          value: 85,
          rating: 'good',
        })
        .expect(200);
      expect(resInp.body.success).toBe(true);

      const resCls = await request(bff.app)
        .post('/telemetry')
        .send({
          name: 'CLS',
          value: 0.02,
          rating: 'good',
        })
        .expect(200);
      expect(resCls.body.success).toBe(true);
    });

    it('accepts frontend custom metrics: timeToFirstLiveUpdateMs, gridRenderDurationMs, wsReconnectCount', async () => {
      const res = await request(bff.app)
        .post('/telemetry')
        .send([
          {
            name: 'timeToFirstLiveUpdateMs',
            value: 340,
            unit: 'millisecond',
          },
          {
            name: 'gridRenderDurationMs',
            value: 14.8,
            unit: 'millisecond',
          },
          {
            name: 'wsReconnectCount',
            value: 1,
          },
        ])
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.ingested).toBe(3);
    });

    it('accepts events wrapper payload schema { events: [...] }', async () => {
      const res = await request(bff.app)
        .post('/telemetry')
        .send({
          events: [
            { name: 'LCP', value: 1800, rating: 'good' },
            { name: 'gridRenderDurationMs', value: 12.2 },
          ],
        })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.ingested).toBe(2);
    });

    it('rejects invalid telemetry payload schema with 400', async () => {
      const res = await request(bff.app)
        .post('/telemetry')
        .send({
          foo: 'invalid',
        })
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('INVALID_TELEMETRY_PAYLOAD');
    });
  });

  describe('Prometheus /metrics Endpoint Exposure', () => {
    it('exposes Web Vitals, frontend performance, and alert metrics in Prometheus format', async () => {
      const res = await request(bff.app).get('/metrics').expect(200);

      expect(res.text).toContain('foliolive_web_vitals_lcp_seconds');
      expect(res.text).toContain('foliolive_web_vitals_inp_seconds');
      expect(res.text).toContain('foliolive_web_vitals_cls');
      expect(res.text).toContain('foliolive_frontend_time_to_first_live_update_seconds');
      expect(res.text).toContain('foliolive_frontend_grid_render_duration_seconds');
      expect(res.text).toContain('foliolive_frontend_ws_reconnects_total');
      expect(res.text).toContain('foliolive_active_alerts_total');
      expect(res.text).toContain('foliolive_alerts_breach_total');
    });
  });
});
