#!/usr/bin/env bash
# Clears data from a Convex database — all data or scoped to a single user.
# Usage: pnpm nuke-db <dev|prod> [--email <email>]

set -e

ENV="${1:-}"
shift || true

EMAIL=""
while [[ $# -gt 0 ]]; do
  case "$1" in
    --email)
      EMAIL="${2:-}"
      if [[ -z "$EMAIL" ]]; then
        echo "Error: --email requires an email address"
        exit 1
      fi
      shift 2
      ;;
    *)
      echo "Unknown argument: $1"
      exit 1
      ;;
  esac
done

if [[ "$ENV" != "dev" && "$ENV" != "prod" ]]; then
  echo "Usage: pnpm nuke-db <dev|prod> [--email <email>]"
  exit 1
fi

if [[ -n "$EMAIL" ]]; then
  # Scoped deletion — single user
  if [[ "$ENV" == "prod" ]]; then
    echo "🚨 This will delete all data for $EMAIL from the PRODUCTION database."
    read -r -p "Type the email to confirm: " confirm
    if [[ "$confirm" != "$EMAIL" ]]; then
      echo "Aborted."
      exit 0
    fi
  else
    echo "⚠️  This will delete all data for $EMAIL from the dev database."
    read -r -p "Type 'yes' to confirm: " confirm
    if [[ "$confirm" != "yes" ]]; then
      echo "Aborted."
      exit 0
    fi
  fi

  MUTATION="devClearAll:clearByEmail"
  ARGS="{\"email\":\"$EMAIL\"}"
else
  # Full wipe
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

  MUTATION="devClearAll:clearAllData"
  ARGS=""
fi

if [[ "$ENV" == "prod" ]]; then
  echo "→ Deploying functions to prod..."
  npx convex deploy --cmd 'echo skip'

  echo "→ Running $MUTATION on prod..."
  if [[ -n "$ARGS" ]]; then
    npx convex run "$MUTATION" "$ARGS" --prod --no-push
  else
    npx convex run "$MUTATION" --prod --no-push
  fi
else
  echo "→ Deploying functions to dev..."
  npx convex dev --once

  echo "→ Running $MUTATION on dev..."
  if [[ -n "$ARGS" ]]; then
    npx convex run "$MUTATION" "$ARGS" --no-push
  else
    npx convex run "$MUTATION" --no-push
  fi
fi

if [[ -n "$EMAIL" ]]; then
  echo "✓ Done. Deleted all data for $EMAIL from $ENV."
else
  echo "✓ Done. $ENV database is empty."
fi
