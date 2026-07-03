FROM maven:3.9.9-eclipse-temurin-21 AS build
WORKDIR /app
COPY pom.xml .
RUN mvn -q dependency:go-offline
COPY src ./src
# Runs the unit tests (engine + auth + trials) as part of the build.
RUN mvn -q clean package

FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
# curl is used by the compose healthcheck to hit /actuator/health.
# Run as a non-root user so an app/dependency RCE can't act as root in the container.
RUN apk add --no-cache curl \
    && addgroup -S app && adduser -S -G app app
COPY --from=build /app/target/*.jar app.jar
RUN chown -R app:app /app
USER app
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
