#!/bin/bash

# Get the function name from the first argument
FUNCTION_NAME=$1

if [ -z "$FUNCTION_NAME" ]; then
  echo "Please provide a function name"
  echo "Usage: ./start-local.sh <function-name>"
  exit 1
fi

# Check if .env.deno exists
if [ ! -f "../../.env.deno" ]; then
  echo "Error: .env.deno file not found"
  echo "Please create .env.deno file with required environment variables"
  exit 1
fi

# Start the function with .env.deno
cd ../..
supabase functions serve $FUNCTION_NAME --env-file .env.deno