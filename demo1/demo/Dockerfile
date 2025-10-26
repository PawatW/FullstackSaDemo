# Stage 1: Build a .jar file using Maven with Java 21
FROM eclipse-temurin:21-jdk-jammy AS builder
WORKDIR /app

# Copy maven wrapper and pom.xml
COPY .mvn/ .mvn
COPY mvnw .
COPY pom.xml .

RUN chmod +x ./mvnw
# Download dependencies (this layer will be cached)
RUN ./mvnw dependency:go-offline

# Copy source code and build (using the artifact name 'demo' from pom.xml)
COPY src/ ./src
RUN ./mvnw package -DskipTests

# Stage 2: Create the final lightweight image with Java 21 JRE
FROM eclipse-temurin:21-jre-jammy
WORKDIR /app

# Copy the built jar from the builder stage (adjust filename if needed)
COPY --from=builder /app/target/demo-0.0.1-SNAPSHOT.jar app.jar

# Expose port 8080 (assuming default Spring Boot port)
EXPOSE 8080

# Run the application
ENTRYPOINT ["java", "-jar", "app.jar"]