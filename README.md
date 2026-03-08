# Pharmacie Malik Beniddir E-commerce

Plateforme web pour **Pharmacie Malik Beniddir** avec:

- Frontend: Next.js (React) + Tailwind CSS
- Backend: Node.js + Express
- Base de données: SQLite3

## Fonctionnalités livrées

- Accueil premium inspiré du style storefront
- Catalogue produits parapharmaceutiques
- Détail produit avec ajout panier
- Panier + checkout (commande e-commerce)
- API REST avec seed de données pharmacie

## Démarrage

Depuis la racine:

```bash
npm install
npm run dev
```

- Frontend: http://localhost:3000
- API: http://localhost:4000

## Endpoints API

- `GET /api/health`
- `GET /api/products`
- `GET /api/products/:slug`
- `POST /api/orders`
- `GET /api/stats`

## Variables d'environnement frontend

Créer `frontend/.env.local` (optionnel):

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:4000
```

## Note sur Saleor Storefront

Le rendu UI reprend l'approche premium "storefront" (catalogue moderne, sections marketing, cards produit, navigation clean), tout en utilisant votre stack demandée (Next.js + Express + SQLite) sans dépendance Saleor backend.

## Déploiement & hosting (Nginx)

### 1) Build de production

```bash
cd frontend
npm install
npm run build
```

### 2) Lancer les services Node.js

Backend:

```bash
cd backend
npm install
npm run start
```

Frontend (production):

```bash
cd frontend
npm run start
```

Par défaut:

- Frontend: `127.0.0.1:3000`
- Backend: `127.0.0.1:4000`

### 3) Configuration Nginx

Le fichier prêt à l'emploi est disponible ici:

- [deployment/nginx/pharmacie.conf](deployment/nginx/pharmacie.conf)

Exemple d'installation Linux:

```bash
sudo cp deployment/nginx/pharmacie.conf /etc/nginx/sites-available/pharmacie.conf
sudo ln -s /etc/nginx/sites-available/pharmacie.conf /etc/nginx/sites-enabled/pharmacie.conf
sudo nginx -t
sudo systemctl reload nginx
```

### 4) HTTPS (recommandé)

Après pointage DNS du domaine, activez TLS avec Certbot:

```bash
sudo certbot --nginx -d pharmaciebeniddirmalik.dz -d www.pharmaciebeniddirmalik.dz
```

## Déploiement temporaire sur GitHub Pages

Le workflow GitHub Actions est prêt ici: `.github/workflows/deploy-pages.yml`.

### 1) Première publication vers GitHub

Depuis la racine:

```bash
git init
git branch -M master
git remote add origin https://github.com/Yourakhalidoovic/pharmacie_malik_beniddir.git
git add .
git commit -m "Initial commit"
git push -u origin master
```

### 2) Activer GitHub Pages

Dans GitHub > `Settings` > `Pages`:

- `Source`: `GitHub Actions`

### 3) Variables recommandées (Settings > Secrets and variables > Actions > Variables)

- `NEXT_PUBLIC_SITE_URL`: `https://pharmaciebeniddirmalik.dz`
- `NEXT_PUBLIC_BASE_PATH`: laisser vide `""` si domaine custom actif
- `NEXT_PUBLIC_API_BASE_URL`: URL publique temporaire de l'API (si disponible)

Si vous n'avez pas encore d'API publique, le site sera publié mais certaines fonctions dynamiques (login, commandes, compte, admin) ne fonctionneront pas tant que le backend n'est pas exposé.

### 4) DNS pour le domaine custom

Le fichier `frontend/public/CNAME` est configuré sur:

- `pharmaciebeniddirmalik.dz`

Ajoutez les enregistrements DNS GitHub Pages chez votre registrar avant bascule complète.
