# ADR 0011: Trunk-Based CI/CD Pipeline and Quality Gates

## Status

Accepted

## Date

2026-10-15

## Context

Institutional financial software requires rigorous release engineering, automated quality gates, and rapid, low-risk deployments. Long-lived feature branches, manual integration testing, and divergent environments introduce merge hell, drift, and unexpected production regressions.

We require:

1. **Trunk-Based Development Flow**: Short-lived branches merged directly into `main` with linear Git history.
2. **Conventional Commits & Semantic Release**: Enforced commit message syntax (`feat:`, `fix:`, `test:`, `docs:`, `refactor:`, `perf:`) enabling automated changelog generation and deterministic release tagging.
3. **Comprehensive CI Pipeline (`.github/workflows/ci.yml`)**: PR validation including linting, strict TypeScript typechecking, Java 21 verification with JaCoCo coverage (>80%), Vitest unit suites, Playwright E2E and WCAG 2.1 AA accessibility audits, Lighthouse CI budgets, SonarQube quality gates, and dependency vulnerability scans.
4. **Continuous Deployment (`.github/workflows/deploy.yml`)**: Automated Docker multi-stage image build and tagging on `main`, container deployment, post-deployment health smoke testing, and release dispatch.

### Evaluated Alternatives

1. **GitFlow (Develop / Release / Master branches)**:
   - _Pros_: Familiar to legacy enterprise teams.
   - _Cons_: Excessive branch management overhead, slow feedback cycles, frequent integration conflicts across microservices, and friction for continuous deployment.
2. **Manual Ad-Hoc Deployment Scripts**:
   - _Pros_: Quick to prototype.
   - _Cons_: No reproducible quality gates, non-compliant with institutional SOC 2 / ISO 27001 audit controls, and risk of deploying broken code.
3. **Trunk-Based CI/CD with Matrix Quality Gates & GitHub Actions (Selected)**:
   - All engineers commit to short-lived branches with conventional commits validated via Husky / commitlint.
   - Pull Requests execute the complete matrix CI pipeline; merges to `main` are blocked if any gate fails.
   - Pushes to `main` automatically build multi-stage Docker images, push to registries, deploy to infrastructure, and run post-deploy smoke verification.

## Decision

We implement a trunk-based CI/CD pipeline using GitHub Actions:

### 1. PR Quality Gate Workflow (`.github/workflows/ci.yml`)

Runs on every pull request targeting `main` and on direct pushes to `main`:

- **Stage 1: Lint, Format & Strict Typecheck**:
  - `pnpm install --frozen-lockfile` with pnpm store cache.
  - Prettier format check (`pnpm format:check`).
  - ESLint with zero-warning threshold (`pnpm lint`).
  - Strict TypeScript compilation (`tsc --build --verbose`).
- **Stage 2: Core Domain API (Java 21) Verification**:
  - OpenJDK 21 Temurin setup with Maven cache.
  - Unit and quantitative risk mathematics verification (`./mvnw test -Dtest="*ServiceTest"`).
  - JaCoCo instruction and branch coverage enforcement (target ≥80% on service layer).
  - Spotless Google Java code style check.
- **Stage 3: Frontend & BFF Unit / Integration Tests**:
  - Vitest test execution across `@foliolive/ui`, `@foliolive/bff`, and `@foliolive/realtime-client`.
  - Coverage verification and artifact upload.
- **Stage 4: Playwright E2E & WCAG 2.1 AA Accessibility Audits**:
  - Monorepo production build (`pnpm build`).
  - Playwright Chromium execution covering institutional login, portfolio matrix navigation, 10,000-row stress virtual scrolling, D3 charts, risk metrics, alert policy workflows, and 8 automated axe WCAG 2.1 AA audits across Dark and Light themes.
  - Upload of HTML test reports and trace artifacts.
- **Stage 5: Lighthouse CI Audits**:
  - Enforces performance (≥90) and accessibility (=100) budgets across critical dashboard routes.
- **Stage 6: SonarCloud / SonarQube Scanner**:
  - Static code analysis, security hotspot detection, and quality gate evaluation configured via `sonar-project.properties`.
- **Stage 7: Dependency Security Audit**:
  - High-severity vulnerability scan via `pnpm audit --prod --audit-level high`.

### 2. Continuous Deployment Workflow (`.github/workflows/deploy.yml`)

Runs on push to `main` following successful CI execution:

- **Image Construction**: Builds optimized multi-stage Docker images:
  - `foliolive-core-api`: Java 21 JRE runtime with Flyway migrations.
  - `foliolive-bff`: Node.js 20 production container with bundled market simulator and WebSocket server.
  - `foliolive-shell`: Static Nginx alpine container serving compiled shell and module federation remote bundles.
- **Container Registry & Deployment**: Tags images with commit SHA and latest semantic version, deploying to target cloud environment.
- **Post-Deploy Smoke Test**: Automated curl health check pinging `/health`, `/actuator/health`, `/metrics`, and frontend root endpoint with retry exponential backoff.
- **Automated Changelog & Release**: Generates GitHub Release notes using conventional commit history.

## Consequences

### Positive

- Strict guarantees that broken code, accessibility regressions, or performance degradation cannot enter `main`.
- High deployment velocity with automated smoke tests verifying live operational health.
- Clear audit trail matching financial regulatory standards.

### Negative / Trade-Offs

- Full pipeline run takes 4-7 minutes on GitHub Actions runners, mitigated by granular caching (pnpm store, maven dependencies, playwright browsers) and parallel job execution.
