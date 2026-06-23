FROM node:20-alpine

WORKDIR /app

RUN apk add --no-cache openssl

COPY server/package*.json ./server/
COPY server/prisma ./server/prisma
WORKDIR /app/server
RUN npm ci

WORKDIR /app
COPY web ./web
COPY server ./server

WORKDIR /app/server
RUN npm run build

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3000
ENV DATABASE_URL=file:/data/prod.db

EXPOSE 3000
VOLUME ["/data"]

CMD ["sh", "-c", "mkdir -p /data && npx prisma migrate deploy && node dist/index.js"]
