FROM node:18-alpine

WORKDIR /app

# Set Node.js memory limit for low-memory builds
ENV NODE_OPTIONS="--max-old-space-size=512"

# Copy package files first for better caching
COPY package*.json ./

# Install dependencies with npm install (more forgiving than npm ci)
RUN npm install

# Copy application code
COPY . .

# Build the application with memory constraints
RUN npm run build

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001

# Change ownership of necessary directories
RUN chown -R nextjs:nodejs /app

USER nextjs

EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3000 || exit 1

CMD ["npm", "start"] 