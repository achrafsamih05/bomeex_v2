// In-memory "database". In production this should be replaced by a real
// store (Supabase, PostgreSQL, Firebase). The shapes here are identical to
// what those stores would return so swapping is a one-line change per entity.

import type { Category, Invoice, Order, Product } from "./types";

export const categories: Category[] = [
  {
    id: "c-electronics",
    slug: "electronics",
    name: { en: "Electronics", ar: "إلكترونيات", fr: "Électronique" },
    icon: "Cpu",
  },
  {
    id: "c-phones",
    slug: "phones",
    name: { en: "Phones", ar: "هواتف", fr: "Téléphones" },
    icon: "Smartphone",
  },
  {
    id: "c-plumbing",
    slug: "plumbing",
    name: { en: "Plumbing", ar: "سباكة", fr: "Plomberie" },
    icon: "Wrench",
  },
  {
    id: "c-home",
    slug: "home",
    name: { en: "Home", ar: "المنزل", fr: "Maison" },
    icon: "Sofa",
  },
  {
    id: "c-fashion",
    slug: "fashion",
    name: { en: "Fashion", ar: "أزياء", fr: "Mode" },
    icon: "Shirt",
  },
  {
    id: "c-sports",
    slug: "sports",
    name: { en: "Sports", ar: "رياضة", fr: "Sport" },
    icon: "Dumbbell",
  },
];

