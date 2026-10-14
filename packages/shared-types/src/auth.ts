import { z } from 'zod';

export const UserRoleSchema = z.enum([
  'ROLE_PM',
  'ROLE_VIEWER',
  'ROLE_ADMIN',
  'PORTFOLIO_MANAGER',
  'RISK_ANALYST',
  'COMPLIANCE_OFFICER',
  'ADMIN',
]);

export type UserRole = z.infer<typeof UserRoleSchema>;

export const UserSchema = z.object({
  id: z.string(),
  username: z.string(),
  email: z.string().email(),
  fullName: z.string(),
  role: UserRoleSchema,
  createdAt: z.string(),
});

export type User = z.infer<typeof UserSchema>;

export const LoginRequestSchema = z.object({
  username: z.string().min(1, 'Username is required').trim(),
  password: z.string().min(1, 'Password is required'),
});

export type LoginRequest = z.infer<typeof LoginRequestSchema>;
export type AuthRequest = LoginRequest;

export const AuthResponseSchema = z.object({
  token: z.string(),
  refreshToken: z.string().optional(),
  expiresIn: z.number(),
  user: UserSchema,
});

export type AuthResponse = z.infer<typeof AuthResponseSchema>;

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  timestamp: string;
}
