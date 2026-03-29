FROM node:20.19.0 AS builder

WORKDIR /app
RUN npm install -g pnpm

COPY package.json pnpm-lock.yaml ./
RUN pnpm install

COPY . .
RUN pnpm build


FROM node:20.19.0 AS production

WORKDIR /app
RUN npm install -g pnpm

COPY --from=builder /app ./

CMD ["pnpm", "start"]