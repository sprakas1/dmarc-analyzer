#!/bin/bash

# DMARC Analyzer Deployment Script for Digital Ocean

echo "🚀 DMARC Analyzer Deployment Setup"
echo "=================================="

# Check if git is initialized
if [ ! -d ".git" ]; then
    echo "❌ Git repository not found. Initializing..."
    git init
    git add .
    git commit -m "Initial commit for deployment"
else
    echo "✅ Git repository found"
fi

# Check if remote is set
if ! git remote get-url origin &> /dev/null; then
    echo ""
    echo "📝 Please add your GitHub repository URL:"
    echo "   git remote add origin https://github.com/YOUR_USERNAME/dmarc-analyzer.git"
    echo "   git push -u origin main"
    echo ""
    echo "💡 Don't forget to:"
    echo "   1. Create a GitHub repository first"
    echo "   2. Push your code to GitHub"
    echo "   3. Get your Supabase service role key"
    echo "   4. Update app.yaml with your GitHub repo URL"
else
    echo "✅ Git remote found"
    echo "📤 Current remote: $(git remote get-url origin)"
fi

echo ""
echo "🔑 Next Steps:"
echo "1. Get your Supabase service role key from:"
echo "   https://supabase.com/dashboard/project/kvbqrdcehjrkoffzjfmh/settings/api"
echo ""
echo "2. Update app.yaml with your GitHub repository URL"
echo ""
echo "3. Deploy to Digital Ocean:"
echo "   - Go to https://cloud.digitalocean.com/apps"
echo "   - Click 'Create App'"
echo "   - Import from GitHub"
echo "   - Use app.yaml as configuration reference"
echo ""
echo "4. Configure environment variables in Digital Ocean:"
echo "   Frontend: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY"
echo "   Backend: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY"
echo ""
echo "5. Update Supabase settings with your production domain"
echo ""
echo "📖 See DEPLOYMENT.md for detailed instructions"

# Check if user wants to commit current changes
if [ -n "$(git status --porcelain)" ]; then
    echo ""
    read -p "🤔 You have uncommitted changes. Commit them now? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        git add .
        git commit -m "Pre-deployment updates: improved signup feedback and deployment setup"
        echo "✅ Changes committed"
        
        if git remote get-url origin &> /dev/null; then
            read -p "📤 Push to remote repository? (y/n): " -n 1 -r
            echo
            if [[ $REPLY =~ ^[Yy]$ ]]; then
                git push
                echo "✅ Pushed to remote repository"
            fi
        fi
    fi
fi

echo ""
echo "🎉 Ready for deployment!" 