import uvicorn
from api import app
from scheduler import start_background_scheduler
import logging

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

if __name__ == "__main__":
    # Start the background scheduler for automated daily processing
    logger.info("Starting DMARC automated scheduler")
    start_background_scheduler()
    
    # Start the FastAPI application
    uvicorn.run(app, host="0.0.0.0", port=8001) 