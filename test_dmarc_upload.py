#!/usr/bin/env python3
"""
Test script to upload and parse DMARC XML file
Usage: python test_dmarc_upload.py
"""

import requests
import json

# Configuration
API_BASE_URL = "http://127.0.0.1:8001"
XML_FILE_PATH = "google.com!looshiglobal.com!1748822400!1748908799.xml"

def authenticate():
    """Authenticate and get token"""
    auth_url = f"{API_BASE_URL}/api/test/auth"
    credentials = {
        "username": "sharan",
        "password": "sharan"
    }
    
    response = requests.post(auth_url, json=credentials)
    if response.status_code == 200:
        return response.json()["access_token"]
    else:
        print(f"Authentication failed: {response.status_code} - {response.text}")
        return None

def upload_dmarc_xml(token, xml_content):
    """Upload and parse DMARC XML"""
    parse_url = f"{API_BASE_URL}/api/test/parse-dmarc"
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    
    data = {
        "xml_data": xml_content
    }
    
    response = requests.post(parse_url, headers=headers, json=data)
    return response

def main():
    print("DMARC XML Upload Test")
    print("=" * 50)
    
    # Read XML file
    try:
        with open(XML_FILE_PATH, 'r', encoding='utf-8') as f:
            xml_content = f.read()
        print(f"✅ Read XML file: {XML_FILE_PATH}")
    except FileNotFoundError:
        print(f"❌ XML file not found: {XML_FILE_PATH}")
        return
    except Exception as e:
        print(f"❌ Error reading XML file: {e}")
        return
    
    # Authenticate
    print("\n🔐 Authenticating...")
    token = authenticate()
    if not token:
        return
    print("✅ Authentication successful")
    
    # Upload and parse XML
    print("\n📤 Uploading and parsing DMARC XML...")
    response = upload_dmarc_xml(token, xml_content)
    
    if response.status_code == 200:
        result = response.json()
        print("✅ DMARC report parsed and stored successfully!")
        print(f"📊 Report ID: {result['report_id']}")
        print(f"📊 Summary:")
        summary = result['summary']
        print(f"   - Organization: {summary['org_name']}")
        print(f"   - Domain: {summary['domain']}")
        print(f"   - Total Records: {summary['total_records']}")
        print(f"   - Passed: {summary['pass_count']}")
        print(f"   - Failed: {summary['fail_count']}")
    else:
        print(f"❌ Upload failed: {response.status_code}")
        print(f"Error: {response.text}")

if __name__ == "__main__":
    main() 