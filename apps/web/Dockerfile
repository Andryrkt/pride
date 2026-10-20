# Image de production de l'application web PRIDe (Next.js « standalone »).
# Construction depuis la racine du dépôt : docker build -f apps/web/Dockerfile .

FROM node:22-bookworm-slim AS base
ENV PNPM_HOME=/pnpm PATH=/pnpm:$PATH NEXT_TELEMETRY_DISABLED=1
RUN corepack enable
WORKDIR /app

# 1. Dépendances (mises en cache tant que les package.json ne changent pas)
FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY apps/web/package.json apps/web/
COPY packages/db/package.json packages/db/
COPY packages/shared/package.json packages/shared/
RUN pnpm install --frozen-lockfile --filter @pride/web... --filter @pride/db...

# 2. Construction
FROM deps AS build
COPY . .
RUN pnpm --filter @pride/web build \
 && pnpm --filter @pride/db bundle /app/migrator

# 3. Image finale, minimale
FROM node:22-bookworm-slim AS runner
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0 TZ=Indian/Antananarivo
WORKDIR /app
RUN groupadd --system pride && useradd --system --gid pride pride
COPY --from=build --chown=pride:pride /app/apps/web/.next/standalone ./
COPY --from=build --chown=pride:pride /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=build --chown=pride:pride /app/apps/web/public ./apps/web/public
COPY --from=build --chown=pride:pride /app/migrator ./migrator
COPY --chown=pride:pride docker/entrypoint.sh ./entrypoint.sh
USER pride
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s CMD node -e "fetch('http://localhost:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
ENTRYPOINT ["sh", "./entrypoint.sh"]
