FROM node:22.14 AS build

WORKDIR /app

COPY ./package.json ./yarn.lock ./

RUN yarn install

COPY . .

RUN yarn tsc

FROM node:22.14-slim

WORKDIR /app

COPY ./package.json ./yarn.lock ./

RUN yarn install --production

COPY --from=build /app/dist ./dist
COPY ./config ./config

ENV NODE_ENV=production

EXPOSE 3000

CMD ["node", "dist/index.js"]
