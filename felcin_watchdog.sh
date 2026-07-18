#!/bin/bash
# Felcin watchdog — runs every 2 min via hPanel cron
# Checks if site is up; if not, signals Passenger to restart

LOG="/home/u461432591/.cagefs/tmp/felcin_watchdog.log"
RESTART_FILE="/home/u461432591/domains/felcin.com/nodejs/tmp/restart.txt"
MAX_LOG_LINES=300

log() {
  echo "$(date '+%Y-%m-%d %H:%M:%S') $1" >> "$LOG"
}

# Trim log
if [ -f "$LOG" ]; then
  tail -$MAX_LOG_LINES "$LOG" > "$LOG.tmp" && mv "$LOG.tmp" "$LOG"
fi

# Check HTTP response
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 https://felcin.com/ 2>/dev/null)

if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "301" ] || [ "$HTTP_CODE" = "302" ]; then
  # Site is up — log every 10th run to avoid log spam
  MINUTE=$(date +%M)
  if [ "$((10#$MINUTE % 20))" = "0" ]; then
    log "OK http=$HTTP_CODE"
  fi
  exit 0
fi

# Site is down
log "DOWN http=$HTTP_CODE — triggering Passenger restart"

# Signal Passenger to restart the app
date +%s > "$RESTART_FILE"

# Wait 20 seconds and check again
sleep 20
HTTP_CODE2=$(curl -s -o /dev/null -w "%{http_code}" --max-time 15 https://felcin.com/ 2>/dev/null)

if [ "$HTTP_CODE2" = "200" ] || [ "$HTTP_CODE2" = "301" ] || [ "$HTTP_CODE2" = "302" ]; then
  log "RECOVERED after restart signal http=$HTTP_CODE2"
else
  log "STILL DOWN after restart signal http=$HTTP_CODE2"
fi
