# ---------- builder ----------
FROM node:18-slim AS builder

WORKDIR /app

# Environment variables for build optimization
ENV NODE_ENV=production \
    NODE_OPTIONS="--max-old-space-size=1024" \
    NEXT_TELEMETRY_DISABLED=1

# Copy package files for better caching
COPY package*.json ./

# Use npm ci for reproducible builds
RUN npm ci

# Copy application code
COPY . .

# Build the application
RUN npm run build

# ---------- runtime ----------
FROM node:18-slim AS runner

WORKDIR /app

# Environment variables for runtime
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1

# Copy package files and install only production dependencies
COPY --from=builder /app/package*.json ./
RUN npm ci --omit=dev

# Copy built application from builder stage
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public

# Use existing node user (uid 1000) instead of creating custom user
USER node

EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD curl -f http://localhost:3000 || exit 1

CMD ["npm", "start"] 