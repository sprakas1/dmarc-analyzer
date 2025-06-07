FROM node:18-slim

WORKDIR /app

# Set Node.js memory limit for low-memory builds
ENV NODE_OPTIONS="--max-old-space-size=1024"

# Copy package files first for better caching
COPY package*.json ./

# Install dependencies with npm install (more forgiving than npm ci)
RUN npm install

# Copy application code
COPY . .

# Build the application with memory constraints
RUN npm run build

# Create non-root user
RUN groupadd -g 1001 nodejs
RUN useradd -r -u 1001 -g nodejs nextjs

# Change ownership of necessary directories
RUN chown -R nextjs:nodejs /app

USER nextjs

EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD curl -f http://localhost:3000 || exit 1

CMD ["npm", "start"] 