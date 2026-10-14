import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import type { Request, Response, NextFunction } from 'express';
import type { User, UserRole, AuthResponse } from '@foliolive/shared-types';
import { config } from './config';

export interface TokenPayload {
  sub: string;
  userId: string;
  role: string;
  tokenType?: 'ACCESS' | 'REFRESH';
  iat?: number;
  exp?: number;
}

export interface DemoUser {
  id: string;
  username: string;
  email: string;
  passwordHash: string;
  fullName: string;
  role: UserRole;
  createdAt: string;
}

export class AuthService {
  private demoUsers: Map<string, DemoUser> = new Map();

  constructor() {
    this.initializeDemoUsers();
  }

  private initializeDemoUsers(): void {
    // Both demo users use password "Password123!"
    // Pre-computed BCrypt hash for $2a$10$Z0GFWeG2Ohom8xu5I/2/eelpxUMB8gfIGVn1ADkj52hKK.53GjgU6
    const passwordHash = '$2a$10$Z0GFWeG2Ohom8xu5I/2/eelpxUMB8gfIGVn1ADkj52hKK.53GjgU6';

    const pm: DemoUser = {
      id: 'usr_pm_01',
      username: 'pm_demo',
      email: 'pm_demo@foliolive.internal',
      passwordHash,
      fullName: 'Lead Portfolio Manager',
      role: 'ROLE_PM',
      createdAt: '2026-01-01T00:00:00Z',
    };

    const viewer: DemoUser = {
      id: 'usr_viewer_01',
      username: 'viewer_demo',
      email: 'viewer_demo@foliolive.internal',
      passwordHash,
      fullName: 'Risk Viewer Analyst',
      role: 'ROLE_VIEWER',
      createdAt: '2026-01-01T00:00:00Z',
    };

    this.demoUsers.set(pm.username.toLowerCase(), pm);
    this.demoUsers.set(viewer.username.toLowerCase(), viewer);
  }

  /**
   * Authenticate with username and password.
   */
  public async authenticate(username: string, password: string): Promise<DemoUser | null> {
    const user = this.demoUsers.get(username.trim().toLowerCase());
    if (!user) {
      return null;
    }

    const matches = await bcrypt.compare(password, user.passwordHash);
    if (!matches) {
      return null;
    }

    return user;
  }

  /**
   * Issues JWT access token (15 mins) and refresh token (7 days).
   */
  public issueTokens(user: DemoUser): {
    accessToken: string;
    refreshToken: string;
    authResponse: AuthResponse;
  } {
    const accessPayload: TokenPayload = {
      sub: user.username,
      userId: user.id,
      role: user.role,
      tokenType: 'ACCESS',
    };

    const refreshPayload: TokenPayload = {
      sub: user.username,
      userId: user.id,
      role: user.role,
      tokenType: 'REFRESH',
    };

    const accessToken = jwt.sign(accessPayload, config.jwt.secret, {
      expiresIn: config.jwt.accessExpirationSeconds,
    });

    const refreshToken = jwt.sign(refreshPayload, config.jwt.secret, {
      expiresIn: config.jwt.refreshExpirationSeconds,
    });

    const clientUser: User = {
      id: user.id,
      username: user.username,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      createdAt: user.createdAt,
    };

    return {
      accessToken,
      refreshToken,
      authResponse: {
        token: accessToken,
        expiresIn: config.jwt.accessExpirationSeconds,
        user: clientUser,
      },
    };
  }

  /**
   * Verifies access token.
   */
  public verifyAccessToken(token: string): TokenPayload | null {
    try {
      const decoded = jwt.verify(token, config.jwt.secret) as TokenPayload;
      return decoded;
    } catch {
      return null;
    }
  }

  /**
   * Verifies refresh token and generates new access token.
   */
  public refresh(refreshToken: string): { accessToken: string; user: User } | null {
    try {
      const decoded = jwt.verify(refreshToken, config.jwt.secret) as TokenPayload;
      if (decoded.tokenType && decoded.tokenType !== 'REFRESH') {
        return null;
      }

      const user = this.demoUsers.get(decoded.sub.toLowerCase());
      if (!user) {
        return null;
      }

      const newAccessPayload: TokenPayload = {
        sub: user.username,
        userId: user.id,
        role: user.role,
        tokenType: 'ACCESS',
      };

      const accessToken = jwt.sign(newAccessPayload, config.jwt.secret, {
        expiresIn: config.jwt.accessExpirationSeconds,
      });

      return {
        accessToken,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          fullName: user.fullName,
          role: user.role,
          createdAt: user.createdAt,
        },
      };
    } catch {
      return null;
    }
  }

  /**
   * Helper to set httpOnly cookie on Express response.
   */
  public setRefreshCookie(res: Response, refreshToken: string): void {
    res.cookie(config.jwt.cookieName, refreshToken, {
      httpOnly: true,
      secure: !config.isDev,
      sameSite: 'lax',
      path: '/',
      maxAge: config.jwt.refreshExpirationSeconds * 1000,
    });
  }

  /**
   * Helper to clear refresh cookie on logout.
   */
  public clearRefreshCookie(res: Response): void {
    res.clearCookie(config.jwt.cookieName, {
      httpOnly: true,
      secure: !config.isDev,
      sameSite: 'lax',
      path: '/',
    });
  }

  public getDemoUsers() {
    return Array.from(this.demoUsers.values()).map((u) => ({
      username: u.username,
      role: u.role,
      fullName: u.fullName,
    }));
  }
}

export const authService = new AuthService();

/**
 * Express middleware to authenticate requests via Bearer token.
 */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Missing or malformed Authorization header' },
      timestamp: new Date().toISOString(),
    });
    return;
  }

  const token = authHeader.substring(7);
  const payload = authService.verifyAccessToken(token);
  if (!payload) {
    res.status(401).json({
      success: false,
      error: { code: 'INVALID_TOKEN', message: 'Token is invalid or expired' },
      timestamp: new Date().toISOString(),
    });
    return;
  }

  (req as Request & { user: TokenPayload }).user = payload;
  next();
}
