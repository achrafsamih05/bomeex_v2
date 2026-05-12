import "server-only";
import { promises as fs } from "fs";
import path from "path";
import { randomBytes, scryptSync } from "crypto";
import type {
  Category,
  Invoice,
  Order,
  Product,
  Settings,
  User,
} from "../types";

// ---------------------------------------------------------------------------
// File-backed JSON store. In production swap for Supabase / Postgres / Firebase
// — the async surface below is already identical to a real DB client.
// ---------------------------------------------------------------------------

interface DBShape {
  products: Product[];
  categories: Category[];
  orders: Order[];
  invoices: Invoice[];
  users: User[];
  settings: Settings;
  counters: {
    product: number;
    order: number;
    invoice: number;
  };
}

const DB_PATH = path.join(process.cwd(), ".nova-db.json");

// Hot-reload safe singleton cache.
const g = globalThis as unknown as { __novaDB?: DBShape; __novaDBMutex?: Promise<void> };

function hashPassword(pw: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(pw, salt, 64).toString("hex");
  return `${salt}$${hash}`;
}

function seed(): DBShape {
  const img = (id: string) =>
    `https://images.unsplash.com/${id}?auto=format&fit=crop&w=800&q=70`;

  const categories: Category[] = [
    { id: "c-electronics", slug: "electronics", name: { en: "Electronics", ar: "إلكترونيات", fr: "Électronique" }, icon: "Cpu" },
    { id: "c-phones", slug: "phones", name: { en: "Phones", ar: "هواتف", fr: "Téléphones" }, icon: "Smartphone" },
    { id: "c-plumbing", slug: "plumbing", name: { en: "Plumbing", ar: "سباكة", fr: "Plomberie" }, icon: "Wrench" },
    { id: "c-home", slug: "home", name: { en: "Home", ar: "المنزل", fr: "Maison" }, icon: "Sofa" },
    { id: "c-fashion", slug: "fashion", name: { en: "Fashion", ar: "أزياء", fr: "Mode" }, icon: "Shirt" },
    { id: "c-sports", slug: "sports", name: { en: "Sports", ar: "رياضة", fr: "Sport" }, icon: "Dumbbell" },
  ];

  const products: Product[] = [
    { id: "p-001", sku: "NVA-EL-001", name: { en: "Aura Wireless Headphones", ar: "سماعات أورا اللاسلكية", fr: "Casque sans fil Aura" }, description: { en: "Studio-grade sound with adaptive noise cancellation and 40h battery.", ar: "صوت بمستوى الاستوديو مع إلغاء ضوضاء تكيفي وبطارية 40 ساعة.", fr: "Son studio, réduction de bruit adaptative et 40 h d'autonomie." }, price: 189, categoryId: "c-electronics", stock: 42, image: img("photo-1518444065439-e933c06ce9cd"), rating: 4.8, createdAt: "2026-01-12T09:00:00Z" },
    { id: "p-002", sku: "NVA-PH-001", name: { en: "Nova X1 Smartphone", ar: "هاتف نوفا X1 الذكي", fr: "Smartphone Nova X1" }, description: { en: "6.7\" OLED, triple camera, and a titanium frame built to last.", ar: "شاشة OLED 6.7 بوصة، ثلاث كاميرات، وإطار تيتانيوم متين.", fr: "OLED 6,7\", triple caméra, châssis en titane durable." }, price: 899, categoryId: "c-phones", stock: 18, image: img("photo-1511707171634-5f897ff02aa9"), rating: 4.7, createdAt: "2026-02-02T09:00:00Z" },
    { id: "p-003", sku: "NVA-PL-001", name: { en: "Copper Pipe Wrench", ar: "مفتاح أنابيب نحاسي", fr: "Clé à tube en cuivre" }, description: { en: "Forged steel jaws, ergonomic grip. Works on 1/2\" to 2\" pipes.", ar: "فكوك فولاذية مطروقة ومقبض مريح. يناسب أنابيب 1/2 إلى 2 بوصة.", fr: "Mâchoires en acier forgé, poignée ergonomique. Tubes 1/2\" à 2\"." }, price: 34, categoryId: "c-plumbing", stock: 120, image: img("photo-1581092921461-eab62e97a780"), rating: 4.5, createdAt: "2026-01-20T09:00:00Z" },
    { id: "p-004", sku: "NVA-EL-002", name: { en: "Lumen Smart Lamp", ar: "مصباح لومن الذكي", fr: "Lampe connectée Lumen" }, description: { en: "Millions of colors, voice control, and circadian rhythm presets.", ar: "ملايين الألوان وتحكم صوتي وإعدادات الإيقاع اليومي.", fr: "Des millions de couleurs, commande vocale et modes circadiens." }, price: 59, categoryId: "c-home", stock: 77, image: img("photo-1513506003901-1e6a229e2d15"), rating: 4.6, createdAt: "2026-02-15T09:00:00Z" },
    { id: "p-005", sku: "NVA-FA-001", name: { en: "Atelier Leather Jacket", ar: "سترة أتيليه الجلدية", fr: "Veste en cuir Atelier" }, description: { en: "Hand-finished full-grain leather with a tailored modern cut.", ar: "جلد طبيعي مصنوع يدويًا بقصة عصرية مخصصة.", fr: "Cuir pleine fleur fini main, coupe moderne." }, price: 349, categoryId: "c-fashion", stock: 22, image: img("photo-1551028719-00167b16eac5"), rating: 4.9, createdAt: "2026-03-01T09:00:00Z" },
    { id: "p-006", sku: "NVA-SP-001", name: { en: "Pulse Running Shoes", ar: "حذاء بولس للجري", fr: "Chaussures de course Pulse" }, description: { en: "Responsive foam, breathable mesh, 0-drop performance profile.", ar: "رغوة متجاوبة وشبكة تهوية وملف أداء بدون فرق ارتفاع.", fr: "Mousse réactive, mesh respirant, profil drop zéro." }, price: 129, categoryId: "c-sports", stock: 64, image: img("photo-1542291026-7eec264c27ff"), rating: 4.4, createdAt: "2026-03-10T09:00:00Z" },
    { id: "p-007", sku: "NVA-EL-003", name: { en: "Orbit Smartwatch", ar: "ساعة أوربت الذكية", fr: "Montre connectée Orbit" }, description: { en: "Health tracking, GPS, and a sapphire display ready for anything.", ar: "متابعة الصحة وGPS وشاشة سافير جاهزة لكل شيء.", fr: "Suivi santé, GPS et écran saphir prêt à tout." }, price: 249, categoryId: "c-electronics", stock: 31, image: img("photo-1523275335684-37898b6baf30"), rating: 4.6, createdAt: "2026-03-15T09:00:00Z" },
    { id: "p-008", sku: "NVA-PL-002", name: { en: "Flow Kitchen Faucet", ar: "حنفية مطبخ فلو", fr: "Robinet de cuisine Flow" }, description: { en: "Pull-down sprayer, brushed nickel finish, ceramic disc valve.", ar: "رأس قابل للسحب، طلاء نيكل مصقول، وصمام قرص خزفي.", fr: "Douchette extractible, finition nickel brossé, cartouche céramique." }, price: 189, categoryId: "c-plumbing", stock: 48, image: img("photo-1584622650111-993a426fbf0a"), rating: 4.3, createdAt: "2026-03-20T09:00:00Z" },
    { id: "p-009", sku: "NVA-HM-001", name: { en: "Cloud Linen Sofa", ar: "أريكة كلاود الكتانية", fr: "Canapé en lin Cloud" }, description: { en: "Deep-seat three-seater with a hardwood frame and washable covers.", ar: "أريكة ثلاثية عميقة بإطار خشبي صلب وأغطية قابلة للغسل.", fr: "Canapé 3 places assise profonde, structure bois massif, housses lavables." }, price: 1299, categoryId: "c-home", stock: 7, image: img("photo-1555041469-a586c61ea9bc"), rating: 4.8, createdAt: "2026-04-01T09:00:00Z" },
    { id: "p-010", sku: "NVA-PH-002", name: { en: "Nova Buds Pro", ar: "سماعات نوفا بودز برو", fr: "Nova Buds Pro" }, description: { en: "Wireless earbuds with spatial audio and a pocketable charging case.", ar: "سماعات لاسلكية بصوت مكاني وعلبة شحن مدمجة.", fr: "Écouteurs sans fil, audio spatial et boîtier de charge compact." }, price: 149, categoryId: "c-phones", stock: 96, image: img("photo-1606220945770-b5b6c2c55bf1"), rating: 4.5, createdAt: "2026-04-05T09:00:00Z" },
    { id: "p-011", sku: "NVA-FA-002", name: { en: "Linen Summer Shirt", ar: "قميص صيفي كتاني", fr: "Chemise en lin d'été" }, description: { en: "Breathable linen blend with a relaxed, modern silhouette.", ar: "مزيج كتاني يسمح بمرور الهواء بقصّة عصرية مريحة.", fr: "Mélange de lin respirant, silhouette moderne et décontractée." }, price: 79, categoryId: "c-fashion", stock: 58, image: img("photo-1520975916090-3105956dac38"), rating: 4.2, createdAt: "2026-04-10T09:00:00Z" },
    { id: "p-012", sku: "NVA-SP-002", name: { en: "Forge Dumbbell Set", ar: "طقم دمبل فورج", fr: "Set d'haltères Forge" }, description: { en: "Matte-black rubber hex dumbbells, 5 to 50 lbs, with a sleek rack.", ar: "دمبلات سداسية مطاطية سوداء من 5 إلى 50 رطلاً مع حامل أنيق.", fr: "Haltères hexagonaux noirs mats, 5 à 50 lb, avec rack élégant." }, price: 499, categoryId: "c-sports", stock: 12, image: img("photo-1517836357463-d25dfeac3438"), rating: 4.7, createdAt: "2026-04-15T09:00:00Z" },
  ];

  // Seed one admin and one customer so the app is usable out of the box.
  // Change the password immediately after first run.
  const users: User[] = [
    {
      id: "u-admin",
      email: "admin@nova.shop",
      name: "Nova Admin",
      role: "admin",
      phone: "+1 555 0100",
      address: "1 Commerce Way",
      city: "New York",
      postalCode: "10001",
      country: "US",
      banned: false,
      passwordHash: hashPassword("admin1234"),
      createdAt: new Date().toISOString(),
    },
    {
      id: "u-demo",
      email: "demo@nova.shop",
      name: "Demo Customer",
      role: "customer",
      phone: "+1 555 0200",
      address: "221B Baker St",
      city: "London",
      postalCode: "NW1 6XE",
      country: "UK",
      banned: false,
      passwordHash: hashPassword("demo1234"),
      createdAt: new Date().toISOString(),
    },
  ];

  const settings: Settings = {
    storeName: "Nova",
    currency: "USD",
    taxRate: 10,
    lowStockThreshold: 20,
  };

  // Seed a few sample orders + invoices tied to the demo user so the admin
  // dashboard shows real numbers immediately.
  const orders: Order[] = [
    {
      id: "o-1001",
      userId: "u-demo",
      customer: {
        name: "Demo Customer",
        email: "demo@nova.shop",
        phone: "+1 555 0200",
        address: "221B Baker St, London",
      },
      items: [
        { productId: "p-001", name: "Aura Wireless Headphones", quantity: 1, price: 189 },
        { productId: "p-010", name: "Nova Buds Pro", quantity: 2, price: 149 },
      ],
      subtotal: 487,
      tax: 48.7,
      total: 535.7,
      status: "delivered",
      createdAt: "2026-04-22T10:14:00Z",
    },
    {
      id: "o-1002",
      userId: "u-demo",
      customer: {
        name: "Demo Customer",
        email: "demo@nova.shop",
        phone: "+1 555 0200",
        address: "221B Baker St, London",
      },
      items: [{ productId: "p-002", name: "Nova X1 Smartphone", quantity: 1, price: 899 }],
      subtotal: 899,
      tax: 89.9,
      total: 988.9,
      status: "shipped",
      createdAt: "2026-05-01T17:41:00Z",
    },
  ];

  const invoices: Invoice[] = [
    {
      id: "i-5001",
      orderId: "o-1001",
      number: "INV-2026-5001",
      issuedAt: "2026-04-22T10:14:00Z",
      dueAt: "2026-05-06T10:14:00Z",
      status: "paid",
      amount: 535.7,
    },
    {
      id: "i-5002",
      orderId: "o-1002",
      number: "INV-2026-5002",
      issuedAt: "2026-05-01T17:41:00Z",
      dueAt: "2026-05-15T17:41:00Z",
      status: "unpaid",
      amount: 988.9,
    },
  ];

  return {
    products,
    categories,
    orders,
    invoices,
    users,
    settings,
    counters: { product: 12, order: 1002, invoice: 5002 },
  };
}

