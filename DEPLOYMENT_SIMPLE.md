# DMARC Analyzer - Simplified Docker Deployment

## Quick Start

1. **Copy environment template**:
   ```bash
   cp .env.template .env
   # Edit .env with your Supabase service role key
   ```

2. **Deploy locally**:
   ```bash
   ./deploy.sh start
   ```

3. **Deploy to production**:
   - Push to GitHub main branch
   - GitHub Actions will automatically deploy to your DigitalOcean droplet

## What Changed

✅ **Replaced**: 462-line bash script → 60-line Docker deployment  
✅ **Fixed**: Port mismatch (Caddy expects 8000, now serves 8000)  
✅ **Simplified**: One Docker Compose file handles everything  
✅ **Consistent**: Same container behavior local and production  

## Architecture

```
Internet → Caddy (Port 80/443) → Docker Network
                                 ├─ Backend (8000)
                                 ├─ Frontend (3000) 
                                 └─ Scheduler (background)
```

## Commands

| Command | Action |
|---------|---------|
| `./deploy.sh start` | Start all services |
| `./deploy.sh stop` | Stop all services |
| `./deploy.sh status` | Check health status |
| `./deploy.sh logs` | View logs |
| `./deploy.sh build` | Rebuild images |

## Environment Variables

Create `.env` file with:
- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key from Supabase dashboard
- `NEXT_PUBLIC_SUPABASE_URL` - Same as SUPABASE_URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Anonymous key from Supabase

## Production Deployment

1. Set GitHub secrets in your repository settings:
   - `DROPLET_HOST` - Your DigitalOcean droplet IP
   - `DROPLET_USER` - SSH username (usually root)
   - `DROPLET_SSH_KEY` - Private SSH key
   - `SUPABASE_URL` - Your Supabase URL
   - `SUPABASE_SERVICE_ROLE_KEY` - Your service role key
   - `NEXT_PUBLIC_SUPABASE_URL` - Same as SUPABASE_URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Your anon key

2. Push to main branch - deployment is automatic

## Health Checks

- Backend: `curl http://localhost:8000/health`
- Frontend: `curl http://localhost:3000`
- All services have built-in Docker health checks

## Cleanup

To remove old deployment method:
```bash
# Stop old services
./start_servers.sh stop || true

# Remove old files (optional)
rm start_servers.sh setup-environment.sh app.yaml
``` 