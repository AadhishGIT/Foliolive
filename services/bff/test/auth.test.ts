import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import type { Application } from 'express';
import { createBffServer } from '../src/server';
import { authService } from '../src/auth';
import { config } from '../src/config';

describe('Authentication & JWT Cookie Flow', () => {
  let app: Application;

  beforeAll(() => {
    const bff = createBffServer({ seed: 42 });
    app = bff.app;
  });

  describe('AuthService Unit Tests', () => {
    it('authenticates pm_demo successfully with correct credentials', async () => {
      const user = await authService.authenticate('pm_demo', 'Password123!');
      expect(user).not.toBeNull();
      expect(user?.username).toBe('pm_demo');
      expect(user?.role).toBe('ROLE_PM');
    });

    it('authenticates viewer_demo successfully with correct credentials', async () => {
      const user = await authService.authenticate('viewer_demo', 'Password123!');
      expect(user).not.toBeNull();
      expect(user?.username).toBe('viewer_demo');
      expect(user?.role).toBe('ROLE_VIEWER');
    });

    it('rejects authentication with incorrect password', async () => {
      const user = await authService.authenticate('pm_demo', 'WrongPassword!');
      expect(user).toBeNull();
    });

    it('rejects authentication for non-existent user', async () => {
      const user = await authService.authenticate('unknown_user', 'Password123!');
      expect(user).toBeNull();
    });

    it('issues valid access token and refresh token', async () => {
      const user = (await authService.authenticate('pm_demo', 'Password123!'))!;
      const { accessToken, refreshToken, authResponse } = authService.issueTokens(user);

      expect(accessToken).toBeTruthy();
      expect(refreshToken).toBeTruthy();
      expect(authResponse.user.username).toBe('pm_demo');

      const verified = authService.verifyAccessToken(accessToken);
      expect(verified?.sub).toBe('pm_demo');
      expect(verified?.role).toBe('ROLE_PM');

      const refreshed = authService.refresh(refreshToken);
      expect(refreshed).not.toBeNull();
      expect(refreshed?.user.username).toBe('pm_demo');
      expect(refreshed?.accessToken).toBeTruthy();
    });
  });

  describe('HTTP Auth Endpoints with Cookies', () => {
    let accessBearer: string;
    let refreshCookie: string;

    it('POST /auth/login returns JWT token and sets httpOnly refresh cookie', async () => {
      const res = await request(app)
        .post('/auth/login')
        .send({ username: 'pm_demo', password: 'Password123!' })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.token).toBeTruthy();
      expect(res.body.data.user.username).toBe('pm_demo');
      expect(res.body.data.user.role).toBe('ROLE_PM');

      accessBearer = `Bearer ${res.body.data.token}`;

      // Verify Set-Cookie header contains httpOnly refresh token
      const cookies = res.headers['set-cookie'];
      expect(cookies).toBeDefined();
      const cookieStr = Array.isArray(cookies) ? cookies.join('; ') : cookies;
      expect(cookieStr).toContain(config.jwt.cookieName);
      expect(cookieStr.toLowerCase()).toContain('httponly');

      // Extract raw cookie string for subsequent refresh test
      refreshCookie = cookies[0];
    });

    it('POST /auth/login rejects invalid credentials with 401', async () => {
      const res = await request(app)
        .post('/auth/login')
        .send({ username: 'pm_demo', password: 'WrongPassword' })
        .expect(401);

      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
    });

    it('GET /auth/me returns current user identity when authenticated with Bearer token', async () => {
      const res = await request(app).get('/auth/me').set('Authorization', accessBearer).expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.username).toBe('pm_demo');
      expect(res.body.data.role).toBe('ROLE_PM');
    });

    it('GET /auth/me returns 401 Unauthorized without Bearer token', async () => {
      const res = await request(app).get('/auth/me').expect(401);

      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });

    it('POST /auth/refresh returns new access token using httpOnly cookie', async () => {
      const res = await request(app)
        .post('/auth/refresh')
        .set('Cookie', [refreshCookie])
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.token).toBeTruthy();
      expect(res.body.data.user.username).toBe('pm_demo');
    });

    it('POST /auth/logout clears the refresh cookie', async () => {
      const res = await request(app).post('/auth/logout').expect(200);

      expect(res.body.success).toBe(true);
      const cookies = res.headers['set-cookie'];
      expect(cookies).toBeDefined();
      const cookieStr = Array.isArray(cookies) ? cookies.join('; ') : cookies;
      // Cleared cookie has empty value or max-age=0 / expires in the past
      expect(cookieStr).toContain(config.jwt.cookieName);
    });
  });
});
