#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
FASTAPI_PORT=8001
FRONTEND_PORT=3000
MAX_RETRIES=5
RETRY_DELAY=2
FASTAPI_PID_FILE="backend/.fastapi.pid"
FRONTEND_PID_FILE="frontend/.nextjs.pid"

# Help function
show_help() {
    echo "🚀 DMARC Analyzer Service Manager"
    echo "================================"
    echo "Usage: $0 [OPTION]"
    echo ""
    echo "Options:"
    echo "  start     Start both backend and frontend services (default)"
    echo "  stop      Stop all running services"
    echo "  restart   Stop and start services"
    echo "  status    Check service status"
    echo "  logs      View service logs"
    echo "  --force   Force start (kill existing processes)"
    echo "  --help    Show this help message"
    echo ""
    echo "Services:"
    echo "  Backend:  FastAPI server on port $FASTAPI_PORT"
    echo "  Frontend: Next.js server on port $FRONTEND_PORT"
    echo ""
}

# Function to check if FastAPI is running and healthy
check_fastapi_status() {
    if [ -f "$FASTAPI_PID_FILE" ]; then
        local pid=$(cat "$FASTAPI_PID_FILE")
        if ps -p $pid > /dev/null 2>&1; then
            if curl -s "http://localhost:$FASTAPI_PORT/health" > /dev/null 2>&1; then
                echo -e "${GREEN}✅ FastAPI is running (PID: $pid) and healthy${NC}"
                return 0
            else
                echo -e "${YELLOW}⚠️  FastAPI process exists (PID: $pid) but not responding${NC}"
                return 1
            fi
        else
            echo -e "${YELLOW}⚠️  Stale FastAPI PID file found, removing...${NC}"
            rm -f "$FASTAPI_PID_FILE"
            return 1
        fi
    fi
    
    # Check if something else is using the port
    if lsof -i :$FASTAPI_PORT > /dev/null 2>&1; then
        echo -e "${YELLOW}⚠️  Port $FASTAPI_PORT is in use by another process:${NC}"
        lsof -i :$FASTAPI_PORT
        return 1
    fi
    
    echo -e "${BLUE}ℹ️  FastAPI is not running${NC}"
    return 1
}

# Function to check if Frontend is running and healthy
check_frontend_status() {
    if [ -f "$FRONTEND_PID_FILE" ]; then
        local pid=$(cat "$FRONTEND_PID_FILE")
        if ps -p $pid > /dev/null 2>&1; then
            if curl -s "http://localhost:$FRONTEND_PORT" > /dev/null 2>&1; then
                echo -e "${GREEN}✅ Frontend is running (PID: $pid) and healthy${NC}"
                return 0
            else
                echo -e "${YELLOW}⚠️  Frontend process exists (PID: $pid) but not responding${NC}"
                return 1
            fi
        else
            echo -e "${YELLOW}⚠️  Stale Frontend PID file found, removing...${NC}"
            rm -f "$FRONTEND_PID_FILE"
            return 1
        fi
    fi
    
    # Check if something else is using the port
    if lsof -i :$FRONTEND_PORT > /dev/null 2>&1; then
        echo -e "${YELLOW}⚠️  Port $FRONTEND_PORT is in use by another process:${NC}"
        lsof -i :$FRONTEND_PORT
        return 1
    fi
    
    echo -e "${BLUE}ℹ️  Frontend is not running${NC}"
    return 1
}

# Function to stop FastAPI service
stop_fastapi() {
    echo "🛑 Stopping FastAPI service..."
    
    if [ -f "$FASTAPI_PID_FILE" ]; then
        local pid=$(cat "$FASTAPI_PID_FILE")
        if ps -p $pid > /dev/null 2>&1; then
            echo "Stopping FastAPI process (PID: $pid)..."
            kill $pid
            sleep 2
            
            # Force kill if still running
            if ps -p $pid > /dev/null 2>&1; then
                echo "Force stopping FastAPI process..."
                kill -9 $pid
            fi
        fi
        rm -f "$FASTAPI_PID_FILE"
    fi
    
    # Kill any remaining processes on the FastAPI port
    local processes=$(lsof -ti :$FASTAPI_PORT 2>/dev/null)
    if [ ! -z "$processes" ]; then
        echo "Killing processes on port $FASTAPI_PORT..."
        echo $processes | xargs kill -9 2>/dev/null || true
    fi
    
    # Also kill any processes on port 8000 (legacy/conflicting processes)
    local processes_8000=$(lsof -ti :8000 2>/dev/null)
    if [ ! -z "$processes_8000" ]; then
        echo "Killing conflicting processes on port 8000..."
        echo $processes_8000 | xargs kill -9 2>/dev/null || true
    fi
    
    echo -e "${GREEN}✅ FastAPI service stopped${NC}"
}

