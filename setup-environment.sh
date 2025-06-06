#!/bin/bash

# DMARC Analyzer Environment Setup Script
# Run this script on your DigitalOcean droplet to set up environment variables

echo "🔧 Setting up environment variables for DMARC Analyzer"
echo "====================================================="

# Create environment file for backend
cat > /opt/dmarc-analyzer/backend/.env << 'EOF'
SUPABASE_URL=https://kvbqrdcehjrkoffzjfmh.supabase.co
SUPABASE_SERVICE_ROLE_KEY=YOUR_SUPABASE_SERVICE_ROLE_KEY_HERE
EOF

# Create environment file for frontend
cat > /opt/dmarc-analyzer/frontend/.env.local << 'EOF'
NEXT_PUBLIC_SUPABASE_URL=https://kvbqrdcehjrkoffzjfmh.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt2YnFyZGNlaGpya29mZnpqZm1oIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg5OTg2NjgsImV4cCI6MjA2NDU3NDY2OH0.DEor3A0HjrDA2d-JnxQJphDf3pzJCQ0ofShShEjraLg
EOF

echo "✅ Environment files created"
echo ""
echo "🔑 IMPORTANT: Update the SUPABASE_SERVICE_ROLE_KEY in:"
echo "   /opt/dmarc-analyzer/backend/.env"
echo ""
echo "🔒 Get your service role key from:"
echo "   https://supabase.com/dashboard/project/kvbqrdcehjrkoffzjfmh/settings/api"
echo ""
echo "📝 Don't forget to add the same keys to your GitHub Secrets for CI/CD:"
echo "   - DROPLET_HOST (your droplet IP address)"
echo "   - DROPLET_USER (usually 'root' or your username)"
echo "   - DROPLET_SSH_KEY (your private SSH key)"
echo "   - SUPABASE_URL"
echo "   - SUPABASE_SERVICE_ROLE_KEY"
echo "   - NEXT_PUBLIC_SUPABASE_URL"
echo "   - NEXT_PUBLIC_SUPABASE_ANON_KEY" 