# --- Build (Vite) ---
FROM node:20-bookworm-slim AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
# Base API pour le build (ajuste si besoin)
ARG VITE_API_BASE="http://localhost:8004"
ENV VITE_API_BASE=${VITE_API_BASE}
RUN npm run build

# --- Runtime (Nginx statique) ---
FROM nginx:alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist/ /usr/share/nginx/html/