// Stable Unsplash photos chosen for product-like aesthetics.
const img = (id: string) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=800&q=70`;

export const products: Product[] = [
  {
    id: "p-001",
    sku: "NVA-EL-001",
    name: {
      en: "Aura Wireless Headphones",
      ar: "سماعات أورا اللاسلكية",
      fr: "Casque sans fil Aura",
    },
    description: {
      en: "Studio-grade sound with adaptive noise cancellation and 40h battery.",
      ar: "صوت بمستوى الاستوديو مع إلغاء ضوضاء تكيفي وبطارية 40 ساعة.",
      fr: "Son studio, réduction de bruit adaptative et 40 h d'autonomie.",
    },
    price: 189,
    currency: "USD",
    categoryId: "c-electronics",
    stock: 42,
    image: img("photo-1518444065439-e933c06ce9cd"),
    rating: 4.8,
    createdAt: "2026-01-12T09:00:00Z",
  },
  {
    id: "p-002",
    sku: "NVA-PH-001",
    name: {
      en: "Nova X1 Smartphone",
      ar: "هاتف نوفا X1 الذكي",
      fr: "Smartphone Nova X1",
    },
    description: {
      en: "6.7\" OLED, triple camera, and a titanium frame built to last.",
      ar: "شاشة OLED 6.7 بوصة، ثلاث كاميرات، وإطار تيتانيوم متين.",
      fr: "OLED 6,7\", triple caméra, châssis en titane durable.",
    },
    price: 899,
    currency: "USD",
    categoryId: "c-phones",
    stock: 18,
    image: img("photo-1511707171634-5f897ff02aa9"),
    rating: 4.7,
    createdAt: "2026-02-02T09:00:00Z",
  },
  {
    id: "p-003",
    sku: "NVA-PL-001",
    name: {
      en: "Copper Pipe Wrench",
      ar: "مفتاح أنابيب نحاسي",
      fr: "Clé à tube en cuivre",
    },
    description: {
      en: "Forged steel jaws, ergonomic grip. Works on 1/2\" to 2\" pipes.",
      ar: "فكوك فولاذية مطروقة ومقبض مريح. يناسب أنابيب 1/2 إلى 2 بوصة.",
      fr: "Mâchoires en acier forgé, poignée ergonomique. Tubes 1/2\" à 2\".",
    },
    price: 34,
    currency: "USD",
    categoryId: "c-plumbing",
    stock: 120,
    image: img("photo-1581092921461-eab62e97a780"),
    rating: 4.5,
    createdAt: "2026-01-20T09:00:00Z",
  },
  {
    id: "p-004",
    sku: "NVA-EL-002",
    name: {
      en: "Lumen Smart Lamp",
      ar: "مصباح لومن الذكي",
      fr: "Lampe connectée Lumen",
    },
    description: {
      en: "Millions of colors, voice control, and circadian rhythm presets.",
      ar: "ملايين الألوان وتحكم صوتي وإعدادات الإيقاع اليومي.",
      fr: "Des millions de couleurs, commande vocale et modes circadiens.",
    },
    price: 59,
    currency: "USD",
    categoryId: "c-home",
    stock: 77,
    image: img("photo-1513506003901-1e6a229e2d15"),
    rating: 4.6,
    createdAt: "2026-02-15T09:00:00Z",
  },
  {
    id: "p-005",
    sku: "NVA-FA-001",
    name: {
      en: "Atelier Leather Jacket",
      ar: "سترة أتيليه الجلدية",
      fr: "Veste en cuir Atelier",
    },
    description: {
      en: "Hand-finished full-grain leather with a tailored modern cut.",
      ar: "جلد طبيعي مصنوع يدويًا بقصة عصرية مخصصة.",
      fr: "Cuir pleine fleur fini main, coupe moderne.",
    },
    price: 349,
    currency: "USD",
    categoryId: "c-fashion",
    stock: 22,
    image: img("photo-1551028719-00167b16eac5"),
    rating: 4.9,
    createdAt: "2026-03-01T09:00:00Z",
  },
  {
    id: "p-006",
    sku: "NVA-SP-001",
    name: {
      en: "Pulse Running Shoes",
      ar: "حذاء بولس للجري",
      fr: "Chaussures de course Pulse",
    },
    description: {
      en: "Responsive foam, breathable mesh, 0-drop performance profile.",
      ar: "رغوة متجاوبة وشبكة تهوية وملف أداء بدون فرق ارتفاع.",
      fr: "Mousse réactive, mesh respirant, profil drop zéro.",
    },
    price: 129,
    currency: "USD",
    categoryId: "c-sports",
    stock: 64,
    image: img("photo-1542291026-7eec264c27ff"),
    rating: 4.4,
    createdAt: "2026-03-10T09:00:00Z",
  },
  {
    id: "p-007",
    sku: "NVA-EL-003",
    name: {
      en: "Orbit Smartwatch",
      ar: "ساعة أوربت الذكية",
      fr: "Montre connectée Orbit",
    },
    description: {
      en: "Health tracking, GPS, and a sapphire display ready for anything.",
      ar: "متابعة الصحة وGPS وشاشة سافير جاهزة لكل شيء.",
      fr: "Suivi santé, GPS et écran saphir prêt à tout.",
    },
    price: 249,
    currency: "USD",
    categoryId: "c-electronics",
    stock: 31,
    image: img("photo-1523275335684-37898b6baf30"),
    rating: 4.6,
    createdAt: "2026-03-15T09:00:00Z",
  },
  {
    id: "p-008",
    sku: "NVA-PL-002",
    name: {
      en: "Flow Kitchen Faucet",
      ar: "حنفية مطبخ فلو",
      fr: "Robinet de cuisine Flow",
    },
    description: {
      en: "Pull-down sprayer, brushed nickel finish, ceramic disc valve.",
      ar: "رأس قابل للسحب، طلاء نيكل مصقول، وصمام قرص خزفي.",
      fr: "Douchette extractible, finition nickel brossé, cartouche céramique.",
    },
    price: 189,
    currency: "USD",
    categoryId: "c-plumbing",
    stock: 48,
    image: img("photo-1584622650111-993a426fbf0a"),
    rating: 4.3,
    createdAt: "2026-03-20T09:00:00Z",
  },
  {
    id: "p-009",
    sku: "NVA-HM-001",
    name: {
      en: "Cloud Linen Sofa",
      ar: "أريكة كلاود الكتانية",
      fr: "Canapé en lin Cloud",
    },
    description: {
      en: "Deep-seat three-seater with a hardwood frame and washable covers.",
      ar: "أريكة ثلاثية عميقة بإطار خشبي صلب وأغطية قابلة للغسل.",
      fr: "Canapé 3 places assise profonde, structure bois massif, housses lavables.",
    },
    price: 1299,
    currency: "USD",
    categoryId: "c-home",
    stock: 7,
    image: img("photo-1555041469-a586c61ea9bc"),
    rating: 4.8,
    createdAt: "2026-04-01T09:00:00Z",
  },
  {
    id: "p-010",
    sku: "NVA-PH-002",
    name: {
      en: "Nova Buds Pro",
      ar: "سماعات نوفا بودز برو",
      fr: "Nova Buds Pro",
    },
    description: {
      en: "Wireless earbuds with spatial audio and a pocketable charging case.",
      ar: "سماعات لاسلكية بصوت مكاني وعلبة شحن مدمجة.",
      fr: "Écouteurs sans fil, audio spatial et boîtier de charge compact.",
    },
    price: 149,
    currency: "USD",
    categoryId: "c-phones",
    stock: 96,
    image: img("photo-1606220945770-b5b6c2c55bf1"),
    rating: 4.5,
    createdAt: "2026-04-05T09:00:00Z",
  },
  {
    id: "p-011",
    sku: "NVA-FA-002",
    name: {
      en: "Linen Summer Shirt",
      ar: "قميص صيفي كتاني",
      fr: "Chemise en lin d'été",
    },
    description: {
      en: "Breathable linen blend with a relaxed, modern silhouette.",
      ar: "مزيج كتاني يسمح بمرور الهواء بقصّة عصرية مريحة.",
      fr: "Mélange de lin respirant, silhouette moderne et décontractée.",
    },
    price: 79,
    currency: "USD",
    categoryId: "c-fashion",
    stock: 58,
    image: img("photo-1520975916090-3105956dac38"),
    rating: 4.2,
    createdAt: "2026-04-10T09:00:00Z",
  },
  {
    id: "p-012",
    sku: "NVA-SP-002",
    name: {
      en: "Forge Dumbbell Set",
      ar: "طقم دمبل فورج",
      fr: "Set d'haltères Forge",
    },
    description: {
      en: "Matte-black rubber hex dumbbells, 5 to 50 lbs, with a sleek rack.",
      ar: "دمبلات سداسية مطاطية سوداء من 5 إلى 50 رطلاً مع حامل أنيق.",
      fr: "Haltères hexagonaux noirs mats, 5 à 50 lb, avec rack élégant.",
    },
    price: 499,
    currency: "USD",
    categoryId: "c-sports",
    stock: 12,
    image: img("photo-1517836357463-d25dfeac3438"),
    rating: 4.7,
    createdAt: "2026-04-15T09:00:00Z",
  },
];

export const orders: Order[] = [
  {
    id: "o-1001",
    customer: {
      name: "Amelia Khan",
      email: "amelia@example.com",
      address: "221B Baker St, London",
      phone: "+44 20 7946 0958",
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
    customer: {
      name: "Yusuf Haddad",
      email: "yusuf@example.com",
      address: "14 Rue du Port, Marseille",
      phone: "+33 4 91 00 00 00",
    },
    items: [
      { productId: "p-002", name: "Nova X1 Smartphone", quantity: 1, price: 899 },
    ],
    subtotal: 899,
    tax: 89.9,
    total: 988.9,
    status: "shipped",
    createdAt: "2026-05-01T17:41:00Z",
  },
  {
    id: "o-1003",
    customer: {
      name: "Sara Oliveira",
      email: "sara@example.com",
      address: "Av. Paulista 900, São Paulo",
      phone: "+55 11 99999 0000",
    },
    items: [
      { productId: "p-005", name: "Atelier Leather Jacket", quantity: 1, price: 349 },
      { productId: "p-011", name: "Linen Summer Shirt", quantity: 2, price: 79 },
    ],
    subtotal: 507,
    tax: 50.7,
    total: 557.7,
    status: "processing",
    createdAt: "2026-05-06T08:02:00Z",
  },
  {
    id: "o-1004",
    customer: {
      name: "Kenji Ito",
      email: "kenji@example.com",
      address: "1-1 Chiyoda, Tokyo",
      phone: "+81 3 0000 0000",
    },
    items: [
      { productId: "p-009", name: "Cloud Linen Sofa", quantity: 1, price: 1299 },
    ],
    subtotal: 1299,
    tax: 129.9,
    total: 1428.9,
    status: "pending",
    createdAt: "2026-05-09T13:20:00Z",
  },
];

export const invoices: Invoice[] = [
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
    status: "paid",
    amount: 988.9,
  },
  {
    id: "i-5003",
    orderId: "o-1003",
    number: "INV-2026-5003",
    issuedAt: "2026-05-06T08:02:00Z",
    dueAt: "2026-05-20T08:02:00Z",
    status: "unpaid",
    amount: 557.7,
  },
  {
    id: "i-5004",
    orderId: "o-1004",
    number: "INV-2026-5004",
    issuedAt: "2026-05-09T13:20:00Z",
    dueAt: "2026-05-23T13:20:00Z",
    status: "unpaid",
    amount: 1428.9,
  },
];

// ---------- Mutation helpers ----------

export function nextProductId() {
  const n = products.length + 1;
  return `p-${String(n).padStart(3, "0")}`;
}

export function nextOrderId() {
  const n = orders.length + 1001;
  return `o-${n}`;
}

export function nextInvoiceId() {
  const n = invoices.length + 5001;
  return `i-${n}`;
}