async function ensureLoaded(): Promise<DBShape> {
  if (g.__novaDB) return g.__novaDB;
  try {
    const raw = await fs.readFile(DB_PATH, "utf8");
    const parsed = JSON.parse(raw) as DBShape;
    // Simple forward-compat defaults.
    parsed.users ??= [];
    parsed.settings ??= seed().settings;
    parsed.counters ??= { product: parsed.products.length, order: 1000 + parsed.orders.length, invoice: 5000 + parsed.invoices.length };
    g.__novaDB = parsed;
  } catch {
    const fresh = seed();
    g.__novaDB = fresh;
    await persist();
  }
  return g.__novaDB!;
}

async function persist(): Promise<void> {
  if (!g.__novaDB) return;
  // Serialize writes to avoid interleaving.
  const tmp = DB_PATH + ".tmp";
  const body = JSON.stringify(g.__novaDB, null, 2);
  g.__novaDBMutex = (g.__novaDBMutex ?? Promise.resolve()).then(async () => {
    await fs.writeFile(tmp, body);
    await fs.rename(tmp, DB_PATH);
  });
  return g.__novaDBMutex;
}

// ---------------------------------------------------------------------------
// Public async API
// ---------------------------------------------------------------------------

export async function getDB(): Promise<DBShape> {
  return ensureLoaded();
}

