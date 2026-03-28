FROM node:20-alpine AS builder
WORKDIR /app
RUN apk add --no-cache openssl
COPY package*.json ./
COPY tsconfig*.json ./
COPY prisma ./prisma/
COPY nest-cli.json ./
RUN npm install
COPY . .
RUN npx prisma generate
ARG APP_NAME
RUN rm -rf dist && npx nest build ${APP_NAME}

FROM node:20-alpine
WORKDIR /app
RUN apk add --no-cache openssl
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/prisma ./prisma
ARG APP_NAME
ENV APP_MAIN_FILE=dist/apps/${APP_NAME}/main.js
CMD ["sh", "-c", "node ${APP_MAIN_FILE}"]
