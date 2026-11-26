# syntax=docker/dockerfile:1
FROM eclipse-temurin:25-jdk AS build
WORKDIR /src
COPY .mvn .mvn
COPY mvnw pom.xml ./
RUN ./mvnw -q dependency:go-offline
COPY src src
RUN ./mvnw -q package -DskipTests && cp target/backend-core-*.jar app.jar

FROM eclipse-temurin:25-jre
# Run as an unprivileged user; uploads are the only writable path.
RUN groupadd --system trakio && useradd --system --gid trakio --home /app trakio \
    && mkdir -p /app/data/uploads && chown -R trakio:trakio /app
WORKDIR /app
COPY --from=build --chown=trakio:trakio /src/app.jar app.jar
USER trakio
ENV TRAKIO_STORAGE_DIR=/app/data/uploads \
    JAVA_TOOL_OPTIONS="-XX:MaxRAMPercentage=75 -XX:+ExitOnOutOfMemoryError"
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
