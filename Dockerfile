FROM node:lts-bookworm-slim AS base
WORKDIR /app

FROM base AS deps
COPY package*.json ./
RUN npm ci

FROM deps AS build
COPY . .
RUN node ace build

FROM base AS production
ENV NODE_ENV=production

COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=build /app/build ./

# Copy the entrypoint script
COPY docker-entrypoint.js ./

CMD ["node", "docker-entrypoint.js"]