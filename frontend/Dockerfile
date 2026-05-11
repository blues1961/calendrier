FROM node:20-bookworm-slim AS build

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

ARG VITE_API_BASE=/api
ARG APP_NAME=Calendrier
ARG VITE_SHOW_ADMIN_LINK=false
ARG VITE_ADMIN_URL=/admin/
ENV VITE_API_BASE=${VITE_API_BASE}
ENV APP_NAME=${APP_NAME}
ENV VITE_SHOW_ADMIN_LINK=${VITE_SHOW_ADMIN_LINK}
ENV VITE_ADMIN_URL=${VITE_ADMIN_URL}

RUN npm run build

FROM nginx:1.27-alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
