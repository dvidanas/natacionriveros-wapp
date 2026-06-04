FROM node:20-alpine

RUN apk add --no-cache python3 make g++ libc6-compat

WORKDIR /app

COPY package*.json ./

RUN npm install

ARG CACHEBUST=3
COPY . .

RUN npm run build

RUN rm -rf .next/cache

VOLUME ["/app/data"]

EXPOSE 3000

CMD ["node_modules/.bin/next", "start", "-p", "3000"]
