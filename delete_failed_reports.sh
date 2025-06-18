#!/bin/bash

# DMARC Analyzer - Delete Failed Reports Script
# Usage: ./delete_failed_reports.sh YOUR_JWT_TOKEN

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

# Check if token is provided
if [ -z "$1" ]; then
    error "Usage: $0 <JWT_TOKEN>"
    echo ""
    echo "To get your JWT token:"
    echo "1. Go to https://dmarc.sharanprakash.me"
    echo "2. Log in to your account"
    echo "3. Open Developer Tools (F12)"
    echo "4. Go to Application/Storage tab"
    echo "5. Find Local Storage for the site"
    echo "6. Look for 'sb-kvbqrdcehjrkoffzjfmh-auth-token'"
    echo "7. Copy the 'access_token' value"
    echo ""
    exit 1
fi

JWT_TOKEN="$1"
BASE_URL="https://dmarc.sharanprakash.me/api/v1/admin"

# Test authentication first
info "Testing authentication..."
auth_test=$(curl -s -w "%{http_code}" -o /tmp/auth_test.json \
    -H "Authorization: Bearer $JWT_TOKEN" \
    "$BASE_URL/reports/failed")

if [ "$auth_test" != "200" ]; then
    error "Authentication failed (HTTP $auth_test)"
    echo "Response:"
    cat /tmp/auth_test.json 2>/dev/null || echo "No response body"
    exit 1
fi

log "Authentication successful!"

# Get list of failed reports
info "Fetching failed reports..."
curl -s -H "Authorization: Bearer $JWT_TOKEN" \
    "$BASE_URL/reports/failed" | jq '.' > /tmp/failed_reports.json

failed_count=$(cat /tmp/failed_reports.json | jq '.count // 0')
info "Found $failed_count failed reports"

if [ "$failed_count" -eq 0 ]; then
    log "No failed reports to delete!"
    exit 0
fi

# Show failed reports
echo ""
warn "Failed reports to be deleted:"
cat /tmp/failed_reports.json | jq -r '.failed_reports[] | "- ID: \(.id) | External ID: \(.report_id // "N/A") | Domain: \(.domain // "N/A") | Error: \(.error_message // .status)"'

echo ""
read -p "Do you want to delete ALL failed reports? (y/N): " confirm

if [[ $confirm =~ ^[Yy]$ ]]; then
    info "Deleting all failed reports..."
    
    cleanup_response=$(curl -s -X DELETE \
        -H "Authorization: Bearer $JWT_TOKEN" \
        "$BASE_URL/reports/failed/cleanup")
    
    echo "$cleanup_response" | jq '.'
    
    deleted_count=$(echo "$cleanup_response" | jq '.deleted_count // 0')
    log "Successfully deleted $deleted_count failed reports!"
    
else
    warn "Operation cancelled by user"
    
    # Option to delete specific report
    echo ""
    read -p "Enter external report ID to delete specific report (or press Enter to skip): " external_id
    
    if [ ! -z "$external_id" ]; then
        info "Deleting report with external ID: $external_id"
        
        delete_response=$(curl -s -X DELETE \
            -H "Authorization: Bearer $JWT_TOKEN" \
            "$BASE_URL/reports/by-external-id/$external_id")
        
        echo "$delete_response" | jq '.'
        log "Report deleted successfully!"
    fi
fi

# Cleanup temp files
rm -f /tmp/auth_test.json /tmp/failed_reports.json

log "Script completed!" 