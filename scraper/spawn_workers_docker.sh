#!/bin/sh

# Just the docker run commands used to start up the worker instances

[ -z "$ROBINHOOD_USERNAME" ] && echo "You must set the ROBINHOOD_USERNAME environment variable" && exit 1
[ -z "$ROBINHOOD_PASSWORD" ] && echo "You must set the ROBINHOOD_PASSWORD environment variable" && exit 1
[ -z "$MFA_SECRET" ] && echo "You must set the MFA_SECRET environment variable" && exit 1

docker kill robintrack-scraper-popularity
docker rm robintrack-scraper-popularity
docker run -d --net host --name robintrack-scraper-popularity \
  robintrack-scraper \
  ./run_worker.sh popularity
docker kill robintrack-scraper-quotes
docker rm robintrack-scraper-quotes
docker run -d --net host --name robintrack-scraper-quotes \
  -e "ROBINHOOD_PASSWORD=$ROBINHOOD_PASSWORD" \
  -e "ROBINHOOD_USERNAME=$ROBINHOOD_USERNAME" \
  -e "MFA_SECRET=$MFA_SECRET" \
  robintrack-scraper \
  ./run_worker.sh quote
