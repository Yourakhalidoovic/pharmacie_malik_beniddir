const express = require("express");
const cors = require("cors");
const sqlite3 = require("sqlite3").verbose();
const path = require("path");
const crypto = require("crypto");

const app = express();
const PORT = process.env.PORT || 4000;
const dbPath = path.join(__dirname, "pharmacie-malik-beniddir.db");

app.use(cors());
app.use(express.json({ limit: "20mb" }));
app.use(express.urlencoded({ extended: true, limit: "20mb" }));

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error("SQLite connection error:", err.message);
    process.exit(1);
  }
  console.log("Connected to SQLite at", dbPath);
});

const run = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.run(sql, params, function onRun(err) {
      if (err) return reject(err);
      resolve(this);
    });
  });

const all = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) return reject(err);
      resolve(rows);
    });
  });

const get = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) return reject(err);
      resolve(row);
    });
  });

const hashPassword = (password) =>
  crypto.createHash("sha256").update(password).digest("hex");

const generateToken = () => crypto.randomBytes(24).toString("hex");

const slugify = (value) =>
  String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const toSafeStock = (value, fallback = 0) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return Math.max(0, Math.floor(fallback));
  return Math.max(0, Math.floor(n));
};

function createHttpError(statusCode, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function normalizeColorVariantsInput(value, fallbackStock = 0) {
  let entries = [];

  if (Array.isArray(value)) {
    entries = value;
  } else if (typeof value === "string") {
    entries = value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean)
      .map((item) => {
        const [namePart, stockPart] = item.split(":");
        return {
          name: String(namePart || "").trim(),
          stock:
            stockPart !== undefined
              ? toSafeStock(stockPart, fallbackStock)
              : toSafeStock(fallbackStock),
        };
      });
  } else {
    return [];
  }

  const result = [];
  const seen = new Set();

  for (const entry of entries) {
    if (typeof entry === "string") {
      const name = entry.trim();
      if (!name) continue;
      const key = name.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      result.push({ name, stock: toSafeStock(fallbackStock) });
      continue;
    }

    if (!entry || typeof entry !== "object") continue;
    const name = String(entry.name || entry.color || "").trim();
    if (!name) continue;

    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);

    result.push({
      name,
      stock: toSafeStock(entry.stock ?? entry.quantity, fallbackStock),
    });
  }

  return result;
}

function normalizeColorsInput(value) {
  return normalizeColorVariantsInput(value).map((variant) => variant.name);
}

function mapProductRow(row) {
  if (!row) return row;

  let colorVariants = [];
  let legacyStringOnlyColors = false;
  if (typeof row.colors_json === "string" && row.colors_json.trim()) {
    try {
      const parsed = JSON.parse(row.colors_json);
      legacyStringOnlyColors =
        Array.isArray(parsed) &&
        parsed.every((entry) => typeof entry === "string");
      colorVariants = normalizeColorVariantsInput(
        parsed,
        legacyStringOnlyColors ? 0 : Number(row.stock || 0),
      );
    } catch {
      colorVariants = [];
    }
  }

  const stock =
    colorVariants.length > 0 && !legacyStringOnlyColors
      ? colorVariants.reduce(
          (sum, variant) => sum + toSafeStock(variant.stock),
          0,
        )
      : toSafeStock(row.stock);

  const colors = colorVariants.map((variant) => variant.name);

  return {
    ...row,
    stock,
    colors,
    colorVariants: colorVariants.map((variant) => ({
      ...variant,
      inStock: toSafeStock(variant.stock) > 0,
    })),
  };
}

function mapProductRows(rows) {
  return Array.isArray(rows) ? rows.map(mapProductRow) : [];
}

async function addColumnIfMissing(tableName, columnName, sqlDefinition) {
  const cols = await all(`PRAGMA table_info(${tableName})`);
  const exists = cols.some((c) => c.name === columnName);
  if (!exists) {
    await run(`ALTER TABLE ${tableName} ADD COLUMN ${sqlDefinition}`);
  }
}

async function getUserByToken(token) {
  if (!token) return null;

  const session = await get(
    `
    SELECT u.id, u.name, u.email, u.role, u.blocked
    FROM sessions s
    JOIN users u ON u.id = s.user_id
    WHERE s.token = ?
  `,
    [token],
  );

  return session || null;
}

function extractBearerToken(req) {
  const auth = req.headers.authorization || "";
  if (!auth.startsWith("Bearer ")) return null;
  return auth.slice(7).trim();
}

async function requireAdminUser(req, res) {
  const token = extractBearerToken(req);
  const user = await getUserByToken(token);

  if (!user || user.role !== "admin") {
    res.status(403).json({ message: "Forbidden" });
    return null;
  }

  return user;
}

async function requireAdminOrPharmacienUser(req, res) {
  const token = extractBearerToken(req);
  const user = await getUserByToken(token);

  if (!user || !["admin", "pharmacien"].includes(user.role)) {
    res.status(403).json({ message: "Forbidden" });
    return null;
  }

  return user;
}

