FROM node:20-alpine AS build
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
# Where the SPA proxies /api. Default matches docker-compose (service "backend");
# override on Railway/other hosts, e.g. BACKEND_UPSTREAM=petpattern.railway.internal:8080.
ENV BACKEND_UPSTREAM=backend:8080
# Placed in templates/ so nginx's entrypoint runs envsubst on it at startup,
# substituting ${BACKEND_UPSTREAM} into the final /etc/nginx/conf.d/default.conf.
COPY nginx.conf /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
