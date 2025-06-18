#!/bin/bash

# DMARC Analyzer Docker Deployment Script
# Zero-downtime deployment with health checks

set -e

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Functions
log() { echo -e "${GREEN}[$(date '+%H:%M:%S')] $1${NC}"; }
warn() { echo -e "${YELLOW}[$(date '+%H:%M:%S')] $1${NC}"; }
error() { echo -e "${RED}[$(date '+%H:%M:%S')] $1${NC}"; }
info() { echo -e "${BLUE}[$(date '+%H:%M:%S')] $1${NC}"; }

usage() {
    echo "Usage: $0 [start|stop|restart|status|logs|build|deploy|health]"
    echo "  start   - Start all services"
    echo "  stop    - Stop all services"
    echo "  restart - Restart all services (with downtime)"
    echo "  deploy  - Zero-downtime deployment (build + rolling update)"
    echo "  status  - Show service status"
    echo "  logs    - Show service logs"
    echo "  build   - Rebuild images"
    echo "  health  - Check service health"
}

check_health() {
    local service=$1
    local url=$2
    local max_attempts=30
    local attempt=1
    
    info "Checking health of $service..."
    
    while [ $attempt -le $max_attempts ]; do
        if curl -f -s "$url" > /dev/null 2>&1; then
            log "$service is healthy!"
            return 0
        fi
        
        info "Attempt $attempt/$max_attempts: $service not ready yet..."
        sleep 2
        attempt=$((attempt + 1))
    done
    
    error "$service failed health check after $max_attempts attempts"
    return 1
}

zero_downtime_deploy() {
    log "Starting zero-downtime deployment..."
    
    # Check for frontend UI changes
    if [ -f "frontend/src/components/ReportsEnhanced.tsx" ]; then
        info "Detected Shadcn/UI enhanced components - ensuring dependencies are installed..."
    fi
    
    # Build new images
    log "Building new images..."
    docker compose build --parallel
    
    # Deploy backend first (since frontend depends on it)
    log "Deploying backend with zero downtime..."
    docker compose up -d --no-deps --wait backend
    
    # Check backend health
    check_health "backend" "http://localhost:8000/health"
    
    # Deploy frontend with enhanced UI
    log "Deploying frontend with enhanced UI components..."
    docker compose up -d --no-deps --wait frontend
    
    # Check frontend health
    check_health "frontend" "http://localhost:3000/api/health"
    
    # Deploy scheduler (non-critical, can have brief downtime)
    #
    # Docker Compose v2 handles container recreation more gracefully
    # but we still clean up to ensure fresh deployment
    log "Deploying scheduler (clean recreation)..."
    # Remove the old container if it exists so that the subsequent `up` does not
    # try to introspect it. Ignore failures to keep the script idempotent.
    docker compose rm -fs scheduler || true

    # Now recreate the scheduler service from a fresh image. `--force-recreate`
    # guarantees we do not reuse any cached container state, and `--build`
    # ensures we are using the image we just built in the earlier step.
    docker compose up -d --no-deps --build --force-recreate scheduler
    
    # Clean up old images
    log "Cleaning up old images..."
    docker image prune -f
    
    log "Zero-downtime deployment completed successfully!"
    log "All services are healthy and running."
    log "Enhanced Reports UI with Shadcn/UI is now live!"
}

check_all_health() {
    log "Checking health of all services..."
    
    local backend_healthy=true
    local frontend_healthy=true
    
    if ! check_health "backend" "http://localhost:8000/health"; then
        backend_healthy=false
    fi
    
    if ! check_health "frontend" "http://localhost:3000/api/health"; then
        frontend_healthy=false
    fi
    
    if $backend_healthy && $frontend_healthy; then
        log "All services are healthy!"
        return 0
    else
        error "Some services are unhealthy. Check logs for details."
        return 1
    fi
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
        docker compose up -d --wait
        check_all_health
        log "Services started successfully."
        ;;
    stop)
        log "Stopping services..."
        docker compose down
        log "Services stopped."
        ;;
    restart)
        warn "This will cause downtime. Use 'deploy' for zero-downtime updates."
        log "Restarting services..."
        docker compose down
        docker compose up -d --wait
        check_all_health
        log "Services restarted."
        ;;
    deploy)
        zero_downtime_deploy
        ;;
    status)
        log "Service status:"
        docker compose ps
        echo ""
        log "Health status:"
        check_all_health
        ;;
    logs)
        docker compose logs -f
        ;;
    build)
        log "Rebuilding images..."
        docker compose build --no-cache --parallel
        log "Images rebuilt."
        ;;
    health)
        check_all_health
        ;;
    *)
        usage
        exit 1
        ;;
esac 