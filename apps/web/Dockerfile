FROM node:20.18-alpine AS builder
WORKDIR /app
COPY . .

# `NEXT_PUBLIC_*` QURILISH paytida paketga kiradi — ishga tushirishda
# o'zgartirib bo'lmaydi. Canonical va hreflang havolalari shu qiymatdan
# yasaladi, shuning uchun u build argumenti sifatida beriladi.
ARG NEXT_PUBLIC_WEB_URL=https://aliver.uz
ENV NEXT_PUBLIC_WEB_URL=$NEXT_PUBLIC_WEB_URL

# `rewrites()` manzili QURILISH paytida `.next/routes-manifest.json` ga
# yoziladi — ishga tushirishdagi `API_ORIGIN` ga kech qoladi. Shuning
# uchun u build argumenti bo'lishi SHART: runtime o'zgaruvchisi bo'lsa,
# proxy `localhost:4000` ga qotib qoladi va admin login yana ishlamaydi.
ARG API_ORIGIN=http://api:4000
ENV API_ORIGIN=$API_ORIGIN

RUN npm ci && npm run -w @aliver/web build

FROM node:20.18-alpine AS runtime
ENV NODE_ENV=production PORT=3000 HOSTNAME=0.0.0.0
WORKDIR /app
COPY --from=builder --chown=node:node /app/apps/web/.next/standalone ./
COPY --from=builder --chown=node:node /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder --chown=node:node /app/apps/web/public ./apps/web/public
USER node
EXPOSE 3000
CMD ["node", "apps/web/server.js"]
