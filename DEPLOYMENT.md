# DMARC Analyzer - Digital Ocean Deployment Guide

## Quick Fix for Signup Issue

The signup functionality is working, but users need to:
1. Check their email inbox (and spam folder) for verification
2. Click the verification link to activate their account
3. Return to the app to sign in

## Deploying to Digital Ocean App Platform

### Prerequisites
1. Push your code to a GitHub repository
2. Get your Supabase service role key from the Supabase dashboard

### Step 1: Create GitHub Repository
```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USERNAME/dmarc-analyzer.git
git push -u origin main
```

### Step 2: Get Supabase Service Role Key
1. Go to https://supabase.com/dashboard/project/kvbqrdcehjrkoffzjfmh/settings/api
2. Copy the "service_role" key (NOT the anon key)
3. Keep this secure - it has admin access to your database

### Step 3: Deploy to Digital Ocean

#### Option A: Using the Web Interface
1. Go to https://cloud.digitalocean.com/apps
2. Click "Create App"
3. Connect your GitHub repository
4. Use the configuration from `app.yaml` as reference

#### Option B: Using App Spec (Recommended)
1. Update `app.yaml` with your GitHub repository URL
2. Add your Supabase service role key to the backend environment variables
3. Deploy using Digital Ocean CLI or API

### Environment Variables Needed

**Frontend:**
- `NEXT_PUBLIC_SUPABASE_URL`: https://kvbqrdcehjrkoffzjfmh.supabase.co
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

**Backend:**
- `SUPABASE_URL`: https://kvbqrdcehjrkoffzjfmh.supabase.co
- `SUPABASE_SERVICE_ROLE_KEY`: [Your service role key from Supabase]

### Step 4: Configure Supabase for Production
1. Go to your Supabase project settings
2. Add your Digital Ocean app domain to "Site URL" and "Redirect URLs"
3. Example: `https://your-app-name.ondigitalocean.app`

### Why Deploy Now?
1. **Email verification works properly** with a real domain
2. **Test real-world conditions** instead of localhost
3. **Share with team/users** for feedback
4. **Iterate faster** on a live environment
5. **Fix production-only issues** early

### Post-Deployment Testing
1. Test signup flow with real email
2. Verify email confirmation works
3. Test password reset functionality
4. Upload and parse DMARC reports
5. Check all dashboard features

### Estimated Cost
- Frontend + Backend: ~$12-24/month for basic setup
- Can scale up/down based on usage
- Free tier available for testing

## Troubleshooting

### Signup Not Working?
- Check browser console for errors
- Verify Supabase environment variables
- Check email spam folder
- Try with different email provider

### Email Verification Issues?
- Ensure Site URL is set correctly in Supabase
- Check that redirect URLs include your domain
- Verify email provider isn't blocking Supabase emails

### API Errors?
- Check backend logs in Digital Ocean
- Verify service role key is set correctly
- Ensure CORS is configured properly 