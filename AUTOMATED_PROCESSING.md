# Automated Daily Email Processing

The DMARC Analyzer now supports automated daily processing of DMARC emails for all users with active IMAP configurations.

## How It Works

### Automatic Scheduling
- **Daily Processing**: Runs every day at 2:00 AM
- **All Users**: Processes emails for all users with active IMAP configurations
- **Background Operation**: Runs as a separate worker service
- **Comprehensive Logging**: All operations are logged for monitoring

### What Gets Processed
1. **Active IMAP Configurations**: Only processes configurations marked as `is_active = true`
2. **Unread DMARC Emails**: Fetches unread emails that match DMARC patterns
3. **Multiple Domains**: Supports processing for multiple domains per user
4. **Error Handling**: Gracefully handles connection failures and continues with other configs

### Deployment Architecture

#### Option 1: Integrated with FastAPI (Current)
- Scheduler runs as a background thread within the main FastAPI application
- Automatic startup when the API server starts
- Suitable for single-instance deployments

#### Option 2: Dedicated Worker Service (Recommended for Production)
- Separate worker service running only the scheduler
- Independent from the web API
- Better resource isolation and scalability
- Configure via `app.yaml` worker section

## API Endpoints

### Admin Endpoints (Require Admin Role)

#### Trigger Manual Processing
```http
POST /api/admin/trigger-daily-processing
Authorization: Bearer <admin-token>
```

Response:
```json
{
  "message": "Daily email processing has been triggered",
  "status": "started",
  "note": "Processing is running in the background. Check logs for progress."
}
```

#### Check Scheduler Status
```http
GET /api/admin/scheduler-status
Authorization: Bearer <admin-token>
```

Response:
```json
{
  "scheduler_running": true,
  "next_scheduled_run": "Daily at 2:00 AM",
  "last_manual_trigger": "Check application logs"
}
```

### User Endpoints

#### Trigger Processing for Own Configs
```http
POST /api/user/trigger-my-processing
Authorization: Bearer <user-token>
```

Response:
```json
{
  "message": "Processing completed for 2 configurations",
  "processed_configs": 2,
  "total_emails_processed": 15,
  "results": [
    {
      "config_name": "Gmail DMARC",
      "status": "success",
      "processed": 12,
      "errors": 0
    },
    {
      "config_name": "Office365 DMARC", 
      "status": "success",
      "processed": 3,
      "errors": 0
    }
  ]
}
```

## Configuration

### Environment Variables

Required for the scheduler:
```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### IMAP Configuration
Users must have active IMAP configurations with:
- Valid IMAP server credentials
- `is_active = true` flag set
- Encrypted password stored in the database

## Monitoring and Logging

### Log Levels
- **INFO**: Normal operations, processing summaries
- **WARNING**: Minor issues, configuration problems
- **ERROR**: Failed processing, connection errors

### Key Log Messages
```
Starting daily DMARC email processing
Found 5 active IMAP configurations
Processing config 'Gmail DMARC' for user@example.com
Daily processing completed in 0:02:30
Configs processed: 4 successful, 1 failed
Total emails processed: 25, Total errors: 0
```

### Monitoring Checklist
- [ ] Scheduler is running: Check `/api/admin/scheduler-status`
- [ ] Daily execution: Monitor logs around 2:00 AM
- [ ] Error rates: Watch for failed configurations
- [ ] Processing volumes: Track emails processed per day

## Troubleshooting

### Common Issues

#### Scheduler Not Starting
- Check application startup logs
- Verify environment variables are set
- Ensure service role key has proper permissions

#### No Emails Being Processed
- Verify IMAP configurations are active: `is_active = true`
- Check IMAP credentials are valid
- Confirm there are unread DMARC emails in the inbox

#### Processing Failures
- Check individual config error messages in logs
- Verify IMAP server connectivity
- Ensure passwords are properly encrypted/decrypted

#### High Memory Usage
- Consider reducing concurrent processing
- Add delays between configs (currently 2 seconds)
- Monitor database connection pooling

## Manual Testing

### Test Individual Config
```bash
# In backend directory
python -c "
from scheduler import DmarcScheduler
scheduler = DmarcScheduler()
scheduler.run_now()
"
```

### Test Specific User
Use the user endpoint `/api/user/trigger-my-processing` to test processing for a specific user's configurations.

## Performance Considerations

### Resource Usage
- **Memory**: ~50-100MB per worker instance
- **CPU**: Minimal during non-processing periods
- **Network**: Depends on IMAP server response times
- **Database**: Connection pooling handles concurrent access

### Scaling
- Single worker handles most deployments
- For high-volume users, consider multiple workers with config partitioning
- Monitor processing duration vs. 24-hour window

### Rate Limiting
- 2-second delay between processing different configs
- IMAP connections respect server limits
- No concurrent connections to same IMAP server

## Security

### Password Storage
- IMAP passwords stored encrypted with base64 (basic)
- Consider upgrading to stronger encryption for production
- Service role key required for cross-user access

### Access Control
- Admin endpoints require admin role verification
- User endpoints only process own configurations
- Row Level Security (RLS) enforced at database level

### Audit Trail
- All processing activities logged
- Failed attempts recorded with error details
- User-triggered processing tracked separately

## Future Enhancements

### Potential Improvements
- **Advanced Scheduling**: Custom schedules per user/config
- **Retry Logic**: Exponential backoff for failed configs
- **Notification System**: Email alerts for processing failures
- **Metrics Dashboard**: Processing statistics and trends
- **Parallel Processing**: Concurrent config processing with proper throttling 