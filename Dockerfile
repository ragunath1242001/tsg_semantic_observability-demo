FROM node:20-alpine as frontend

WORKDIR /app
COPY frontend/package* /app/
RUN npm install
COPY frontend/ .
RUN npm run build

FROM node:20-alpine as backend

WORKDIR /app
COPY backend/package* /app/
RUN npm install
COPY backend/ .
RUN npm run tsc && npm run lint

FROM node:20-alpine

WORKDIR /app/backend

COPY backend/package* /app/backend/
RUN npm install --production
COPY --from=backend /app/build/ /app/backend/
COPY --from=frontend /app/dist/ /app/frontend/

EXPOSE 3000
ENTRYPOINT [ "node", "app.js" ]
ENV EMBEDDED_FRONTEND=/app/frontend/
ENV NODE_ENV=production
