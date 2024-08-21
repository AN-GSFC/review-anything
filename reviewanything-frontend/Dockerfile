FROM node:22.5.1 as base
WORKDIR /app

COPY package*.json ./

RUN npm i

COPY . .

EXPOSE 9000
