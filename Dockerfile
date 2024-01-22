FROM node:20.10

WORKDIR /app

COPY ./package.json ./

RUN npm install --force

COPY . .

EXPOSE 3000

CMD yarn start