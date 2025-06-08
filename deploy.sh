#!/bin/bash

# DMARC Analyzer Docker Deployment Script
# Simple replacement for the 462-line start_servers.sh

set -e

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Functions
log() { echo -e "${GREEN}[$(date '+%H:%M:%S')] $1${NC}"; }
warn() { echo -e "${YELLOW}[$(date '+%H:%M:%S')] $1${NC}"; }
error() { echo -e "${RED}[$(date '+%H:%M:%S')] $1${NC}"; }

usage() {
    echo "Usage: $0 [start|stop|restart|status|logs|build]"
    echo "  start   - Start all services"
    echo "  stop    - Stop all services"
    echo "  restart - Restart all services"
    echo "  status  - Show service status"
    echo "  logs    - Show service logs"
    echo "  build   - Rebuild images"
}

# Check if .env exists
if [ ! -f .env ]; then
    warn "No .env file found. Please create one with required environment variables."
    warn "Required variables: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, NEXT_PUBLIC_API_URL"
fi

# Main commands
case "${1:-start}" in
    start)
        log "Starting DMARC Analyzer services..."
        docker-compose up -d
        log "Services started. Use '$0 status' to check health."
        ;;
    stop)
        log "Stopping services..."
        docker-compose down
        log "Services stopped."
        ;;
    restart)
        log "Restarting services..."
        docker-compose down
        docker-compose up -d
        log "Services restarted."
        ;;
    status)
        log "Service status:"
        docker-compose ps
        ;;
    logs)
        docker-compose logs -f
        ;;
    build)
        log "Rebuilding images..."
        docker-compose build --no-cache
        log "Images rebuilt."
        ;;
    *)
        usage
        exit 1
        ;;
esac 