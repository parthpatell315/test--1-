#!/bin/bash

# ==============================================================================
# YouthCamping OS - Automated VPS Production Deployment Script
# ==============================================================================
# Origin MUST point at the production GitHub repo before running this script:
#   https://github.com/techyouthcamping-ship-it/YouthCamping.git
#   git remote set-url origin https://github.com/techyouthcamping-ship-it/YouthCamping.git
# ycadmin is a normal folder in this repo (not a git submodule).
# ==============================================================================
set -e

echo "🚀 [1/5] Pulling latest updates from GitHub..."
git pull origin main

echo "📦 [2/5] Building Admin Panel (ycadmin)..."
cd ycadmin
npm install --no-audit
npm run build
cd ..

echo "🌐 [3/5] Building Next.js Public Website (frontend)..."
cd frontend
export NEXT_PUBLIC_API_URL="${NEXT_PUBLIC_API_URL:-https://api.youthcamping.online/api}"
npm install --no-audit
npm run build
cd ..

echo "⚙️ [4/5] Updating Backend & Prisma Client..."
cd backend
npm install --no-audit
npx prisma generate
# WARNING: The scripts below write/mutate production DB data (seeds, checklist
# sync, media asset fixes). They must NOT run on every deploy. Opt in only when
# intentionally needed: RUN_POST_DEPLOY_SEEDS=1 ./deploy_vps.sh
if [ "${RUN_POST_DEPLOY_SEEDS:-0}" = "1" ]; then
  echo "⚠️  RUN_POST_DEPLOY_SEEDS=1 — running DB mutation scripts..."
  node src/scripts/seedRealTripSops.js || true
  node src/scripts/syncChecklistsWithSops.js || true
  node src/scripts/fixMediaAssets.js || true
else
  echo "⏭️  Skipping post-deploy DB seeds/mutations (set RUN_POST_DEPLOY_SEEDS=1 to run)."
fi
cd ..

echo "🔁 [5/5] Reloading PM2 services with updated bundle..."
pm2 restart youthcamping-backend --update-env || true
if pm2 describe youthcamping-web >/dev/null 2>&1; then
  pm2 reload youthcamping-web --update-env
else
  pm2 start frontend/ecosystem.config.js
fi
pm2 save

echo "=============================================================================="
echo "✅ VPS Update Completed Successfully!"
echo "=============================================================================="
pm2 status
