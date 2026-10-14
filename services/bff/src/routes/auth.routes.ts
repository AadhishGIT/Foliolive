import { Router, type Request, type Response } from 'express';
import rateLimit from 'express-rate-limit';
import { LoginRequestSchema } from '@foliolive/shared-types';
import { authService, requireAuth } from '../auth';
import { config } from '../config';
import { authAttemptsCounter } from '../metrics';
import { logger } from '../logger';

export function createAuthRouter(): Router {
  const router = Router();

  // Rate limiter on login: 15 requests per 60 seconds per IP
  const loginLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 15,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      success: false,
      error: {
        code: 'TOO_MANY_REQUESTS',
        message: 'Too many login attempts. Please try again after 60 seconds.',
      },
      timestamp: new Date().toISOString(),
    },
  });

  /**
   * POST /auth/login
   * Issues JWT access token + refresh token in httpOnly cookie
   */
  router.post('/login', loginLimiter, async (req: Request, res: Response) => {
    const parseResult = LoginRequestSchema.safeParse(req.body);
    if (!parseResult.success) {
      authAttemptsCounter.inc({ status: 'bad_request' });
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: parseResult.error.errors.map((e) => e.message).join(', '),
        },
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const { username, password } = parseResult.data;
    const user = await authService.authenticate(username, password);

    if (!user) {
      authAttemptsCounter.inc({ status: 'failure' });
      logger.warn({ username }, 'Failed login attempt: invalid credentials');
      res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid username or password',
        },
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const { refreshToken, authResponse } = authService.issueTokens(user);
    authService.setRefreshCookie(res, refreshToken);
    authAttemptsCounter.inc({ status: 'success' });

    logger.info({ username: user.username, role: user.role }, 'User authenticated successfully');

    res.json({
      success: true,
      data: authResponse,
      timestamp: new Date().toISOString(),
    });
  });

  /**
   * POST /auth/refresh
   * Reads refresh token from httpOnly cookie and issues new access token
   */
  router.post('/refresh', (req: Request, res: Response) => {
    const refreshToken = req.cookies?.[config.jwt.cookieName];

    if (!refreshToken) {
      res.status(401).json({
        success: false,
        error: {
          code: 'MISSING_REFRESH_TOKEN',
          message: 'No refresh token provided in httpOnly cookie',
        },
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const result = authService.refresh(refreshToken);
    if (!result) {
      authService.clearRefreshCookie(res);
      res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_REFRESH_TOKEN',
          message: 'Refresh token is invalid or expired',
        },
        timestamp: new Date().toISOString(),
      });
      return;
    }

    res.json({
      success: true,
      data: {
        token: result.accessToken,
        expiresIn: config.jwt.accessExpirationSeconds,
        user: result.user,
      },
      timestamp: new Date().toISOString(),
    });
  });

  /**
   * POST /auth/logout
   * Clears httpOnly refresh token cookie
   */
  router.post('/logout', (_req: Request, res: Response) => {
    authService.clearRefreshCookie(res);
    res.json({
      success: true,
      message: 'Logged out successfully',
      timestamp: new Date().toISOString(),
    });
  });

  /**
   * GET /auth/me
   * Returns current authenticated user profile
   */
  router.get('/me', requireAuth, (req: Request, res: Response) => {
    const userPayload = (req as Request & { user: { sub: string; userId: string; role: string } })
      .user;
    res.json({
      success: true,
      data: {
        userId: userPayload.userId,
        username: userPayload.sub,
        role: userPayload.role,
      },
      timestamp: new Date().toISOString(),
    });
  });

  /**
   * GET /auth/demo-users
   * Lists available demo accounts for convenience
   */
  router.get('/demo-users', (_req: Request, res: Response) => {
    res.json({
      success: true,
      data: authService.getDemoUsers(),
      timestamp: new Date().toISOString(),
    });
  });

  return router;
}
