import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Basic health check - you can add more checks here if needed
    // Like database connectivity, external API checks, etc.
    
    return NextResponse.json(
      {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        service: 'dmarc-analyzer-frontend'
      },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        service: 'dmarc-analyzer-frontend',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 