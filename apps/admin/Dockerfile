FROM node:20.18-alpine AS builder
WORKDIR /app
COPY . .
# `rewrites()` manzili QURILISH paytida `.next/routes-manifest.json` ga
# yoziladi — ishga tushirishdagi `API_ORIGIN` ga kech qoladi. Shuning
# uchun u build argumenti bo'lishi SHART: runtime o'zgaruvchisi bo'lsa,
# proxy `localhost:4000` ga qotib qoladi va admin login yana ishlamaydi.
ARG API_ORIGIN=http://api:4000
ENV API_ORIGIN=$API_ORIGIN

RUN npm ci && npm run -w @aliver/admin build

FROM node:20.18-alpine AS runtime
ENV NODE_ENV=production PORT=3001 HOSTNAME=0.0.0.0
WORKDIR /app
COPY --from=builder --chown=node:node /app/apps/admin/.next/standalone ./
COPY --from=builder --chown=node:node /app/apps/admin/.next/static ./apps/admin/.next/static
USER node
EXPOSE 3001
CMD ["node", "apps/admin/server.js"]
