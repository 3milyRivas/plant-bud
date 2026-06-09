FROM cgr.dev/chainguard/wolfi-base AS base
RUN apk add --no-cache nodejs-24
WORKDIR /app

FROM base AS deps
RUN apk add --no-cache npm
COPY package*.json ./
RUN npm ci

FROM deps AS build
COPY . .
RUN node ace build

FROM deps AS deps-prod
RUN npm prune --omit=dev

FROM base AS production

ENV NODE_ENV=production

COPY package*.json ./
COPY --from=build /app/build ./
COPY --from=deps-prod /app/node_modules ./node_modules

COPY docker-entrypoint.js ./
CMD ["node", "docker-entrypoint.js"]