# syntax=docker/dockerfile:1

ARG NODE_VERSION=24.8.0-alpine

# ---------------------------------------------------------------------------
# deps: install full dependency tree (needed to build)
# ---------------------------------------------------------------------------
FROM node:${NODE_VERSION} AS deps
WORKDIR /app
# Installed directly via npm rather than `corepack enable`: corepack 0.34's pnpm
# shim expects a `bin/pnpm.cjs` entry that pnpm 12's package no longer ships
# (it's ESM-only now), which breaks `corepack enable && pnpm ...` on this image.
RUN npm install -g pnpm@12.4.2
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

# ---------------------------------------------------------------------------
# build: compile paraglide messages, drizzle types, and the SvelteKit app
# ---------------------------------------------------------------------------
FROM node:${NODE_VERSION} AS build
WORKDIR /app
RUN npm install -g pnpm@12.4.2
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NODE_ENV=production
RUN pnpm build
RUN pnpm prune --prod

# ---------------------------------------------------------------------------
# runtime: minimal image, non-root user
# ---------------------------------------------------------------------------
FROM node:${NODE_VERSION} AS runtime
WORKDIR /app
ENV NODE_ENV=production

RUN addgroup -S arnia && adduser -S arnia -G arnia \
	&& apk add --no-cache curl \
	&& mkdir -p /app/uploads && chown arnia:arnia /app/uploads

# --chown here (rather than a separate `RUN chown -R` after COPY) avoids
# doubling the image size: chowning post-copy rewrites every file into a new
# overlay layer on top of the one COPY already wrote.
COPY --from=build --chown=arnia:arnia /app/build ./build
COPY --from=build --chown=arnia:arnia /app/node_modules ./node_modules
COPY --from=build --chown=arnia:arnia /app/package.json ./package.json
COPY --from=build --chown=arnia:arnia /app/drizzle ./drizzle
COPY --from=build --chown=arnia:arnia /app/src/lib/server/db/migrate.ts ./src/lib/server/db/migrate.ts
COPY --from=build --chown=arnia:arnia /app/src/worker.ts ./src/worker.ts
COPY --chown=arnia:arnia --chmod=755 docker/entrypoint.sh ./docker/entrypoint.sh

USER arnia

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
	CMD curl -f http://localhost:3000/healthz || exit 1

ENTRYPOINT ["./docker/entrypoint.sh"]
CMD ["node", "build/index.js"]
