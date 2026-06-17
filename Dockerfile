FROM node:22-alpine AS builder

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

RUN npm run build

FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

COPY package*.json ./

RUN npm install --omit=dev

COPY --from=builder /app/dist ./dist

COPY --from=builder /app/openapi ./openapi

EXPOSE 3000

CMD ["sh", "-c", "node dist/db/init.js && exec node dist/index.js"]