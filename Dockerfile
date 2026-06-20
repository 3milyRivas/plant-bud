FROM cgr.dev/chainguard/wolfi-base AS base

RUN apk add --no-cache nodejs-24 python-3.12
WORKDIR /app

FROM base AS node-deps
RUN apk add --no-cache npm
COPY package*.json ./
RUN npm ci

FROM node-deps AS node-build
COPY . .
RUN node ace build

FROM node-deps AS node-deps-prod
RUN npm prune --omit=dev

FROM base AS python-deps
RUN apk add --no-cache py3-pip

COPY requirements.txt ./
RUN python -m venv .venv && \
    .venv/bin/pip install --upgrade pip && \
    .venv/bin/pip install -r requirements.txt

FROM python-deps AS python-rembg-model-warmup
ENV U2NET_HOME=/app/.u2net

COPY ./resources/py/ ./resources/py/
RUN .venv/bin/python resources/py/warmup_rembg.py

FROM base AS production

ENV NODE_ENV=production
ENV PATH="/app/.venv/bin:$PATH"
ENV U2NET_HOME=/app/.u2net

COPY resources/py ./resources/py
COPY --from=python-deps /app/.venv ./.venv
COPY --from=python-rembg-model-warmup /app/.u2net ./.u2net

COPY package*.json ./
COPY --from=node-build /app/build ./
COPY --from=node-deps-prod /app/node_modules ./node_modules

COPY docker-entrypoint.js ./
CMD ["node", "docker-entrypoint.js"]