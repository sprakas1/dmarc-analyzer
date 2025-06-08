# Zero-Downtime Deployment Guide

This project now supports zero-downtime deployments using Docker Compose with health checks and rolling updates.

## How It Works

1. **Health Checks**: Both backend and frontend have health endpoints that return 200 when services are ready
2. **Rolling Updates**: New containers start before old ones are stopped
3. **Dependency Management**: Services wait for their dependencies to be healthy before starting
4. **Deployment Orchestration**: Services are deployed in the correct order (backend → frontend → scheduler)

## Usage

### Zero-Downtime Deployment
```bash
./deploy.sh deploy
```

This command:
- Builds new images in parallel
- Deploys backend with zero downtime (waits for health check)
- Deploys frontend with zero downtime (waits for health check)
- Deploys scheduler (brief downtime acceptable)
- Cleans up old images

### Other Commands
```bash
./deploy.sh start    # Start all services (with health checks)
./deploy.sh stop     # Stop all services
./deploy.sh restart  # Restart with downtime (not recommended for production)
./deploy.sh status   # Show service status and health
./deploy.sh health   # Check health of all services
./deploy.sh logs     # Show service logs
./deploy.sh build    # Build images without deploying
```

## Health Endpoints

- Backend: `http://localhost:8000/health`
- Frontend: `http://localhost:3000/api/health`

## GitHub Actions

The deployment workflow (`.github/workflows/deploy.yml`) automatically uses zero-downtime deployment when code is pushed to the main branch.

## Configuration

### Docker Compose Settings
- **Health Check Intervals**: 15 seconds (faster than default 30s)
- **Start Period**: 40 seconds (allows services time to initialize)
- **Retries**: 3 attempts before marking unhealthy
- **Update Strategy**: Start new containers first, then stop old ones

### Deployment Script Settings
- **Health Check Timeout**: 60 seconds maximum wait per service
- **Deployment Order**: Backend → Frontend → Scheduler
- **Automatic Cleanup**: Old Docker images are pruned after successful deployment

## Monitoring

The deployment script provides real-time feedback:
- ✅ Green: Success messages
- ⚠️  Yellow: Warnings
- ❌ Red: Errors
- ℹ️  Blue: Information

## Rollback

If a deployment fails:
1. The old containers remain running
2. Check logs: `./deploy.sh logs`
3. Fix issues and redeploy: `./deploy.sh deploy`

## Testing

Test the health endpoints locally:
```bash
curl http://localhost:8000/health
curl http://localhost:3000/api/health
```

Both should return JSON with `"status": "healthy"`. 