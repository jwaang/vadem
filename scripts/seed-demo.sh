#!/usr/bin/env bash
# Seeds the Convex dev database with a demo account and sample data.
# Usage: pnpm seed-demo
#
# Creates:
#   Login:  test@test.com / test
#   Property: The Lake House (2 pets, 4 sections, contacts, vault items)
#   Trip: Active (started 2 days ago, ends in 5 days)
#   Sitter link: /t/<slug> (password: demo)

set -e

echo "🌱 Seeding demo account..."

echo "→ Deploying functions..."
npx convex dev --once

echo "→ Running seed..."
npx convex run seed:run --no-push

echo ""
echo "✓ Done! Sign in with: test@test.com / test"
