// Lightweight i18n: no external library, supports EN/AR/FR and RTL for AR.

import type { Locale } from "./types";

export const LOCALES: Locale[] = ["en", "ar", "fr"];

export const LOCALE_LABELS: Record<Locale, string> = {
  en: "English",
  ar: "العربية",
  fr: "Français",
};

export const RTL_LOCALES: Locale[] = ["ar"];

export function dir(locale: Locale): "rtl" | "ltr" {
  return RTL_LOCALES.includes(locale) ? "rtl" : "ltr";
}

type Dict = Record<string, Record<Locale, string>>;

export const messages: Dict = {
  // Toolbar / nav
  "nav.home": { en: "Home", ar: "الرئيسية", fr: "Accueil" },
  "nav.categories": { en: "Categories", ar: "الفئات", fr: "Catégories" },
  "nav.cart": { en: "Cart", ar: "السلة", fr: "Panier" },
  "nav.account": { en: "Account", ar: "الحساب", fr: "Compte" },
  "nav.admin": { en: "Admin", ar: "الإدارة", fr: "Admin" },

  // Storefront
  "brand.name": { en: "Nova", ar: "نوفا", fr: "Nova" },
  "hero.title": {
    en: "Thoughtfully curated. Delivered fast.",
    ar: "مختارة بعناية. تصل بسرعة.",
    fr: "Soigneusement sélectionné. Livré vite.",
  },
  "hero.subtitle": {
    en: "Discover essentials across electronics, home, fashion and more.",
    ar: "اكتشف الأساسيات في الإلكترونيات والمنزل والأزياء وأكثر.",
    fr: "Découvrez l'essentiel en électronique, maison, mode et plus.",
  },
  "search.placeholder": {
    en: "Search products, brands, categories…",
    ar: "ابحث عن المنتجات والعلامات والفئات…",
    fr: "Rechercher produits, marques, catégories…",
  },
  "search.submit": { en: "Search", ar: "بحث", fr: "Chercher" },
  "categories.title": { en: "Shop by category", ar: "تسوق حسب الفئة", fr: "Acheter par catégorie" },
  "categories.all": { en: "All", ar: "الكل", fr: "Tout" },
  "products.title": { en: "Featured products", ar: "منتجات مميزة", fr: "Produits en vedette" },
  "products.empty": {
    en: "No products match your search.",
    ar: "لا توجد منتجات مطابقة لبحثك.",
    fr: "Aucun produit ne correspond à votre recherche.",
  },
  "product.add": { en: "Add to cart", ar: "أضف إلى السلة", fr: "Ajouter au panier" },
  "product.outOfStock": { en: "Out of stock", ar: "غير متوفر", fr: "Rupture de stock" },
  "product.inStock": { en: "In stock", ar: "متوفر", fr: "En stock" },

  // Cart
  "cart.title": { en: "Your cart", ar: "سلة التسوق", fr: "Votre panier" },
  "cart.empty": { en: "Your cart is empty.", ar: "سلتك فارغة.", fr: "Votre panier est vide." },
  "cart.empty.cta": { en: "Continue shopping", ar: "مواصلة التسوق", fr: "Continuer les achats" },
  "cart.subtotal": { en: "Subtotal", ar: "المجموع الفرعي", fr: "Sous-total" },
  "cart.tax": { en: "Tax (10%)", ar: "الضريبة (10%)", fr: "Taxe (10%)" },
  "cart.total": { en: "Total", ar: "الإجمالي", fr: "Total" },
  "cart.checkout": { en: "Checkout", ar: "إتمام الشراء", fr: "Commander" },
  "cart.clear": { en: "Clear cart", ar: "تفريغ السلة", fr: "Vider le panier" },
  "cart.remove": { en: "Remove", ar: "حذف", fr: "Retirer" },
  "cart.quantity": { en: "Qty", ar: "الكمية", fr: "Qté" },

  // Checkout
  "checkout.title": { en: "Checkout", ar: "إتمام الشراء", fr: "Paiement" },
  "checkout.name": { en: "Full name", ar: "الاسم الكامل", fr: "Nom complet" },
  "checkout.email": { en: "Email", ar: "البريد الإلكتروني", fr: "E-mail" },
  "checkout.phone": { en: "Phone", ar: "الهاتف", fr: "Téléphone" },
  "checkout.address": { en: "Shipping address", ar: "عنوان الشحن", fr: "Adresse de livraison" },
  "checkout.place": { en: "Place order", ar: "تأكيد الطلب", fr: "Passer la commande" },
  "checkout.success.title": { en: "Order placed", ar: "تم تأكيد الطلب", fr: "Commande confirmée" },
  "checkout.success.body": {
    en: "Thanks! You'll receive an invoice by email shortly.",
    ar: "شكرًا لك! ستتلقى الفاتورة عبر البريد الإلكتروني قريبًا.",
    fr: "Merci ! Vous recevrez une facture par e-mail sous peu.",
  },

  // Account
  "account.title": { en: "Your account", ar: "حسابك", fr: "Votre compte" },
  "account.prefs": { en: "Preferences", ar: "التفضيلات", fr: "Préférences" },
  "account.language": { en: "Language", ar: "اللغة", fr: "Langue" },
  "account.signedInAs": { en: "Signed in as", ar: "مسجل الدخول باسم", fr: "Connecté en tant que" },

  // Admin
  "admin.title": { en: "Admin", ar: "الإدارة", fr: "Admin" },
  "admin.dashboard": { en: "Dashboard", ar: "لوحة التحكم", fr: "Tableau de bord" },
  "admin.inventory": { en: "Inventory", ar: "المخزون", fr: "Inventaire" },
  "admin.orders": { en: "Orders", ar: "الطلبات", fr: "Commandes" },
  "admin.invoices": { en: "Invoices", ar: "الفواتير", fr: "Factures" },
  "admin.settings": { en: "Settings", ar: "الإعدادات", fr: "Paramètres" },
};

export function t(key: string, locale: Locale): string {
  const entry = messages[key];
  if (!entry) return key;
  return entry[locale] ?? entry.en ?? key;
}
