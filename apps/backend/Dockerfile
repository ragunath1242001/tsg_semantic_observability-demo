FROM node:20-alpine as builder

WORKDIR /app
COPY package* /app/
RUN npm install
COPY . .
RUN npm run tsc && npm run lint

FROM node:20-alpine

WORKDIR /app
COPY package* /app/
RUN npm install --production
COPY --from=builder /app/build/ /app/

EXPOSE 3000
ENTRYPOINT [ "node", "app.js" ]
