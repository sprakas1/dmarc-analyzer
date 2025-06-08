import os
from supabase import create_client, Client
from dotenv import load_dotenv
from typing import Optional

# Load environment variables
load_dotenv()

# Supabase configuration
SUPABASE_URL = os.getenv('SUPABASE_URL', 'https://kvbqrdcehjrkoffzjfmh.supabase.co')
SUPABASE_KEY = os.getenv('SUPABASE_KEY', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt2YnFyZGNlaGpya29mZnpqZm1oIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg5OTg2NjgsImV4cCI6MjA2NDU3NDY2OH0.DEor3A0HjrDA2d-JnxQJphDf3pzJCQ0ofShShEjraLg')
SUPABASE_SERVICE_ROLE_KEY = os.getenv('SUPABASE_SERVICE_ROLE_KEY')

def get_supabase_client(access_token: Optional[str] = None, use_service_role: bool = False) -> Client:
    """Get Supabase client with optional user authentication for RLS
    
    Args:
        access_token: Optional user access token for RLS
        use_service_role: Whether to use service role key (bypasses RLS)
    """
    if use_service_role and SUPABASE_SERVICE_ROLE_KEY:
        client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    else:
        client = create_client(SUPABASE_URL, SUPABASE_KEY)
    
    if access_token:
        # Set user context for RLS
        client.auth.set_session(access_token, "dummy_refresh_token")
    
    return client

# IMAP configuration
IMAP_CONFIG = {
    'host': os.getenv('IMAP_HOST', 'imap.gmail.com'),
    'port': int(os.getenv('IMAP_PORT', '993')),
    'use_ssl': os.getenv('IMAP_SSL', 'true').lower() == 'true',
    'folder': os.getenv('IMAP_FOLDER', 'INBOX')
} 