#!/usr/bin/env bash
# Clears all data and storage files from a Convex database.
# Usage: pnpm nuke-db dev    — nuke the dev deployment
#        pnpm nuke-db prod   — nuke the prod deployment (extra confirmation)

set -e

ENV="${1:-}"

if [[ "$ENV" != "dev" && "$ENV" != "prod" ]]; then
  echo "Usage: pnpm nuke-db <dev|prod>"
  exit 1
fi

if [[ "$ENV" == "prod" ]]; then
  echo "🚨 This will delete ALL data and files from the PRODUCTION database."
  read -r -p "Type the word 'nuke-prod' to confirm: " confirm
  if [[ "$confirm" != "nuke-prod" ]]; then
    echo "Aborted."
    exit 0
  fi
else
  echo "⚠️  This will delete ALL data and files from the dev database."
  read -r -p "Type 'yes' to confirm: " confirm
  if [[ "$confirm" != "yes" ]]; then
    echo "Aborted."
    exit 0
  fi
fi

if [[ "$ENV" == "prod" ]]; then
  echo "→ Deploying functions to prod..."
  npx convex deploy --cmd 'echo skip'

  echo "→ Nuking prod database and files..."
  npx convex run devClearAll:clearAllData --prod --no-push
else
  echo "→ Deploying functions to dev..."
  npx convex dev --once

  echo "→ Nuking dev database and files..."
  npx convex run devClearAll:clearAllData --no-push
fi

echo "✓ Done. $ENV database is empty."
