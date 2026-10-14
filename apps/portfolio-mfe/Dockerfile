FROM node:20-alpine
WORKDIR /app

RUN npm install -g pnpm@12.11.2

COPY pnpm-lock.yaml* pnpm-workspace.yaml package.json ./
COPY packages ./packages
COPY apps/portfolio-mfe ./apps/portfolio-mfe

RUN pnpm install --frozen-lockfile || pnpm install

WORKDIR /app/apps/portfolio-mfe
EXPOSE 3001

CMD ["pnpm", "dev", "--host"]
