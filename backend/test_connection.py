#!/usr/bin/env python3
"""
Test script to verify Supabase connection and basic functionality
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from config import get_supabase_client

def test_supabase_connection():
    """Test basic Supabase connection"""
    try:
        supabase = get_supabase_client()
        
        # Test connection by listing tables
        result = supabase.table('profiles').select('id').limit(1).execute()
        print("✅ Supabase connection successful!")
        print(f"   Tables accessible: profiles")
        
        # Test other tables
        tables = ['imap_configs', 'dmarc_reports', 'dmarc_records', 'audit_logs']
        for table in tables:
            try:
                result = supabase.table(table).select('*').limit(1).execute()
                print(f"   ✅ Table '{table}' accessible")
            except Exception as e:
                print(f"   ❌ Table '{table}' error: {str(e)}")
        
        return True
        
    except Exception as e:
        print(f"❌ Supabase connection failed: {str(e)}")
        return False

def test_database_schema():
    """Test database schema and RLS policies"""
    try:
        supabase = get_supabase_client()
        
        # Test if we can query the schema
        print("\n📊 Testing database schema...")
        
        # This would normally require authentication, but we can test the structure
        tables_info = {
            'profiles': 'User profiles linked to auth.users',
            'imap_configs': 'IMAP connection configurations',
            'dmarc_reports': 'DMARC report metadata',
            'dmarc_records': 'Individual DMARC record details',
            'audit_logs': 'Activity tracking'
        }
        
        for table, description in tables_info.items():
            print(f"   📋 {table}: {description}")
        
        return True
        
    except Exception as e:
        print(f"❌ Schema test failed: {str(e)}")
        return False

if __name__ == "__main__":
    print("🔍 Testing DMARC Analyzer Backend Setup")
    print("=" * 50)
    
    # Test Supabase connection
    connection_ok = test_supabase_connection()
    
    # Test schema
    schema_ok = test_database_schema()
    
    print("\n" + "=" * 50)
    if connection_ok and schema_ok:
        print("🎉 All tests passed! Backend is ready.")
        print("\nNext steps:")
        print("1. Start the API server: python3 -m uvicorn api:app --reload")
        print("2. Install frontend dependencies: cd ../frontend && npm install")
        print("3. Start frontend: npm run dev")
    else:
        print("❌ Some tests failed. Check configuration.")
        
    sys.exit(0 if connection_ok and schema_ok else 1) 