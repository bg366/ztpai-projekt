FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY backend/package.json backend/package.json
COPY frontend/package.json frontend/package.json
RUN npm ci --workspace=backend
COPY backend/ backend/
RUN npm run build -w backend

FROM node:22-alpine
ENV NODE_ENV=production
WORKDIR /app
COPY package.json package-lock.json ./
COPY backend/package.json backend/package.json
COPY frontend/package.json frontend/package.json
RUN npm ci --workspace=backend --omit=dev && npm cache clean --force
COPY --from=build /app/backend/dist backend/dist
COPY backend/migrations backend/migrations
USER node
EXPOSE 3000
CMD ["sh", "-c", "node backend/dist/migrate.js && exec node backend/dist/server.js"]
