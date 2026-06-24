FROM node:20-bookworm-slim AS base

WORKDIR /app
ENV CI=true

FROM base AS deps
COPY package*.json ./
RUN npm ci

FROM deps AS build
ARG DATABASE_URL=postgresql://placeholder:placeholder@postgres:5432/placeholder?schema=public
ENV DATABASE_URL=${DATABASE_URL}
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
COPY --from=build /app/prisma.config.js ./prisma.config.js
COPY --from=build /app/prisma.config.js.map ./prisma.config.js.map
COPY --from=build /app/prisma.config.d.ts ./prisma.config.d.ts
COPY --from=build /app/scripts ./scripts

EXPOSE 7000

CMD ["node", "dist/main"]
