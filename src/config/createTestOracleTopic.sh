#!/bin/bash
docker run --rm --network kafka-cdc-stack_kafka-net bitnami/kafka:latest kafka-topics.sh --create \
  --bootstrap-server kafka:9092 \
  --replication-factor 1 \
  --partitions 4 \
  --topic 192_168_1_51.C__TESTCDC.TEST
