# Backend Setup

## Purpose
Handles IMAP polling, DMARC XML parsing, and ingestion to Supabase.

## Setup
1. Create and activate a Python virtual environment:
   ```sh
   python3 -m venv venv
   source venv/bin/activate
   ```
2. Install dependencies:
   ```sh
   pip install -r requirements.txt
   ```
3. Create a `.env` file in this directory with:
   ```
   SUPABASE_URL=your-supabase-url-here
   SUPABASE_KEY=your-supabase-api-key-here
   ```
