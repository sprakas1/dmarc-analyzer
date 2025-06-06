# Simple Deployment Guide for DigitalOcean Droplet

This guide will help you deploy your DMARC Analyzer to your existing DigitalOcean droplet using GitHub Actions.

## 🏗️ Architecture

**Cost-Effective Setup:**
- **Droplet**: $4-12/month (vs App Platform $29-392/month)
- **Frontend**: Next.js on port 3000
- **Backend**: FastAPI on port 8000  
- **Reverse Proxy**: Caddy (already configured)
- **SSL**: Automatic via Caddy
- **CI/CD**: GitHub Actions (free)

## 🚀 Setup Steps

### 1. Prepare Your Droplet

Your droplet should already have:
- ✅ Caddy configured for reverse proxy
- ✅ SSL certificates working
- ✅ Domain pointing to droplet (dmarc.sharanprakash.me)

### 2. Install Prerequisites on Droplet

SSH into your droplet and install required software:

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install Python 3 and pip (usually already installed)
sudo apt install python3 python3-pip python3-venv -y

# Install Git (usually already installed)
sudo apt install git -y

# Verify installations
node --version  # Should be v18.x.x
python3 --version
git --version
```

### 3. Configure GitHub Repository

1. **Push your code to GitHub** (if not already done):
   ```bash
   git add .
   git commit -m "Initial commit"
   git remote add origin https://github.com/YOUR_USERNAME/dmarc-analyzer.git
   git push -u origin main
   ```

2. **Set up GitHub Secrets**:
   Go to your GitHub repository → Settings → Secrets and variables → Actions
   
   Add these secrets:
   ```
   DROPLET_HOST=your.droplet.ip.address
   DROPLET_USER=root  # or your username
   DROPLET_SSH_KEY=your_private_ssh_key_content
   SUPABASE_URL=https://kvbqrdcehjrkoffzjfmh.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_from_supabase
   NEXT_PUBLIC_SUPABASE_URL=https://kvbqrdcehjrkoffzjfmh.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_from_supabase
   ```

### 4. Get Your SSH Private Key

On your local machine:
```bash
# Display your private key (copy the entire output)
cat ~/.ssh/id_rsa

# Or if you use a different key:
cat ~/.ssh/your_key_name
```

Copy the entire content (including `-----BEGIN` and `-----END` lines) and paste it as the `DROPLET_SSH_KEY` secret.

### 5. Get Supabase Keys

1. Go to [Supabase Dashboard](https://supabase.com/dashboard/project/kvbqrdcehjrkoffzjfmh/settings/api)
2. Copy the **service_role** key (not the anon key) - this is sensitive!
3. The anon key is already in the code, but you can get it from the same page

### 6. First Manual Deployment (Optional)

You can do a manual deployment first to test:

```bash
# On your droplet
sudo mkdir -p /opt/dmarc-analyzer
sudo chown $USER:$USER /opt/dmarc-analyzer
cd /opt/dmarc-analyzer

# Clone your repository
git clone https://github.com/YOUR_USERNAME/dmarc-analyzer.git .

# Run the environment setup script
chmod +x setup-environment.sh
./setup-environment.sh

# Edit the backend .env file to add your real service role key
nano backend/.env
```

### 7. Test Automatic Deployment

Once everything is set up:

1. **Make a small change** to your code
2. **Commit and push**:
   ```bash
   git add .
   git commit -m "Test deployment"
   git push origin main
   ```
3. **Watch the deployment** in GitHub Actions tab
4. **Check your site** at https://dmarc.sharanprakash.me

## 🔍 Monitoring & Troubleshooting

### Check Service Status

SSH into your droplet:
```bash
cd /opt/dmarc-analyzer

# Check if services are running
ps aux | grep uvicorn  # Backend
ps aux | grep node     # Frontend

# Check logs
tail -f backend.log    # Backend logs
tail -f frontend.log   # Frontend logs

# Check process IDs
cat backend/.fastapi.pid
cat frontend/.nextjs.pid
```

### Manual Service Management

```bash
cd /opt/dmarc-analyzer

# Restart backend
cd backend
kill $(cat .fastapi.pid) 2>/dev/null || true
source .venv/bin/activate
nohup uvicorn main:app --host 0.0.0.0 --port 8000 > ../backend.log 2>&1 &
echo $! > .fastapi.pid
cd ..

# Restart frontend
cd frontend
kill $(cat .nextjs.pid) 2>/dev/null || true
nohup npm start > ../frontend.log 2>&1 &
echo $! > .nextjs.pid
cd ..
```

### Common Issues

1. **"Permission denied" errors**: Make sure `/opt/dmarc-analyzer` is owned by your user
2. **SSH key issues**: Ensure your private key is correctly formatted in GitHub secrets
3. **Environment variables**: Check that all Supabase keys are correctly set
4. **Port conflicts**: Make sure ports 3000 and 8000 are available

## 🎯 Benefits of This Setup

✅ **Cost-effective**: $4-12/month vs $29-392/month for App Platform  
✅ **Simple**: No Docker complexity  
✅ **Fast deployments**: Direct git pull and restart  
✅ **Full control**: Access to logs, processes, and configuration  
✅ **Existing infrastructure**: Uses your configured Caddy setup  
✅ **Auto-deployment**: GitHub Actions handles everything  

## 🔄 Development Workflow

1. **Develop locally** using your existing setup
2. **Commit and push** to main branch
3. **GitHub Actions automatically deploys** to your droplet
4. **Monitor deployment** in GitHub Actions tab
5. **Check live site** at https://dmarc.sharanprakash.me

Your Caddy reverse proxy will automatically route traffic:
- `/api/*` → Backend (port 8000)
- `/*` → Frontend (port 3000)

That's it! Simple, cost-effective, and reliable. 