export async function save(): Promise<void> {
  await persist();
}

// Products
export async function listProducts() {
  return (await getDB()).products;
}
export async function getProduct(id: string) {
  return (await getDB()).products.find((p) => p.id === id) ?? null;
}
export async function createProduct(p: Product) {
  const db = await getDB();
  db.products.push(p);
  await save();
}
export async function updateProduct(id: string, patch: Partial<Product>) {
  const db = await getDB();
  const idx = db.products.findIndex((p) => p.id === id);
  if (idx === -1) return null;
  db.products[idx] = { ...db.products[idx], ...patch };
  await save();
  return db.products[idx];
}
export async function deleteProduct(id: string) {
  const db = await getDB();
  const idx = db.products.findIndex((p) => p.id === id);
  if (idx === -1) return null;
  const [removed] = db.products.splice(idx, 1);
  await save();
  return removed;
}
export async function nextProductId() {
  const db = await getDB();
  db.counters.product += 1;
  return `p-${String(db.counters.product).padStart(3, "0")}`;
}

// Categories
export async function listCategories() {
  return (await getDB()).categories;
}

// Orders
export async function listOrders() {
  return (await getDB()).orders;
}
export async function getOrder(id: string) {
  return (await getDB()).orders.find((o) => o.id === id) ?? null;
}
export async function createOrder(o: Order) {
  const db = await getDB();
  db.orders.unshift(o);
  await save();
}
export async function updateOrder(id: string, patch: Partial<Order>) {
  const db = await getDB();
  const idx = db.orders.findIndex((o) => o.id === id);
  if (idx === -1) return null;
  db.orders[idx] = { ...db.orders[idx], ...patch };
  await save();
  return db.orders[idx];
}
export async function nextOrderId() {
  const db = await getDB();
  db.counters.order += 1;
  return `o-${db.counters.order}`;
}

