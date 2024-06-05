FROM node:20.10

WORKDIR /app

COPY ./package.json ./

RUN yarn install --production

COPY . .

EXPOSE 3000

CMD yarn start