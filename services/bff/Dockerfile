FROM node:20-alpine
WORKDIR /app

RUN npm install -g pnpm@12.11.2

COPY pnpm-lock.yaml* pnpm-workspace.yaml package.json ./
COPY packages ./packages
COPY services/bff ./services/bff

RUN pnpm install --frozen-lockfile || pnpm install

WORKDIR /app/services/bff
EXPOSE 4000

CMD ["pnpm", "dev"]