// Invoices
export async function listInvoices() {
  return (await getDB()).invoices;
}
export async function getInvoice(id: string) {
  return (await getDB()).invoices.find((i) => i.id === id) ?? null;
}
export async function createInvoice(inv: Invoice) {
  const db = await getDB();
  db.invoices.unshift(inv);
  await save();
}
export async function updateInvoice(id: string, patch: Partial<Invoice>) {
  const db = await getDB();
  const idx = db.invoices.findIndex((i) => i.id === id);
  if (idx === -1) return null;
  db.invoices[idx] = { ...db.invoices[idx], ...patch };
  await save();
  return db.invoices[idx];
}
export async function nextInvoiceId() {
  const db = await getDB();
  db.counters.invoice += 1;
  return `i-${db.counters.invoice}`;
}

// Users
export async function listUsers() {
  return (await getDB()).users;
}
export async function getUserById(id: string) {
  return (await getDB()).users.find((u) => u.id === id) ?? null;
}
export async function getUserByEmail(email: string) {
  const e = email.toLowerCase().trim();
  return (await getDB()).users.find((u) => u.email.toLowerCase() === e) ?? null;
}
export async function createUser(u: User) {
  const db = await getDB();
  db.users.push(u);
  await save();
}
export async function updateUser(id: string, patch: Partial<User>) {
  const db = await getDB();
  const idx = db.users.findIndex((u) => u.id === id);
  if (idx === -1) return null;
  db.users[idx] = { ...db.users[idx], ...patch };
  await save();
  return db.users[idx];
}
export async function deleteUser(id: string) {
  const db = await getDB();
  const idx = db.users.findIndex((u) => u.id === id);
  if (idx === -1) return null;
  const [removed] = db.users.splice(idx, 1);
  await save();
  return removed;
}

// Settings
export async function getSettings() {
  return (await getDB()).settings;
}
export async function updateSettings(patch: Partial<Settings>) {
  const db = await getDB();
  db.settings = { ...db.settings, ...patch };
  await save();
  return db.settings;
}
