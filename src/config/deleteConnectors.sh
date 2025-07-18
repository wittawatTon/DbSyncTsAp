#!/bin/bash

source ./urlencode.sh

for connector in $(curl -s http://localhost:8083/connectors | jq -r '.[]'); do
  encoded_connector=$(urlencode "$connector")
  echo "Deleting connector: $connector"
  curl -X DELETE "http://localhost:8083/connectors/$encoded_connector"
  echo ""
done