async function initDb() {
  await run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'client',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      token TEXT UNIQUE NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      slug TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      grade TEXT NOT NULL,
      model TEXT NOT NULL,
      unit TEXT NOT NULL,
      stock INTEGER NOT NULL,
      price REAL NOT NULL,
      min_order_qty INTEGER NOT NULL,
      colors_json TEXT DEFAULT '[]',
      origin TEXT NOT NULL,
      image TEXT NOT NULL,
      description TEXT NOT NULL,
      featured INTEGER DEFAULT 0
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      customer_name TEXT NOT NULL,
      email TEXT NOT NULL,
      address TEXT NOT NULL,
      city TEXT NOT NULL,
      country TEXT NOT NULL,
      order_type TEXT NOT NULL,
      items_json TEXT NOT NULL,
      total REAL NOT NULL,
      status TEXT DEFAULT 'pending',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS reviews (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_name TEXT NOT NULL,
      rating INTEGER NOT NULL,
      message TEXT NOT NULL,
      approved INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS contact_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      full_name TEXT NOT NULL,
      email TEXT NOT NULL,
      phone TEXT,
      subject TEXT NOT NULL,
      message TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS client_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      sender_role TEXT NOT NULL,
      message TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  await addColumnIfMissing("orders", "user_id", "user_id INTEGER");
  await addColumnIfMissing(
    "products",
    "min_order_qty",
    "min_order_qty INTEGER DEFAULT 1",
  );
  await addColumnIfMissing(
    "products",
    "colors_json",
    "colors_json TEXT DEFAULT '[]'",
  );
  await addColumnIfMissing("users", "blocked", "blocked INTEGER DEFAULT 0");
  await addColumnIfMissing("reviews", "approved", "approved INTEGER DEFAULT 0");

  const admin = await get("SELECT id FROM users WHERE email = ?", [
    "admin@pharmaciebeniddirmalik.dz",
  ]);
  if (!admin) {
    await run(
      `
      INSERT INTO users (name, email, password_hash, role)
      VALUES (?, ?, ?, ?)
      `,
      [
        "Admin Pharmacie Beniddir Malik",
        "admin@pharmaciebeniddirmalik.dz",
        hashPassword("Admin@123"),
        "admin",
      ],
    );
  }

  const pharmacien = await get("SELECT id FROM users WHERE email = ?", [
    "pharmacien@pharmaciebeniddirmalik.dz",
  ]);
  if (!pharmacien) {
    await run(
      `
      INSERT INTO users (name, email, password_hash, role)
      VALUES (?, ?, ?, ?)
      `,
      [
        "Pharmacien Pharmacie Beniddir Malik",
        "pharmacien@pharmaciebeniddirmalik.dz",
        hashPassword("Pharmacien@123"),
        "pharmacien",
      ],
    );
  }

  const seedProducts = [
    {
      slug: "gel-hydroalcoolique-500ml",
      name: "Gel hydroalcoolique 500 ml",
      category: "Hygiène & bébé",
      grade: "Usage quotidien",
      model: "Flacon pompe",
      unit: "pièce",
      stock: 180,
      price: 650,
      min_order_qty: 1,
      origin: "Algérie",
      image:
        "https://images.unsplash.com/photo-1584483766114-2cea6facdf57?auto=format&fit=crop&w=1200&q=80",
      description:
        "Gel antiseptique pour l'hygiène des mains, format familial pratique.",
      featured: 1,
    },
    {
      slug: "masques-chirurgicaux-boite-50",
      name: "Masques chirurgicaux boîte de 50",
      category: "Premiers secours",
      grade: "Type IIR",
      model: "Boîte",
      unit: "boîte",
      stock: 240,
      price: 900,
      min_order_qty: 1,
      origin: "Algérie",
      image:
        "https://images.unsplash.com/photo-1584634731339-252c58ab9c0b?auto=format&fit=crop&w=1200&q=80",
      description:
        "Masques à usage médical pour une protection respiratoire au quotidien.",
      featured: 1,
    },
    {
      slug: "thermometre-digital-infrarouge",
      name: "Thermomètre digital infrarouge",
      category: "Écrans solaires",
      grade: "Précision clinique",
      model: "Sans contact",
      unit: "pièce",
      stock: 65,
      price: 4900,
      min_order_qty: 1,
      colors: [
        { name: "Blanc", stock: 30 },
        { name: "Bleu", stock: 0 },
        { name: "Rose", stock: 35 },
      ],
      origin: "Import contrôlé",
      image:
        "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1200&q=80",
      description:
        "Thermomètre frontal rapide avec écran digital et mémorisation.",
      featured: 1,
    },
    {
      slug: "tensiometre-bras-automatique",
      name: "Tensiomètre bras automatique",
      category: "Soin anti imperfections",
      grade: "Haute précision",
      model: "Électronique",
      unit: "pièce",
      stock: 48,
      price: 7200,
      min_order_qty: 1,
      origin: "Import contrôlé",
      image:
        "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=1200&q=80",
      description:
        "Appareil de mesure de la tension artérielle simple d'utilisation.",
      featured: 0,
    },
    {
      slug: "vitamine-c-1000-comprimes",
      name: "Vitamine C 1000 mg",
      category: "Complément alimentaire",
      grade: "Immunité",
      model: "Comprimés",
      unit: "boîte",
      stock: 120,
      price: 1350,
      min_order_qty: 1,
      origin: "Europe",
      image:
        "https://images.unsplash.com/photo-1612532275214-e4ca76d0e4d1?auto=format&fit=crop&w=1200&q=80",
      description:
        "Complément alimentaire pour réduire la fatigue et soutenir l'immunité.",
      featured: 1,
    },
    {
      slug: "omega3-1000mg-60-capsules",
      name: "Oméga 3 1000 mg",
      category: "Complément alimentaire",
      grade: "Cœur & circulation",
      model: "Capsules",
      unit: "boîte",
      stock: 90,
      price: 2100,
      min_order_qty: 1,
      origin: "Europe",
      image:
        "https://images.unsplash.com/photo-1607613009820-a29f7bb81c04?auto=format&fit=crop&w=1200&q=80",
      description:
        "Complément riche en acides gras essentiels pour l'équilibre quotidien.",
      featured: 0,
    },
    {
      slug: "creme-hydratante-peaux-sensibles",
      name: "Crème hydratante peaux sensibles",
      category: "Soins visage",
      grade: "Sans parfum",
      model: "Tube 50 ml",
      unit: "pièce",
      stock: 135,
      price: 1450,
      min_order_qty: 1,
      origin: "France",
      image:
        "https://images.unsplash.com/photo-1556228453-efd6c1ff04f6?auto=format&fit=crop&w=1200&q=80",
      description:
        "Soin quotidien apaisant pour hydrater et protéger les peaux réactives.",
      featured: 0,
    },
    {
      slug: "creme-change-bebe-100ml",
      name: "Crème de change bébé 100 ml",
      category: "Hygiène & bébé",
      grade: "Hypoallergénique",
      model: "Tube",
      unit: "pièce",
      stock: 160,
      price: 980,
      min_order_qty: 1,
      origin: "Algérie",
      image:
        "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=1200&q=80",
      description: "Protège et répare l'épiderme fragile du nourrisson.",
      featured: 0,
    },
    {
      slug: "serum-physiologique-30-unidoses",
      name: "Sérum physiologique 30 unidoses",
      category: "Hygiène & bébé",
      grade: "Stérile",
      model: "Unidoses",
      unit: "boîte",
      stock: 210,
      price: 720,
      min_order_qty: 1,
      origin: "Algérie",
      image:
        "https://images.unsplash.com/photo-1607619056574-7b8d3ee536b2?auto=format&fit=crop&w=1200&q=80",
      description: "Nettoyage doux du nez et des yeux pour bébé et adulte.",
      featured: 0,
    },
    {
      slug: "pansements-steriles-20",
      name: "Pansements stériles x20",
      category: "Soin cicatrisant",
      grade: "Respirant",
      model: "Boîte",
      unit: "boîte",
      stock: 250,
      price: 450,
      min_order_qty: 1,
      origin: "Algérie",
      image:
        "https://images.unsplash.com/photo-1584515933487-779824d29309?auto=format&fit=crop&w=1200&q=80",
      description:
        "Pansements de protection pour petites coupures et soins rapides.",
      featured: 0,
    },
    {
      slug: "attelle-poignet-ajustable",
      name: "Attelle poignet ajustable",
      category: "Shampoing antipelliculaire",
      grade: "Confort",
      model: "Taille universelle",
      unit: "pièce",
      stock: 56,
      price: 2300,
      min_order_qty: 1,
      origin: "Import contrôlé",
      image:
        "https://images.unsplash.com/photo-1530026405186-ed1f139313f8?auto=format&fit=crop&w=1200&q=80",
      description: "Maintien léger du poignet pour les activités quotidiennes.",
      featured: 0,
    },
    {
      slug: "ceinture-lombaire-souple",
      name: "Ceinture lombaire souple",
      category: "Shampooing anti chute",
      grade: "Maintien dorsal",
      model: "Ajustable",
      unit: "pièce",
      stock: 42,
      price: 3900,
      min_order_qty: 1,
      origin: "Import contrôlé",
      image:
        "https://images.unsplash.com/photo-1519823551278-64ac92734fb1?auto=format&fit=crop&w=1200&q=80",
      description:
        "Soutien lombaire ergonomique pour soulager les douleurs du dos.",
      featured: 1,
    },
    {
      slug: "calcium-vitamine-d3-30-comprimes",
      name: "Calcium + Vitamine D3",
      category: "Complément alimentaire",
      grade: "Os & articulations",
      model: "Comprimés",
      unit: "boîte",
      stock: 105,
      price: 1600,
      min_order_qty: 1,
      origin: "Europe",
      image:
        "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=1200&q=80",
      description:
        "Formule pour le maintien du capital osseux et le confort articulaire.",
      featured: 1,
    },
  ];

  for (const p of seedProducts) {
    await run(
      `
      INSERT INTO products
      (slug, name, category, grade, model, unit, stock, price, min_order_qty, colors_json, origin, image, description, featured)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(slug) DO UPDATE SET
        name = excluded.name,
        category = excluded.category,
        grade = excluded.grade,
        model = excluded.model,
        unit = excluded.unit,
        stock = excluded.stock,
        price = excluded.price,
        min_order_qty = excluded.min_order_qty,
        colors_json = excluded.colors_json,
        origin = excluded.origin,
        image = excluded.image,
        description = excluded.description,
        featured = excluded.featured
    `,
      [
        p.slug,
        p.name,
        p.category,
        p.grade,
        p.model,
        p.unit,
        p.stock,
        p.price,
        p.min_order_qty,
        JSON.stringify(normalizeColorVariantsInput(p.colors, p.stock)),
        p.origin,
        p.image,
        p.description,
        p.featured,
      ],
    );
  }

  const coherentImagesByCategory = {
    "Soins visage":
      "https://images.unsplash.com/photo-1556228453-efd6c1ff04f6?auto=format&fit=crop&w=1200&q=80",
    "Hygiène & bébé":
      "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=1200&q=80",
    "Premiers secours":
      "https://images.unsplash.com/photo-1584515933487-779824d29309?auto=format&fit=crop&w=1200&q=80",
    "Complément alimentaire":
      "https://images.unsplash.com/photo-1607613009820-a29f7bb81c04?auto=format&fit=crop&w=1200&q=80",
    "Soin cicatrisant":
      "https://images.unsplash.com/photo-1584515933487-779824d29309?auto=format&fit=crop&w=1200&q=80",
    "Shampoing antipelliculaire":
      "https://images.unsplash.com/photo-1556228453-efd6c1ff04f6?auto=format&fit=crop&w=1200&q=80",
    "Shampooing anti chute":
      "https://images.unsplash.com/photo-1556228453-efd6c1ff04f6?auto=format&fit=crop&w=1200&q=80",
    "Soin anti imperfections":
      "https://images.unsplash.com/photo-1556228453-efd6c1ff04f6?auto=format&fit=crop&w=1200&q=80",
    "Écrans solaires":
      "https://images.unsplash.com/photo-1521223344201-d169129f7b9c?auto=format&fit=crop&w=1200&q=80",
  };

  for (const [category, image] of Object.entries(coherentImagesByCategory)) {
    await run("UPDATE products SET image = ? WHERE category = ?", [
      image,
      category,
    ]);
  }

  const existingReviews = await get("SELECT COUNT(*) as count FROM reviews");
  if (Number(existingReviews.count || 0) === 0) {
    const seedReviews = [
      {
        customer_name: "Nadia B.",
        rating: 5,
        message: "Service sérieux, produits de qualité et livraison rapide.",
      },
      {
        customer_name: "Karim M.",
        rating: 5,
        message:
          "Le tensiomètre est précis et facile à utiliser. Je recommande.",
      },
      {
        customer_name: "Sofia R.",
        rating: 4,
        message: "Très bon choix en produits bébé et prix raisonnables.",
      },
    ];

    for (const review of seedReviews) {
      await run(
        "INSERT INTO reviews (customer_name, rating, message, approved) VALUES (?, ?, ?, 1)",
        [review.customer_name, review.rating, review.message],
      );
    }
  }

  const additionalGoogleStyleReviews = [
    {
      customer_name: "Samira H.",
      rating: 5,
      message:
        "Accueil professionnel et conseils très utiles. L'équipe prend le temps d'expliquer les produits.",
    },
    {
      customer_name: "Yacine T.",
      rating: 5,
      message:
        "Pharmacie bien fournie, service rapide et personnel aimable. Très bonne expérience.",
    },
    {
      customer_name: "Nour E.",
      rating: 4,
      message:
        "Bonne disponibilité des références et accompagnement sérieux pour choisir le bon soin.",
    },
  ];

  for (const review of additionalGoogleStyleReviews) {
    const exists = await get(
      "SELECT id FROM reviews WHERE customer_name = ? AND message = ? LIMIT 1",
      [review.customer_name, review.message],
    );

    if (!exists) {
      await run(
        "INSERT INTO reviews (customer_name, rating, message, approved) VALUES (?, ?, ?, 1)",
        [review.customer_name, review.rating, review.message],
      );
    }
  }
}

app.get("/api/health", (_, res) => {
  res.json({ ok: true, service: "pharmacie-beniddir-malik-api" });
});

app.post("/api/auth/register", async (req, res) => {
  try {
    const rawName = String(req.body?.name || "").trim();
    const normalizedEmail = String(req.body?.email || "")
      .trim()
      .toLowerCase();
    const password = String(req.body?.password || "");

    if (!rawName || !normalizedEmail || !password) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const exists = await get(
      "SELECT id FROM users WHERE lower(email) = lower(?)",
      [normalizedEmail],
    );
    if (exists) {
      return res.status(409).json({ message: "Email already used" });
    }

    const created = await run(
      `
      INSERT INTO users (name, email, password_hash, role)
      VALUES (?, ?, ?, 'client')
      `,
      [rawName, normalizedEmail, hashPassword(password)],
    );

    const userId = created.lastID;
    const token = generateToken();
    await run("INSERT INTO sessions (user_id, token) VALUES (?, ?)", [
      userId,
      token,
    ]);

    return res.status(201).json({
      token,
      user: {
        id: userId,
        name: rawName,
        email: normalizedEmail,
        role: "client",
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Failed to register" });
  }
});

app.post("/api/auth/login", async (req, res) => {
  try {
    const normalizedEmail = String(req.body?.email || "")
      .trim()
      .toLowerCase();
    const password = String(req.body?.password || "");

    if (!normalizedEmail || !password) {
      return res.status(400).json({ message: "Missing credentials" });
    }

    const user = await get(
      "SELECT id, name, email, role, blocked, password_hash FROM users WHERE lower(email) = lower(?)",
      [normalizedEmail],
    );

    if (!user || user.password_hash !== hashPassword(password)) {
      return res.status(401).json({ message: "Email or password invalid" });
    }

    if (Number(user.blocked) === 1) {
      return res
        .status(403)
        .json({ message: "Compte bloqué. Contactez l'administrateur." });
    }

    const token = generateToken();
    await run("INSERT INTO sessions (user_id, token) VALUES (?, ?)", [
      user.id,
      token,
    ]);

    return res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Failed to login" });
  }
});

app.get("/api/auth/me", async (req, res) => {
  try {
    const token = extractBearerToken(req);
    const user = await getUserByToken(token);

    if (!user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (Number(user.blocked) === 1) {
      return res.status(403).json({ message: "Compte bloqué" });
    }

    return res.json({ user });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Failed to fetch user" });
  }
});

app.get("/api/products", async (req, res) => {
  try {
    const { category, featured } = req.query;
    let query = "SELECT * FROM products WHERE 1=1";
    const params = [];

    if (category) {
      query += " AND category = ?";
      params.push(category);
    }

    if (featured === "true") {
      query += " AND featured = 1";
    }

    query += " ORDER BY id DESC";
    const rows = await all(query, params);
    res.json(mapProductRows(rows));
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to fetch products" });
  }
});

app.get("/api/products/:slug", async (req, res) => {
  try {
    const product = await get("SELECT * FROM products WHERE slug = ?", [
      req.params.slug,
    ]);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }
    return res.json(mapProductRow(product));
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Failed to fetch product" });
  }
});

app.post("/api/contact-requests", async (req, res) => {
  try {
    const { fullName, email, phone, subject, message } = req.body;

    if (!fullName || !email || !subject || !message) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    await run(
      `
      INSERT INTO contact_requests (full_name, email, phone, subject, message)
      VALUES (?, ?, ?, ?, ?)
      `,
      [
        String(fullName).trim(),
        String(email).trim(),
        String(phone || "").trim(),
        String(subject).trim(),
        String(message).trim(),
      ],
    );

    return res.status(201).json({ message: "Contact request sent" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Failed to send contact request" });
  }
});

app.post("/api/orders", async (req, res) => {
  try {
    const token = extractBearerToken(req);
    const user = await getUserByToken(token);

    const { customerName, email, address, city, country, orderType, items } =
      req.body;

    if (
      !customerName ||
      !email ||
      !address ||
      !city ||
      !country ||
      !orderType ||
      !Array.isArray(items) ||
      items.length === 0
    ) {
      return res.status(400).json({ message: "Invalid payload" });
    }

    const normalizedItems = items
      .map((item) => ({
        productId: Number(item?.productId),
        quantity: toSafeStock(item?.quantity),
        color:
          typeof item?.color === "string" && item.color.trim()
            ? item.color.trim()
            : null,
      }))
      .filter((item) => Number.isInteger(item.productId) && item.quantity > 0);

    if (normalizedItems.length === 0) {
      return res.status(400).json({ message: "Invalid order items" });
    }

    await run("BEGIN IMMEDIATE TRANSACTION");

    let total = 0;
    const persistedItems = [];
    let insertedOrder = null;

    try {
      for (const item of normalizedItems) {
        const product = await get(
          "SELECT id, name, price, stock, colors_json FROM products WHERE id = ?",
          [item.productId],
        );

        if (!product) {
          throw createHttpError(400, "Produit introuvable dans la commande");
        }

        let parsedVariants = [];
        let legacyStringOnlyColors = false;
        if (
          typeof product.colors_json === "string" &&
          product.colors_json.trim()
        ) {
          try {
            parsedVariants = JSON.parse(product.colors_json);
            legacyStringOnlyColors =
              Array.isArray(parsedVariants) &&
              parsedVariants.every((entry) => typeof entry === "string");
          } catch {
            parsedVariants = [];
          }
        }

        const colorVariants = normalizeColorVariantsInput(
          parsedVariants,
          legacyStringOnlyColors ? 0 : Number(product.stock || 0),
        );

        let selectedColor = null;

        if (colorVariants.length > 0 && !legacyStringOnlyColors) {
          if (!item.color) {
            throw createHttpError(
              400,
              `Veuillez sélectionner une couleur pour ${product.name}`,
            );
          }

          const idx = colorVariants.findIndex(
            (variant) =>
              variant.name.toLowerCase() === item.color.toLowerCase(),
          );

          if (idx === -1) {
            throw createHttpError(400, `Couleur invalide pour ${product.name}`);
          }

          const selectedVariant = colorVariants[idx];
          if (toSafeStock(selectedVariant.stock) < item.quantity) {
            throw createHttpError(
              409,
              `Rupture de stock pour ${product.name} (${selectedVariant.name})`,
            );
          }

          colorVariants[idx] = {
            ...selectedVariant,
            stock: toSafeStock(selectedVariant.stock) - item.quantity,
          };

          const nextTotalStock = colorVariants.reduce(
            (sum, variant) => sum + toSafeStock(variant.stock),
            0,
          );

          await run(
            "UPDATE products SET colors_json = ?, stock = ? WHERE id = ?",
            [JSON.stringify(colorVariants), nextTotalStock, product.id],
          );

          selectedColor = selectedVariant.name;
        } else {
          const updated = await run(
            "UPDATE products SET stock = stock - ? WHERE id = ? AND stock >= ?",
            [item.quantity, product.id, item.quantity],
          );

          if (Number(updated.changes || 0) === 0) {
            throw createHttpError(
              409,
              `Stock insuffisant pour ${product.name}`,
            );
          }
        }

        total += Number(product.price) * item.quantity;
        persistedItems.push({
          productId: product.id,
          quantity: item.quantity,
          ...(selectedColor ? { color: selectedColor } : {}),
        });
      }

      insertedOrder = await run(
        `
        INSERT INTO orders (user_id, customer_name, email, address, city, country, order_type, items_json, total)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
          user ? user.id : null,
          customerName,
          email,
          address,
          city,
          country,
          orderType,
          JSON.stringify(persistedItems),
          Number(total.toFixed(2)),
        ],
      );

      await run("COMMIT");
    } catch (error) {
      await run("ROLLBACK");

      if (error && Number.isInteger(error.statusCode)) {
        return res.status(error.statusCode).json({ message: error.message });
      }

      throw error;
    }

    return res.status(201).json({
      message: "Order created",
      total: Number(total.toFixed(2)),
      orderId: Number(insertedOrder?.lastID || 0),
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Failed to create order" });
  }
});

app.get("/api/stats", async (_, res) => {
  try {
    const products = await get("SELECT COUNT(*) as count FROM products");
    const reviews = await get("SELECT COUNT(*) as count FROM reviews");
    const orders = await get("SELECT COUNT(*) as count FROM orders");

    return res.json({
      products: products.count,
      reviews: reviews.count,
      orders: orders.count,
      markets: 120,
      restaurantsInAlgeria: 2400,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Failed to fetch stats" });
  }
});

app.get("/api/reviews", async (_, res) => {
  try {
    const rows = await all(
      `
      SELECT id, customer_name, rating, message, approved, created_at
      FROM reviews
      WHERE approved = 1
      ORDER BY id DESC
      LIMIT 12
      `,
    );

    return res.json(rows);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Failed to fetch reviews" });
  }
});

app.post("/api/reviews", async (req, res) => {
  try {
    const { customerName, rating, message } = req.body;

    if (!customerName || !message) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const numericRating = Number(rating);
    if (
      !Number.isInteger(numericRating) ||
      numericRating < 1 ||
      numericRating > 5
    ) {
      return res.status(400).json({ message: "Invalid rating" });
    }

    await run(
      `
      INSERT INTO reviews (customer_name, rating, message, approved)
      VALUES (?, ?, ?, 0)
      `,
      [String(customerName).trim(), numericRating, String(message).trim()],
    );

    return res
      .status(201)
      .json({ message: "Avis envoyé. En attente de validation admin." });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Failed to submit review" });
  }
});

app.get("/api/account/orders", async (req, res) => {
  try {
    const token = extractBearerToken(req);
    const user = await getUserByToken(token);

    if (!user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const rows = await all(
      "SELECT id, customer_name, email, total, status, order_type, created_at FROM orders WHERE user_id = ? ORDER BY id DESC",
      [user.id],
    );

    return res.json(rows);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Failed to fetch account orders" });
  }
});

app.get("/api/account/messages", async (req, res) => {
  try {
    const token = extractBearerToken(req);
    const user = await getUserByToken(token);

    if (!user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const rows = await all(
      `
      SELECT id, user_id, sender_role, message, created_at
      FROM client_messages
      WHERE user_id = ?
      ORDER BY id ASC
      `,
      [user.id],
    );

    return res.json(rows);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Failed to fetch messages" });
  }
});

app.post("/api/account/messages", async (req, res) => {
  try {
    const token = extractBearerToken(req);
    const user = await getUserByToken(token);

    if (!user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const message = String(req.body?.message || "").trim();
    if (!message) {
      return res.status(400).json({ message: "Message vide" });
    }

    if (message.length > 2000) {
      return res.status(400).json({ message: "Message trop long" });
    }

    await run(
      `
      INSERT INTO client_messages (user_id, sender_role, message)
      VALUES (?, 'client', ?)
      `,
      [user.id, message],
    );

    return res.status(201).json({ message: "Message envoyé" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Failed to send message" });
  }
});

app.get("/api/admin/overview", async (req, res) => {
  try {
    const admin = await requireAdminUser(req, res);
    if (!admin) return;

    const users = await get("SELECT COUNT(*) as count FROM users");
    const clients = await get(
      "SELECT COUNT(*) as count FROM users WHERE role = 'client'",
    );
    const orders = await get("SELECT COUNT(*) as count FROM orders");
    const sales = await get(
      "SELECT ROUND(COALESCE(SUM(total),0),2) as total FROM orders",
    );

    return res.json({
      users: users.count,
      clients: clients.count,
      orders: orders.count,
      revenue: sales.total,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Failed to fetch admin overview" });
  }
});

app.get("/api/admin/orders", async (req, res) => {
  try {
    const admin = await requireAdminOrPharmacienUser(req, res);
    if (!admin) return;

    const rows = await all(
      "SELECT id, customer_name, email, address, city, country, total, status, order_type, items_json, created_at FROM orders ORDER BY id DESC",
    );
    return res.json(rows);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Failed to fetch orders" });
  }
});

app.put("/api/admin/orders/:id/status", async (req, res) => {
  try {
    const admin = await requireAdminOrPharmacienUser(req, res);
    if (!admin) return;

    const { status } = req.body;
    const allowed = [
      "pending",
      "confirmed",
      "shipped",
      "delivered",
      "cancelled",
    ];
    if (!allowed.includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    const order = await get("SELECT id FROM orders WHERE id = ?", [
      req.params.id,
    ]);
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    await run("UPDATE orders SET status = ? WHERE id = ?", [
      status,
      req.params.id,
    ]);
    return res.json({ message: "Order status updated" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Failed to update order status" });
  }
});

app.get("/api/admin/products", async (req, res) => {
  try {
    const admin = await requireAdminOrPharmacienUser(req, res);
    if (!admin) return;

    const rows = await all("SELECT * FROM products ORDER BY id DESC");
    return res.json(mapProductRows(rows));
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Failed to fetch admin products" });
  }
});

app.get("/api/admin/users", async (req, res) => {
  try {
    const admin = await requireAdminUser(req, res);
    if (!admin) return;

    const rows = await all(
      `
      SELECT
        u.id,
        u.name,
        u.email,
        u.role,
        u.blocked,
        u.created_at,
        (SELECT COUNT(*) FROM orders o WHERE o.user_id = u.id) as orders_count
      FROM users u
      ORDER BY u.id DESC
      `,
    );

    return res.json(rows);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Failed to fetch users" });
  }
});

app.get("/api/admin/reviews", async (req, res) => {
  try {
    const admin = await requireAdminOrPharmacienUser(req, res);
    if (!admin) return;

    const rows = await all(
      `
      SELECT id, customer_name, rating, message, approved, created_at
      FROM reviews
      ORDER BY id DESC
      `,
    );

    return res.json(rows);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Failed to fetch reviews" });
  }
});

app.get("/api/admin/message-users", async (req, res) => {
  try {
    const admin = await requireAdminOrPharmacienUser(req, res);
    if (!admin) return;

    const rows = await all(
      `
      SELECT
        u.id,
        u.name,
        u.email,
        MAX(cm.created_at) as last_message_at,
        (
          SELECT cm2.message
          FROM client_messages cm2
          WHERE cm2.user_id = u.id
          ORDER BY cm2.id DESC
          LIMIT 1
        ) as last_message
      FROM users u
      LEFT JOIN client_messages cm ON cm.user_id = u.id
      WHERE u.role = 'client'
      GROUP BY u.id, u.name, u.email
      HAVING last_message_at IS NOT NULL
      ORDER BY last_message_at DESC
      `,
    );

    return res.json(rows);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Failed to fetch message users" });
  }
});

app.get("/api/admin/messages", async (req, res) => {
  try {
    const admin = await requireAdminOrPharmacienUser(req, res);
    if (!admin) return;

    const userId = Number(req.query.userId);
    if (!Number.isInteger(userId) || userId <= 0) {
      return res.status(400).json({ message: "userId invalide" });
    }

    const target = await get("SELECT id, role FROM users WHERE id = ?", [
      userId,
    ]);
    if (!target || target.role !== "client") {
      return res.status(404).json({ message: "Client introuvable" });
    }

    const rows = await all(
      `
      SELECT id, user_id, sender_role, message, created_at
      FROM client_messages
      WHERE user_id = ?
      ORDER BY id ASC
      `,
      [userId],
    );

    return res.json(rows);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Failed to fetch messages" });
  }
});

app.post("/api/admin/messages", async (req, res) => {
  try {
    const admin = await requireAdminOrPharmacienUser(req, res);
    if (!admin) return;

    const userId = Number(req.body?.userId);
    const message = String(req.body?.message || "").trim();

    if (!Number.isInteger(userId) || userId <= 0) {
      return res.status(400).json({ message: "userId invalide" });
    }

    if (!message) {
      return res.status(400).json({ message: "Message vide" });
    }

    if (message.length > 2000) {
      return res.status(400).json({ message: "Message trop long" });
    }

    const target = await get("SELECT id, role FROM users WHERE id = ?", [
      userId,
    ]);
    if (!target || target.role !== "client") {
      return res.status(404).json({ message: "Client introuvable" });
    }

    await run(
      `
      INSERT INTO client_messages (user_id, sender_role, message)
      VALUES (?, 'admin', ?)
      `,
      [userId, message],
    );

    return res.status(201).json({ message: "Réponse envoyée" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Failed to send message" });
  }
});

app.put("/api/admin/reviews/:id/visibility", async (req, res) => {
  try {
    const admin = await requireAdminOrPharmacienUser(req, res);
    if (!admin) return;

    const reviewId = Number(req.params.id);
    const approved = Boolean(req.body?.approved);

    const review = await get("SELECT id FROM reviews WHERE id = ?", [reviewId]);
    if (!review) {
      return res.status(404).json({ message: "Review not found" });
    }

    await run("UPDATE reviews SET approved = ? WHERE id = ?", [
      approved ? 1 : 0,
      reviewId,
    ]);

    return res.json({
      message: approved ? "Avis visible" : "Avis masqué",
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Failed to update review" });
  }
});

app.delete("/api/admin/reviews/:id", async (req, res) => {
  try {
    const admin = await requireAdminOrPharmacienUser(req, res);
    if (!admin) return;

    const reviewId = Number(req.params.id);
    const review = await get("SELECT id FROM reviews WHERE id = ?", [reviewId]);

    if (!review) {
      return res.status(404).json({ message: "Review not found" });
    }

    await run("DELETE FROM reviews WHERE id = ?", [reviewId]);
    return res.json({ message: "Avis supprimé" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Failed to delete review" });
  }
});

app.put("/api/admin/users/:id/block", async (req, res) => {
  try {
    const admin = await requireAdminUser(req, res);
    if (!admin) return;

    const userId = Number(req.params.id);
    const { blocked } = req.body;

    const target = await get("SELECT id, role FROM users WHERE id = ?", [
      userId,
    ]);
    if (!target) {
      return res.status(404).json({ message: "User not found" });
    }

    if (target.role !== "client") {
      return res
        .status(400)
        .json({ message: "Seuls les comptes clients peuvent etre bloques" });
    }

    await run("UPDATE users SET blocked = ? WHERE id = ?", [
      blocked ? 1 : 0,
      userId,
    ]);

    if (blocked) {
      await run("DELETE FROM sessions WHERE user_id = ?", [userId]);
    }

    return res.json({ message: blocked ? "User blocked" : "User unblocked" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Failed to update user status" });
  }
});

app.delete("/api/admin/users/:id", async (req, res) => {
  try {
    const admin = await requireAdminUser(req, res);
    if (!admin) return;

    const userId = Number(req.params.id);
    const target = await get("SELECT id, role FROM users WHERE id = ?", [
      userId,
    ]);

    if (!target) {
      return res.status(404).json({ message: "User not found" });
    }

    if (target.role !== "client") {
      return res
        .status(400)
        .json({ message: "Seuls les comptes clients peuvent etre supprimes" });
    }

    await run("DELETE FROM sessions WHERE user_id = ?", [userId]);
    await run("DELETE FROM users WHERE id = ?", [userId]);

    return res.json({ message: "User deleted" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Failed to delete user" });
  }
});

app.post("/api/admin/products", async (req, res) => {
  try {
    const admin = await requireAdminOrPharmacienUser(req, res);
    if (!admin) return;

    const {
      slug,
      name,
      category,
      grade,
      model,
      unit,
      stock,
      price,
      min_order_qty,
      colors,
      colorVariants,
      origin,
      image,
      description,
      featured,
    } = req.body;

    if (
      !name ||
      !category ||
      !grade ||
      !model ||
      !unit ||
      !origin ||
      !image ||
      !description
    ) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const finalSlug = slugify(slug || name);
    if (!finalSlug) {
      return res.status(400).json({ message: "Invalid slug" });
    }

    const normalizedVariants = normalizeColorVariantsInput(
      colorVariants ?? colors,
      Number(stock || 0),
    );

    const finalStock =
      normalizedVariants.length > 0
        ? normalizedVariants.reduce(
            (sum, variant) => sum + toSafeStock(variant.stock),
            0,
          )
        : Number(stock || 0);

    const exists = await get("SELECT id FROM products WHERE slug = ?", [
      finalSlug,
    ]);
    if (exists) {
      return res.status(409).json({ message: "Slug already used" });
    }

    await run(
      `
      INSERT INTO products
      (slug, name, category, grade, model, unit, stock, price, min_order_qty, colors_json, origin, image, description, featured)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        finalSlug,
        name,
        category,
        grade,
        model,
        unit,
        finalStock,
        Number(price || 0),
        Number(min_order_qty || 1),
        JSON.stringify(normalizedVariants),
        origin,
        image,
        description,
        featured ? 1 : 0,
      ],
    );

    return res.status(201).json({ message: "Product created" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Failed to create product" });
  }
});

app.put("/api/admin/products/:id", async (req, res) => {
  try {
    const admin = await requireAdminOrPharmacienUser(req, res);
    if (!admin) return;

    const product = await get("SELECT id FROM products WHERE id = ?", [
      req.params.id,
    ]);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    const {
      slug,
      name,
      category,
      grade,
      model,
      unit,
      stock,
      price,
      min_order_qty,
      colors,
      colorVariants,
      origin,
      image,
      description,
      featured,
    } = req.body;

    const finalSlug = slugify(slug || name || "");
    if (
      !finalSlug ||
      !name ||
      !category ||
      !grade ||
      !model ||
      !unit ||
      !origin ||
      !image ||
      !description
    ) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const slugConflict = await get(
      "SELECT id FROM products WHERE slug = ? AND id != ?",
      [finalSlug, req.params.id],
    );

    if (slugConflict) {
      return res.status(409).json({ message: "Slug already used" });
    }

    const normalizedVariants = normalizeColorVariantsInput(
      colorVariants ?? colors,
      Number(stock || 0),
    );

    const finalStock =
      normalizedVariants.length > 0
        ? normalizedVariants.reduce(
            (sum, variant) => sum + toSafeStock(variant.stock),
            0,
          )
        : Number(stock || 0);

    await run(
      `
      UPDATE products
      SET slug = ?, name = ?, category = ?, grade = ?, model = ?, unit = ?, stock = ?, price = ?, min_order_qty = ?, colors_json = ?, origin = ?, image = ?, description = ?, featured = ?
      WHERE id = ?
      `,
      [
        finalSlug,
        name,
        category,
        grade,
        model,
        unit,
        finalStock,
        Number(price || 0),
        Number(min_order_qty || 1),
        JSON.stringify(normalizedVariants),
        origin,
        image,
        description,
        featured ? 1 : 0,
        req.params.id,
      ],
    );

    return res.json({ message: "Product updated" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Failed to update product" });
  }
});

app.delete("/api/admin/products/:id", async (req, res) => {
  try {
    const admin = await requireAdminOrPharmacienUser(req, res);
    if (!admin) return;

    const product = await get("SELECT id FROM products WHERE id = ?", [
      req.params.id,
    ]);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    await run("DELETE FROM products WHERE id = ?", [req.params.id]);
    return res.json({ message: "Product deleted" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Failed to delete product" });
  }
});

initDb()
  .then(() => {
    app.listen(PORT, () => {
      console.log(
        `Pharmacie Malik Beniddir API running on http://localhost:${PORT}`,
      );
    });
  })
  .catch((err) => {
    console.error("DB init failed:", err.message);
    process.exit(1);
  });
