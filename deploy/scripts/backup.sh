#!/usr/bin/env bash
# deploy/scripts/backup.sh
# Nightly backup of library database from existing Postgres containers.
# Shares Postgres containers with pc repo — reads POSTGRES_USER from portfolio .env files.
# Cron: 15 3 * * * /opt/library/deploy/scripts/backup.sh >> /opt/library/backups/backup.log 2>&1
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
    local db_user="$2"
    local container="${env}-postgres"

    mkdir -p "${BACKUP_DIR}/${env}/daily" "${BACKUP_DIR}/${env}/weekly"

    local daily_file="${BACKUP_DIR}/${env}/daily/library-${DATE}.sql.gz"

    log "Backing up ${env} library database..."

    docker exec "${container}" pg_dump -U "${db_user}" library | gzip > "${daily_file}"

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

# Source env files to get credentials (same Postgres containers as pc repo)
if [ -f /opt/portfolio/prod/.env ]; then
    # shellcheck disable=SC1091
    source /opt/portfolio/prod/.env
    backup_db "prod" "${POSTGRES_USER}"
else
    log "WARNING: /opt/portfolio/prod/.env not found, skipping prod backup"
fi

if [ -f /opt/portfolio/uat/.env ]; then
    # Save prod user, load UAT
    PROD_USER="${POSTGRES_USER:-}"
    # shellcheck disable=SC1091
    source /opt/portfolio/uat/.env
    backup_db "uat" "${POSTGRES_USER}"
    # Restore prod user
    POSTGRES_USER="${PROD_USER}"
else
    log "WARNING: /opt/portfolio/uat/.env not found, skipping UAT backup"
fi

log "=== Library backups complete ==="
