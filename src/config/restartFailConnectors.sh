#!/bin/bash

source ./urlencode.sh

CONNECT_URL="http://localhost:8083"

connectors=$(curl -s "$CONNECT_URL/connectors" | jq -r '.[]')

for connector in $connectors; do
  encoded_connector=$(urlencode "$connector")
  echo "🔄 Restarting connector: $connector"
  curl -s -X POST "$CONNECT_URL/connectors/$encoded_connector/restart?includeTasks=true&onlyFailed=false" |jq 
  echo ""
done

echo "✅ All connectors restarted."
