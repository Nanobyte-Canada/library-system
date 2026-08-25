#!/usr/bin/env bash
# deploy/scripts/create-library-db.sh
# One-time: creates `library` database in existing Postgres instances.
# Run on home server before first deploy.
# Usage: bash deploy/scripts/create-library-db.sh
set -euo pipefail

echo "=== Creating library databases ==="

echo "Creating 'library' database in prod Postgres (port 15432)..."
if docker exec prod-postgres psql -U postgres -c "CREATE DATABASE library;" 2>/dev/null; then
    echo "  Database 'library' created in prod."
else
    echo "  Database 'library' already exists in prod (or container not running)."
fi

echo ""
echo "Creating 'library' database in UAT Postgres (port 25432)..."
if docker exec uat-postgres psql -U postgres -c "CREATE DATABASE library;" 2>/dev/null; then
    echo "  Database 'library' created in UAT."
else
    echo "  Database 'library' already exists in UAT (or container not running)."
fi

echo ""
echo "=== Done. Flyway migrations will run on first API startup. ==="