# Function to stop Frontend service
stop_frontend() {
    echo "🛑 Stopping Frontend service..."
    
    if [ -f "$FRONTEND_PID_FILE" ]; then
        local pid=$(cat "$FRONTEND_PID_FILE")
        if ps -p $pid > /dev/null 2>&1; then
            echo "Stopping Frontend process (PID: $pid)..."
            kill $pid
            sleep 2
            
            # Force kill if still running
            if ps -p $pid > /dev/null 2>&1; then
                echo "Force stopping Frontend process..."
                kill -9 $pid
            fi
        fi
        rm -f "$FRONTEND_PID_FILE"
    fi
    
    # Kill any remaining processes on the port
    local processes=$(lsof -ti :$FRONTEND_PORT 2>/dev/null)
    if [ ! -z "$processes" ]; then
        echo "Killing processes on port $FRONTEND_PORT..."
        echo $processes | xargs kill -9 2>/dev/null || true
    fi
    
    echo -e "${GREEN}✅ Frontend service stopped${NC}"
}

# Function to stop all services
stop_all_services() {
    stop_fastapi
    stop_frontend
}

# Function to check if a port is in use
check_port() {
    local port=$1
    if lsof -i :$port > /dev/null 2>&1; then
        return 1
    fi
    return 0
}

# Function to wait for service to be ready
wait_for_service() {
    local port=$1
    local service_name=$2
    local retries=0
    
    while [ $retries -lt $MAX_RETRIES ]; do
        if curl -s "http://localhost:$port/health" > /dev/null 2>&1; then
            echo -e "${GREEN}✅ $service_name is ready on port $port${NC}"
            return 0
        fi
        retries=$((retries + 1))
        echo -e "${YELLOW}⏳ Waiting for $service_name to start (attempt $retries/$MAX_RETRIES)${NC}"
        sleep $RETRY_DELAY
    done
    
    echo -e "${RED}❌ $service_name failed to start after $MAX_RETRIES attempts${NC}"
    return 1
}

# Function to start FastAPI service
start_fastapi() {
    echo "🚀 Starting FastAPI server..."
    
    # Check if we're in the right directory
    if [ ! -d "backend" ]; then
        echo -e "${RED}❌ Error: Must be run from project root directory${NC}"
        exit 1
    fi
    
    # Check Python version
    if ! command -v python3 &> /dev/null; then
        echo -e "${RED}❌ Error: Python 3 is not installed${NC}"
        exit 1
    fi
    
    # Verify virtual environment
    if [ ! -d "backend/.venv" ]; then
        echo "📦 Creating virtual environment..."
        python3 -m venv backend/.venv
    fi
    
    # Activate virtual environment
    source backend/.venv/bin/activate || {
        echo -e "${RED}❌ Failed to activate virtual environment${NC}"
        exit 1
    }
    
    # Install dependencies
    echo "📥 Installing dependencies..."
    pip install -r backend/requirements.txt || {
        echo -e "${RED}❌ Failed to install dependencies${NC}"
        exit 1
    }
    
    # Start FastAPI server
    echo "🚀 Starting FastAPI server on port $FASTAPI_PORT..."
    cd backend
    # Set PORT environment variable for main.py
    export PORT=$FASTAPI_PORT
    nohup python main.py > ../fastapi.log 2>&1 &
    FASTAPI_PID=$!
    echo $FASTAPI_PID > "../$FASTAPI_PID_FILE"
    cd ..
    
    # Wait for FastAPI server to be ready
    wait_for_service $FASTAPI_PORT "FastAPI server" || {
        echo -e "${RED}❌ FastAPI server failed to start${NC}"
        echo "Check fastapi.log for details:"
        tail -10 fastapi.log
        stop_fastapi
        exit 1
    }
    
    echo -e "\n${GREEN}✅ FastAPI server started successfully!${NC}"
    echo "FastAPI server running on http://localhost:$FASTAPI_PORT"
    echo "Logs are written to fastapi.log"
    echo "PID: $FASTAPI_PID"
}

# Function to start Frontend service
start_frontend() {
    echo "🚀 Starting Frontend server..."
    
    # Check if we're in the right directory
    if [ ! -d "frontend" ]; then
        echo -e "${RED}❌ Error: Must be run from project root directory${NC}"
        exit 1
    fi
    
    # Check Node.js version
    if ! command -v node &> /dev/null; then
        echo -e "${RED}❌ Error: Node.js is not installed${NC}"
        exit 1
    fi
    
    # Check if npm/yarn is available
    if ! command -v npm &> /dev/null; then
        echo -e "${RED}❌ Error: npm is not installed${NC}"
        exit 1
    fi
    
    # Install dependencies if node_modules doesn't exist
    if [ ! -d "frontend/node_modules" ]; then
        echo "📦 Installing frontend dependencies..."
        cd frontend
        npm install || {
            echo -e "${RED}❌ Failed to install frontend dependencies${NC}"
            exit 1
        }
        cd ..
    fi
    
    # Start Frontend server
    echo "🚀 Starting Next.js server on port $FRONTEND_PORT..."
    cd frontend
    nohup npm run dev > ../frontend.log 2>&1 &
    FRONTEND_PID=$!
    echo $FRONTEND_PID > "../$FRONTEND_PID_FILE"
    cd ..
    
    # Wait for Frontend server to be ready
    wait_for_service $FRONTEND_PORT "Frontend server" || {
        echo -e "${RED}❌ Frontend server failed to start${NC}"
        echo "Check frontend.log for details:"
        tail -10 frontend.log
        stop_frontend
        exit 1
    }
    
    echo -e "\n${GREEN}✅ Frontend server started successfully!${NC}"
    echo "Frontend server running on http://localhost:$FRONTEND_PORT"
    echo "Logs are written to frontend.log"
    echo "PID: $FRONTEND_PID"
}

