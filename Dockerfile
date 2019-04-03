FROM node:10.15.3-alpine

WORKDIR /app

ADD package.json .
ADD package-lock.json .

RUN npm ci

ADD . .

ENV NODE_ENV=production

CMD ["/app/start.js"]
