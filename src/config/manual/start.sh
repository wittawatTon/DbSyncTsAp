#!/bin/bash

echo "🟡 Starting containers..."
docker-compose up -d

echo "⏳ Waiting for Kafka Connect to be ready..."

# Wait for Kafka Connect REST API to be available
while ! curl -s http://localhost:8083/ | grep -q "version"; do
  sleep 3
  echo "🔄 Still waiting for Kafka Connect..."
done

echo "✅ Kafka Connect is ready."

# Create MySQL Source Connector
#echo "🚀 Creating MySQL connector..."
#curl -X POST -H "Content-Type: application/json" \
#  --data @mysql-connector.json \
#  http://localhost:8083/connectors

# Create PostgreSQL Sink Connector
#echo "🚀 Creating PostgreSQL connector..."
#curl -X POST -H "Content-Type: application/json" \
#  --data @postgresql-sink-connector.json \
#  http://localhost:8083/connectors
  
# Create mssql Sink Connector
#echo "🚀 Creating PostgreSQL connector..."
#curl -X POST -H "Content-Type: application/json" --data @mssql-sink-connector.json http://localhost:8083/connectors

#echo "✅ All connectors created successfully."
