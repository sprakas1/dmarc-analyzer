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

# Health check removed - curl not available in node:18-slim
# The application will be monitored via reverse proxy

CMD ["npm", "start"] 