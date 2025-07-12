#!/usr/bin/env bash

# Get raw connector list
raw_connectors=$(curl -s http://localhost:8083/connectors)

# Remove JSON formatting and split properly
connectors=$(echo "$raw_connectors" | sed 's/\[//g; s/\]//g; s/"//g' | tr ',' '\n' | sed 's/^ *//; s/ *$//')

# Check if empty
if [ -z "$connectors" ]; then
  echo "No connectors found"
  exit 0
fi

echo "Found connectors:"
echo "$connectors"

# Process each connector
while read -r connector; do
  if [ -n "$connector" ]; then
    echo "Deleting $connector"
    response=$(curl -s -o /dev/null -w "%{http_code}" -X DELETE "http://localhost:8083/connectors/$connector")
    
    if [ "$response" -eq 204 ]; then
      echo "Successfully deleted $connector"
    elif [ "$response" -eq 404 ]; then
      echo "Connector $connector not found (may have been already deleted)"
    else
      echo "Failed to delete $connector, HTTP status code: $response"
    fi
  fi
done <<< "$connectors"