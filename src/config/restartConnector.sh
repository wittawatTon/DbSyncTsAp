#!/bin/bash
connectors=$(curl -s http://localhost:8083/connectors)

source ./urlencode.sh

for connector in $(echo $connectors | jq -r '.[]'); do
  encoded_connector=$(urlencode "$connector")
  echo "Restarting connector: $connector"
  curl -X POST http://localhost:8083/connectors/$encoded_connector/restart
done
