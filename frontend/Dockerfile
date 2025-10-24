# Stage 1: Build the Next.js app (Using Node 20)
FROM node:20-alpine AS builder
WORKDIR /app

# Copy package.json and install dependencies
COPY package.json package-lock.json ./
RUN npm install

# Copy the rest of the source code and build
COPY . .
RUN npm run build

# Stage 2: Create final production image (Using Node 20)
FROM node:20-alpine AS runner
WORKDIR /app

# Install production dependencies only
COPY package.json package-lock.json ./
RUN npm install --omit=dev

# Copy built app from builder stage
COPY --from=builder /app/.next ./.next

# Copy necessary config files
COPY next.config.js .
COPY tailwind.config.js .
COPY postcss.config.js .

# Expose port 3000 (default Next.js port)
EXPOSE 3000

# Start the app using the "start" script from package.json
CMD ["npm", "start"]