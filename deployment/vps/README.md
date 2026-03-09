# VPS Deployment (MobaXterm Ready)

Use this guide when your VPS IP/domain is ready.

## 1) Prepare package on Windows

From `D:\pharmacie` PowerShell:

```powershell
powershell -ExecutionPolicy Bypass -File deployment/vps/scripts/package-for-vps.ps1
```

This creates `pharmacie-release.tgz`.

## 2) Upload with MobaXterm

- Connect via SSH to your server (for example `root@YOUR_SERVER_IP`).
- Upload `pharmacie-release.tgz` to `/root/`.

## 3) Extract on server

```bash
sudo mkdir -p /var/www/pharmacie
sudo tar -xzf /root/pharmacie-release.tgz -C /var/www/pharmacie
cd /var/www/pharmacie
```

## 4) First install requirements on VPS (one time)

Ubuntu/Debian example:

```bash
sudo apt update
sudo apt install -y nginx curl
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
```

## 5) Run one-shot install/deploy script

```bash
cd /var/www/pharmacie
sudo bash deployment/vps/scripts/install-or-update.sh /var/www/pharmacie pharmaciebeniddirmalik.dz www.pharmaciebeniddirmalik.dz
```

## 6) Check services

```bash
sudo systemctl status pharmacie-backend --no-pager
sudo systemctl status pharmacie-frontend --no-pager
sudo nginx -t
```

## 7) Enable HTTPS when DNS points to VPS

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d pharmaciebeniddirmalik.dz -d www.pharmaciebeniddirmalik.dz
```

## Quick update tomorrow (after code changes)

1. Re-run package script on Windows.
2. Upload new `pharmacie-release.tgz`.
3. On VPS:

```bash
sudo tar -xzf /root/pharmacie-release.tgz -C /var/www/pharmacie
cd /var/www/pharmacie
sudo bash deployment/vps/scripts/install-or-update.sh /var/www/pharmacie pharmaciebeniddirmalik.dz www.pharmaciebeniddirmalik.dz
```
