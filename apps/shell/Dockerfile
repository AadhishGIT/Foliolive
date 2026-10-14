FROM node:20-alpine
WORKDIR /app

RUN npm install -g pnpm@12.11.2

COPY pnpm-lock.yaml* pnpm-workspace.yaml package.json ./
COPY packages ./packages
COPY apps/shell ./apps/shell

RUN pnpm install --frozen-lockfile || pnpm install

WORKDIR /app/apps/shell
EXPOSE 3000

CMD ["pnpm", "dev", "--host"]
