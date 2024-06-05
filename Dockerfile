FROM node:20.10

WORKDIR /app

COPY ./package.json ./

RUN npm install --production --force

COPY . .

EXPOSE 3000

CMD yarn start