#!/usr/bin/env bash
# deploy/scripts/backup.sh
# Nightly backup of library database from existing Postgres containers.
# Cron: 0 3 * * * /opt/library/scripts/backup.sh >> /opt/library/backups/backup.log 2>&1
set -euo pipefail

BACKUP_DIR="/opt/library/backups"
DATE=$(date +%Y-%m-%d)
DAY_OF_WEEK=$(date +%u)  # 1=Monday, 7=Sunday
DAILY_RETENTION=7
WEEKLY_RETENTION=30

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

backup_db() {
    local env="$1"
    local container="${env}-postgres"

    mkdir -p "${BACKUP_DIR}/${env}/daily" "${BACKUP_DIR}/${env}/weekly"

    local daily_file="${BACKUP_DIR}/${env}/daily/library-${DATE}.sql.gz"

    log "Backing up ${env} library database..."

    docker exec "${container}" pg_dump -U postgres library | gzip > "${daily_file}"

    local size
    size=$(du -h "${daily_file}" | cut -f1)
    log "  Created: ${daily_file} (${size})"

    # Weekly backup on Sundays
    if [ "${DAY_OF_WEEK}" -eq 7 ]; then
        local weekly_file="${BACKUP_DIR}/${env}/weekly/library-${DATE}.sql.gz"
        cp "${daily_file}" "${weekly_file}"
        log "  Weekly backup: ${weekly_file}"
    fi

    # Cleanup
    find "${BACKUP_DIR}/${env}/daily" -name "*.sql.gz" -mtime +${DAILY_RETENTION} -delete
    find "${BACKUP_DIR}/${env}/weekly" -name "*.sql.gz" -mtime +${WEEKLY_RETENTION} -delete
}

log "=== Starting library database backups ==="

backup_db "prod"
backup_db "uat"

log "=== Library backups complete ==="
