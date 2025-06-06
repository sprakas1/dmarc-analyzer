# DMARC Analyzer

[![Deploy to DigitalOcean](https://github.com/sprakas1/dmarc-analyzer/actions/workflows/deploy.yml/badge.svg)](https://github.com/sprakas1/dmarc-analyzer/actions/workflows/deploy.yml)

A comprehensive DMARC report analysis platform that automatically ingests, parses, and visualizes DMARC reports to help organizations monitor email authentication and security.

## 🚀 Features

- **Automated IMAP Polling**: Connect your mailbox to automatically fetch DMARC reports
- **Comprehensive Parsing**: Extract all relevant data from DMARC XML reports
- **Secure Storage**: Encrypted storage with Supabase backend
- **User Authentication**: Secure email/password authentication
- **Multi-Domain Support**: Manage DMARC reports for multiple domains
- **Audit Logging**: Track all user actions for compliance
- **Export Capabilities**: Export aggregated data in CSV/JSON formats
- **Row Level Security**: Multi-tenant data isolation

## 🏗️ Architecture

- **Backend**: Python with Supabase integration
- **Database**: PostgreSQL via Supabase (managed)
- **Authentication**: Supabase Auth
- **Email Processing**: IMAP polling with lxml XML parsing
- **Security**: Row Level Security (RLS) policies

## 📋 Prerequisites

- Python 3.9+
- Supabase account
- IMAP-enabled email account for DMARC reports

## 🛠️ Setup

### Backend Setup

1. **Clone and navigate to the project**:
   ```bash
   cd backend
   ```

2. **Create and activate virtual environment**:
   ```bash
   python3 -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

4. **Configure environment**:
   Create a `.env` file in the `backend` directory:
   ```env
   SUPABASE_URL=https://kvbqrdcehjrkoffzjfmh.supabase.co
   SUPABASE_KEY=your-supabase-anon-key
   
   # For testing
   IMAP_HOST=imap.gmail.com
   IMAP_USER=your-email@gmail.com
   IMAP_PASS=your-app-password
   TEST_USER_ID=your-test-user-uuid
   ```

### Database Schema

The project uses a comprehensive schema with the following tables:

- **profiles**: User accounts extending Supabase auth
- **imap_configs**: IMAP connection configurations
- **dmarc_reports**: DMARC report metadata and summaries
- **dmarc_records**: Individual record data from reports
- **audit_logs**: User action tracking

Key features:
- Row Level Security (RLS) for multi-tenant isolation
- Automatic profile creation on user signup
- Foreign key relationships for data integrity
- Indexes for optimal query performance

## 📊 Database Design

```sql
-- Core tables
profiles (extends auth.users)
├── imap_configs (1:N)
├── dmarc_reports (1:N)
│   └── dmarc_records (1:N)
└── audit_logs (1:N)
```

## 🔧 Usage

### Running DMARC Ingestion

```bash
cd backend
source venv/bin/activate
python dmarc_ingest.py
```

The ingestion script will:
1. Connect to your IMAP server
2. Fetch unread DMARC report emails
3. Extract and decompress XML attachments
4. Parse DMARC data into structured format
5. Store reports and records in the database
6. Mark emails as read
7. Log all actions for audit purposes

### Key Components

#### DMARC Parser (`dmarc_parser.py`)
- Handles ZIP/GZIP compressed attachments
- Comprehensive XML parsing following DMARC spec
- Extracts metadata, policy info, and individual records
- Calculates pass/fail statistics

#### Database Integration (`config.py`)
- Supabase client setup and configuration
- Environment variable management
- Connection pooling and error handling

#### Ingestion Engine (`dmarc_ingest.py`)
- IMAP connection and email fetching
- Batch processing of DMARC reports
- Error handling and recovery
- Audit logging for all operations

## 🔒 Security Features

- **Row Level Security**: Users can only access their own data
- **Password Encryption**: IMAP passwords stored encrypted
- **Audit Logging**: All user actions tracked
- **Input Validation**: Comprehensive validation of all inputs
- **SQL Injection Protection**: Parameterized queries only

## 📈 Monitoring & Analytics

The system tracks:
- Total DMARC compliance rates
- Domain-specific authentication results
- Source IP analysis
- SPF/DKIM failure patterns
- Policy evaluation trends

## 🚦 Status

**Current**: MVP with core ingestion and storage functionality
**Next**: Frontend dashboard and visualization components

## 🤝 Contributing

This project follows production-ready development practices:
- Comprehensive error handling
- Detailed logging
- Type hints throughout
- Modular architecture
- Security-first design

## 📝 Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `SUPABASE_URL` | Supabase project URL | Yes |
| `SUPABASE_KEY` | Supabase anon key | Yes |
| `IMAP_HOST` | IMAP server hostname | For testing |
| `IMAP_USER` | IMAP username | For testing |
| `IMAP_PASS` | IMAP password | For testing |
| `TEST_USER_ID` | Test user UUID | For testing |

## 🔍 Troubleshooting

Common issues and solutions:
- **IMAP Connection Failed**: Check credentials and enable "Less secure app access" for Gmail
- **Permission Denied**: Ensure proper RLS policies are in place
- **XML Parsing Errors**: Check DMARC report format validity
- **Database Connection Issues**: Verify Supabase URL and API key

## 📄 License

This project is designed for production use with enterprise-grade security and scalability considerations.

## 🚀 Deployment

This application auto-deploys to DigitalOcean droplet via GitHub Actions on every push to main branch.

**Live Application**: https://dmarc.sharanprakash.me 