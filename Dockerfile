# -----------------------------------------------------------------------------
# Builder Stage: Installs dependencies and builds the application
# -----------------------------------------------------------------------------
FROM node:20-alpine AS builder

WORKDIR /usr/src/app

# Install pnpm globally in this stage
# Note: Using 'npm install -g pnpm' is fine here as it's a builder stage.
# For production, you might want to avoid global packages, but here it's for convenience.
RUN npm install -g pnpm

# Copy package.json and pnpm-lock.yaml
COPY package.json ./
COPY pnpm-lock.yaml ./

# Install all dependencies using pnpm
RUN pnpm install --frozen-lockfile --ignore-scripts

# Copy the rest of the application source code
COPY . .

# Build the application
RUN pnpm run build

# -----------------------------------------------------------------------------
# Production Stage: Copies only the essential built artifacts and production dependencies
# -----------------------------------------------------------------------------
FROM node:20-alpine AS production

WORKDIR /usr/src/app

# Install pnpm globally in this stage as well
RUN npm install -g pnpm

# Copy package.json and pnpm-lock.yaml for production dependencies installation
COPY package.json ./
COPY pnpm-lock.yaml ./

# Install only production dependencies using pnpm
# pnpm install --prod is equivalent to npm ci --only=production
RUN pnpm install --prod --frozen-lockfile --ignore-scripts && pnpm store prune

# Copy built application from the 'builder' stage
COPY --from=builder /usr/src/app/dist ./dist

# Install curl for health check
RUN apk add --no-cache curl

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nestjs -u 1001 -G nodejs

# Change ownership of the app directory
RUN chown -R nestjs:nodejs /usr/src/app
USER nestjs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

# Start the application
CMD ["node", "dist/main"]