# ---------- builder ----------
FROM node:18-slim AS builder

WORKDIR /app

# Environment variables for build optimization
ENV NODE_ENV=production \
    NODE_OPTIONS="--max-old-space-size=1024" \
    NEXT_TELEMETRY_DISABLED=1

# Copy package files for better caching
COPY package*.json ./

# Verify files are copied and use npm ci for reproducible builds
RUN ls -la && npm ci

# Copy application code
COPY . .

# Build the application
RUN npm run build

# ---------- runtime ----------
FROM node:18-slim AS runner

WORKDIR /app

# Install curl for health checks
RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*

# Environment variables for runtime
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1

# Create a non-root user for security
RUN groupadd --gid 1001 nodejs
RUN useradd --uid 1001 --gid nodejs nodejs

# Copy package files and install only production dependencies
COPY --from=builder /app/package*.json ./
RUN npm ci --omit=dev

# Copy built application from builder stage
COPY --from=builder --chown=nodejs:nodejs /app/.next ./.next
COPY --from=builder --chown=nodejs:nodejs /app/public ./public

# Change ownership and switch to non-root user
USER nodejs

EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD curl -f http://localhost:3000/api/health || exit 1

CMD ["npm", "start"] 