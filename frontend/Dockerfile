FROM node:22-alpine AS build
WORKDIR /app
ENV NPM_CONFIG_AUDIT=false \
    NPM_CONFIG_FUND=false
# Copy the lockfile too and use `npm ci` for a reproducible, lockfile-exact build.
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .
RUN test -x node_modules/.bin/vite
# Optional, build-time only (Vite inlines VITE_* at build). Empty = feature off:
# no Sentry init, no analytics. Passed as build args from docker-compose.prod.yml.
ARG VITE_SENTRY_DSN=""
ARG VITE_SENTRY_ENVIRONMENT="production"
ARG VITE_ANALYTICS_URL=""
ENV VITE_SENTRY_DSN=$VITE_SENTRY_DSN \
    VITE_SENTRY_ENVIRONMENT=$VITE_SENTRY_ENVIRONMENT \
    VITE_ANALYTICS_URL=$VITE_ANALYTICS_URL
RUN npm run build

FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
