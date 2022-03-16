FROM node:16.14

WORKDIR /app

COPY ./package.json ./

RUN npm cache clean --force
RUN npm install

COPY . .

EXPOSE 3000

CMD yarn start