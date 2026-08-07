FROM node:20-bookworm-slim AS base

RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app
ENV CI=true

FROM base AS deps
COPY package*.json ./
RUN npm ci

FROM deps AS build
COPY . .
RUN npm run prisma:generate
RUN npm run build

FROM base AS runtime
ENV NODE_ENV=production
ENV PORT=7000
WORKDIR /app

COPY package*.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/src/generated ./src/generated
COPY --from=build /app/prisma/scripts ./prisma/scripts
COPY --from=build /app/prisma/seed ./prisma/seed
COPY --from=build /app/src/modules/config ./src/modules/config
COPY --from=build /app/tsconfig.json ./tsconfig.json
COPY --from=build /app/prisma.config.js ./prisma.config.js
COPY --from=build /app/prisma.config.js.map ./prisma.config.js.map
COPY --from=build /app/prisma.config.d.ts ./prisma.config.d.ts
COPY --from=build /app/scripts ./scripts

ARG RUNTIME_UID=10001
ARG RUNTIME_GID=10001
RUN groupadd --gid "$RUNTIME_GID" sawiyaa \
  && useradd --uid "$RUNTIME_UID" --gid "$RUNTIME_GID" --create-home --shell /usr/sbin/nologin sawiyaa \
  && mkdir -p /app/logs /app/storage /app/uploads \
  && chown -R "$RUNTIME_UID:$RUNTIME_GID" /app/logs /app/storage /app/uploads

USER sawiyaa

EXPOSE 7000

CMD ["node", "dist/main"]
