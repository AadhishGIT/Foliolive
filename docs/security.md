# Foliolive: Security Architecture & OWASP Top 10 Alignment

## 1. Security Philosophy & Threat Model

Foliolive is designed for institutional asset management where integrity, confidentiality, and non-repudiation of financial allocations and risk limits are paramount. The platform follows a Defense-in-Depth strategy across client, gateway, application core, and database tiers.

---

## 2. Core Security Controls

### 2.1 Secrets & Configuration Management

- Zero hardcoded credentials or secrets in source code.
- All secrets injected via environment variables (`.env.example` provides documentation with non-sensitive defaults).
- Automated CI scan blocking accidental secret commits.

### 2.2 Authentication & Session Integrity

- **Password Hashing**: Passwords stored using bcrypt with work factor 10+ (or Argon2id).
- **Stateless Tokens**: JWTs signed with HMAC-SHA256 (`HS256`) or RSA (`RS256`).
- **Token Expiration**: Strict 24-hour expiration for access tokens with refresh token rotation.
- **Role-Based Access Control (RBAC)**: Enforced across endpoints (`PORTFOLIO_MANAGER`, `RISK_ANALYST`, `COMPLIANCE_OFFICER`, `ADMIN`).

### 2.3 Network & Transport Security

- **BFF Perimeter**: All client traffic traverses the BFF gateway; Core API is isolated in private network segments.
- **Security Headers**: Enforced via `helmet` on the BFF:
  - `Content-Security-Policy (CSP)`: Restricted script and connect origins.
  - `Strict-Transport-Security (HSTS)`: Enforces HTTPS communication.
  - `X-Frame-Options: DENY`: Prevents clickjacking.
  - `X-Content-Type-Options: nosniff`: Prevents MIME-sniffing.
- **CORS Restriction**: Explicit origin whitelisting; wildcard origins prohibited in production.

---

## 3. OWASP Top 10 (2021) Mapping & Mitigations

| OWASP Vulnerability                                 | Foliolive Architecture Mitigation                                                                                                                                        | Status       |
| :-------------------------------------------------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :----------- |
| **A01: Broken Access Control**                      | Principle of least privilege; RBAC enforced at Spring Security layer and BFF gateway. Direct object references validated against authenticated user portfolio ownership. | **Enforced** |
| **A02: Cryptographic Failures**                     | Bcrypt password hashing. TLS 1.3 enforced in transit. JWT tokens cryptographically signed. Nonce and salt generation using secure PRNG.                                  | **Enforced** |
| **A03: Injection**                                  | Spring Data JPA parameterized SQL queries (zero string concatenation in queries). Schema migrations strictly managed by Flyway.                                          | **Enforced** |
| **A04: Insecure Design**                            | Separation of concerns between transactional Core API and real-time BFF. Deterministic PRNG seed isolation. Architectural threat modeling via ADRs.                      | **Enforced** |
| **A05: Security Misconfiguration**                  | Hardened container images running non-root users (`foliolive` user). Actuator endpoints scoped to metrics and health only. Standardized `.env` handling.                 | **Enforced** |
| **A06: Vulnerable and Outdated Components**         | Automated dependency audits (`pnpm audit`, Dependabot/Renovate). Pinned package versions with frozen lockfiles in CI.                                                    | **Enforced** |
| **A07: Identification and Authentication Failures** | Rate limiting on authentication endpoints (`/api/v1/auth/login`). Exponential backoff against brute force attempts. Protected session revocation.                        | **Enforced** |
| **A08: Software and Data Integrity Failures**       | Deterministic builds with pnpm lockfile. CI checks code signing and commit conventions (`commitlint`).                                                                   | **Enforced** |
| **A09: Security Logging and Monitoring Failures**   | Prometheus and Grafana metrics capture unauthorized spikes, WebSocket connection counts, and error rates. Audit logs recorded for risk limit modifications.              | **Enforced** |
| **A10: Server-Side Request Forgery (SSRF)**         | The BFF and Core API make zero arbitrary client-supplied outbound HTTP requests. All remote URLs are static configuration items.                                         | **Enforced** |

---

## 4. Verification & Audit Procedures

1. **Static Analysis**: ESLint strict security rules (`no-eval`, `@typescript-eslint/no-explicit-any`).
2. **Dynamic Vulnerability Scans**: Playwright accessibility and security checks.
3. **CI Security Gates**: `pnpm audit` runs as part of standard PR checks.
