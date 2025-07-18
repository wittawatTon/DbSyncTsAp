#!/bin/bash

source ./urlencode.sh

for connector in $(curl -s http://localhost:8083/connectors | jq -r '.[]'); do
  encoded_connector=$(urlencode "$connector")
  echo "==== Config for $connector ===="
  curl -s http://localhost:8083/connectors/$encoded_connector/status | jq
  echo ""
done