# Parse command line arguments
COMMAND="start"
FORCE=false

while [[ $# -gt 0 ]]; do
    case $1 in
        start|stop|restart|status|logs)
            COMMAND=$1
            shift
            ;;
        --force)
            FORCE=true
            shift
            ;;
        --help|-h)
            show_help
            exit 0
            ;;
        *)
            echo -e "${RED}❌ Unknown option: $1${NC}"
            show_help
            exit 1
            ;;
    esac
done

echo "🚀 DMARC Analyzer Service Manager"
echo "=================================="

case $COMMAND in
    status)
        echo "🔍 Checking service status..."
        check_fastapi_status
        check_frontend_status
        ;;
    logs)
        echo "📋 Service Logs"
        echo "==============="
        echo ""
        
        if [ -f "fastapi.log" ]; then
            echo -e "${BLUE}📝 Backend logs (last 20 lines):${NC}"
            echo "─────────────────────────────────"
            tail -n 20 fastapi.log
            echo ""
        else
            echo -e "${YELLOW}⚠️  No backend logs found (fastapi.log)${NC}"
        fi
        
        if [ -f "frontend.log" ]; then
            echo -e "${BLUE}📝 Frontend logs (last 20 lines):${NC}"
            echo "──────────────────────────────────"
            tail -n 20 frontend.log
            echo ""
        else
            echo -e "${YELLOW}⚠️  No frontend logs found (frontend.log)${NC}"
        fi
        
        echo -e "${GREEN}💡 Tips:${NC}"
        echo "  View live backend logs:  tail -f fastapi.log"
        echo "  View live frontend logs: tail -f frontend.log"
        echo "  View both logs live:     tail -f fastapi.log frontend.log"
        ;;
    stop)
        stop_all_services
        ;;
    restart)
        stop_all_services
        sleep 1
        start_fastapi
        start_frontend
        ;;
    start)
        # Check current status
        FASTAPI_RUNNING=false
        FRONTEND_RUNNING=false
        
        if check_fastapi_status > /dev/null 2>&1; then
            FASTAPI_RUNNING=true
        fi
        
        if check_frontend_status > /dev/null 2>&1; then
            FRONTEND_RUNNING=true
        fi
        
        if [ "$FASTAPI_RUNNING" = true ] && [ "$FRONTEND_RUNNING" = true ] && [ "$FORCE" = false ]; then
            echo -e "${BLUE}ℹ️  Both services are already running. Use 'restart' or '--force' to restart.${NC}"
            exit 0
        fi
        
        if [ "$FORCE" = true ]; then
            echo "🔄 Force starting - stopping existing processes..."
            stop_all_services
            sleep 1
        fi
        
        # Start services
        if [ "$FASTAPI_RUNNING" = false ] || [ "$FORCE" = true ]; then
            start_fastapi
        fi
        
        if [ "$FRONTEND_RUNNING" = false ] || [ "$FORCE" = true ]; then
            start_frontend
        fi
        
        echo -e "\n${GREEN}✅ Services management commands:${NC}"
        echo "  Stop:    $0 stop"
        echo "  Restart: $0 restart"
        echo "  Status:  $0 status"
        echo ""
        echo -e "${GREEN}🌐 Application URLs:${NC}"
        echo "  Frontend: http://localhost:$FRONTEND_PORT"
        echo "  Backend:  http://localhost:$FASTAPI_PORT"
        echo "  Health:   http://localhost:$FASTAPI_PORT/health"
        echo ""
        echo "Press Ctrl+C to stop monitoring (services will continue running)"
        
        # Monitor the services
        trap "echo -e '\n${BLUE}ℹ️  Services are still running. Use: $0 stop${NC}'; exit" SIGINT SIGTERM
        
        while true; do
            FASTAPI_OK=true
            FRONTEND_OK=true
            
            if ! check_fastapi_status > /dev/null 2>&1; then
                FASTAPI_OK=false
            fi
            
            if ! check_frontend_status > /dev/null 2>&1; then
                FRONTEND_OK=false
            fi
            
            if [ "$FASTAPI_OK" = false ] || [ "$FRONTEND_OK" = false ]; then
                echo -e "${RED}❌ One or more services stopped unexpectedly${NC}"
                if [ "$FASTAPI_OK" = false ]; then
                    echo -e "${RED}   - FastAPI service stopped${NC}"
                fi
                if [ "$FRONTEND_OK" = false ]; then
                    echo -e "${RED}   - Frontend service stopped${NC}"
                fi
                break
            fi
            sleep 10
        done
        ;;
esac 