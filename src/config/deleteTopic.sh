#!/bin/bash
docker run --rm --network kafka-cdc-stack_kafka-net bitnami/kafka:latest kafka-topics.sh --bootstrap-server kafka:9092 --list \
  | grep -v '^_' \
  | xargs -I{} docker run --rm --network kafka-cdc-stack_kafka-net bitnami/kafka:latest kafka-topics.sh --bootstrap-server kafka:9092 --delete --topic {}

# สร้าง connect-offsets
docker run --rm --network kafka-cdc-stack_kafka-net bitnami/kafka:latest kafka-topics.sh --bootstrap-server kafka:9092 --create --topic connect-offsets --partitions 1 --replication-factor 1 --config cleanup.policy=compact

# สร้าง connect-configs
docker run --rm --network kafka-cdc-stack_kafka-net bitnami/kafka:latest kafka-topics.sh --bootstrap-server kafka:9092 --create --topic connect-configs --partitions 1 --replication-factor 1 --config cleanup.policy=compact

# สร้าง connect-status
docker run --rm --network kafka-cdc-stack_kafka-net bitnami/kafka:latest kafka-topics.sh --bootstrap-server kafka:9092 --create --topic connect-status --partitions 1 --replication-factor 1 --config cleanup.policy=compact

