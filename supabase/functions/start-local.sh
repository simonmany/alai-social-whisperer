#!/bin/bash

# Get the directory where the script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$SCRIPT_DIR/../.."

# Function to check if a variable is set and not empty
check_var() {
    local var_name="$1"
    local var_value="$2"
    if [ -z "$var_value" ]; then
        echo "Error: $var_name is not set or empty"
        return 1
    fi
    return 0
}

# Load environment variables from .env.edge file
if [ -f "$PROJECT_ROOT/.env.edge" ]; then
    echo "Loading environment variables from .env.edge"
    set -a
    source "$PROJECT_ROOT/.env.edge"
    set +a
else
    echo "Error: .env.edge file not found in project root"
    exit 1
fi

# Verify required environment variables
required_vars=(
    "DB_URL"
    "DB_SERVICE_ROLE_KEY"
    "DB_ANON_KEY"
    "GOOGLE_CLIENT_ID"
    "GOOGLE_CLIENT_SECRET"
)

echo "Checking required environment variables..."
has_error=0
for var in "${required_vars[@]}"; do
    eval value=\$$var
    if ! check_var "$var" "$value"; then
        has_error=1
    fi
done

if [ $has_error -eq 1 ]; then
    echo "Error: Missing required environment variables"
    exit 1
fi

# Enable debug logging for the Edge Functions
export DENO_ENV=development
export DEBUG=*

# Kill any existing supabase processes
if pgrep -f "supabase functions serve" > /dev/null; then
    echo "Killing existing supabase functions process..."
    pkill -f "supabase functions serve"
    sleep 2
fi

# Start both functions with debug output
echo "Starting Supabase Edge Functions..."
cd "$SCRIPT_DIR"

supabase functions serve store_auth calendar \
  --env-file "$PROJECT_ROOT/.env.edge" \
  --debug 2>&1 | tee /tmp/supabase-functions.log &

# Wait for the functions to start
echo "Waiting for functions to start..."
sleep 5

# Check if the functions are running
if ! pgrep -f "supabase functions serve" > /dev/null; then
    echo "Error: Functions failed to start. Check /tmp/supabase-functions.log for details"
    exit 1
fi

echo "Edge Functions are running!"
echo "Debug logs available at /tmp/supabase-functions.log"