#!/bin/bash
docker compose down connect
./deleteTopic.sh
docker compose up connect -d
