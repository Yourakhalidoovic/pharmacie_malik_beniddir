#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${1:-/var/www/pharmacie}"
DOMAIN="${2:-pharmacie.example.com}"
WWW_DOMAIN="${3:-www.pharmacie.example.com}"

if [ "$(id -u)" -ne 0 ]; then
  echo "Run this script as root (sudo)."
  exit 1
fi

if ! command -v npm >/dev/null 2>&1; then
  echo "npm not found. Install Node.js 20 first."
  exit 1
fi

if ! command -v nginx >/dev/null 2>&1; then
  echo "nginx not found. Install nginx first."
  exit 1
fi

NPM_BIN="$(command -v npm)"

mkdir -p "$APP_DIR"
cd "$APP_DIR"

if [ ! -f "backend/package.json" ] || [ ! -f "frontend/package.json" ]; then
  echo "Project files not found in $APP_DIR"
  exit 1
fi

if [ ! -f "backend/.env.production" ]; then
  cp deployment/vps/env/backend.env.example backend/.env.production
fi

if [ ! -f "frontend/.env.production" ]; then
  sed "s|__DOMAIN__|$DOMAIN|g" deployment/vps/env/frontend.env.example > frontend/.env.production
fi

npm ci --prefix backend
npm ci --prefix frontend

export NODE_ENV=production
unset NEXT_STATIC_EXPORT
npm run build --prefix frontend

mkdir -p /etc/systemd/system

sed -e "s|__APP_DIR__|$APP_DIR|g" -e "s|__NPM_BIN__|$NPM_BIN|g" \
  deployment/vps/systemd/pharmacie-backend.service.template \
  > /etc/systemd/system/pharmacie-backend.service

sed -e "s|__APP_DIR__|$APP_DIR|g" -e "s|__NPM_BIN__|$NPM_BIN|g" \
  deployment/vps/systemd/pharmacie-frontend.service.template \
  > /etc/systemd/system/pharmacie-frontend.service

sed -e "s|__DOMAIN__|$DOMAIN|g" -e "s|__WWW_DOMAIN__|$WWW_DOMAIN|g" \
  deployment/nginx/pharmacie.vps.template.conf \
  > /etc/nginx/sites-available/pharmacie.conf

ln -sfn /etc/nginx/sites-available/pharmacie.conf /etc/nginx/sites-enabled/pharmacie.conf
nginx -t

systemctl daemon-reload
systemctl enable pharmacie-backend
systemctl enable pharmacie-frontend
systemctl restart pharmacie-backend
systemctl restart pharmacie-frontend
systemctl reload nginx

echo "Deployment completed."
echo "Backend service: systemctl status pharmacie-backend"
echo "Frontend service: systemctl status pharmacie-frontend"
