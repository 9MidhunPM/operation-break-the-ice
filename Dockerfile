FROM node:22-bookworm-slim AS build
WORKDIR /app
RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*
COPY package*.json ./
RUN npm ci \
  && rm -f node_modules/better-sqlite3/prebuilds/linux-arm64.node \
  && npm rebuild better-sqlite3 --build-from-source
COPY . .
RUN npm run build && npm prune --omit=dev

FROM node:22-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/package*.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/server ./server
COPY --from=build /app/config ./config
RUN mkdir -p /data /private/photos
ENV PORT=8080 DB_PATH=/data/event.sqlite PRIVATE_CONTENT_DIR=/private/photos SENIOR_CONFIG_PATH=/private/seniors.json
EXPOSE 8080
CMD ["./node_modules/.bin/tsx","server/index.ts"]
