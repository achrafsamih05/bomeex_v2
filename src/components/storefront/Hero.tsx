"use client";

import { useI18n } from "@/lib/useI18n";

export function Hero() {
  const { t } = useI18n();
  return (
    <section className="relative overflow-hidden rounded-xl2 border border-slate-200 bg-slate-50 p-6 text-slate-900 shadow-soft sm:p-10">
      {/* تأثيرات الإضاءة (العناصر الغامقة والملونة في الخلفية) */}
      <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-brand-500/10 blur-3xl" />
      <div className="absolute -bottom-20 -left-10 h-64 w-64 rounded-full bg-slate-900/5 blur-3xl" />
      
      <div className="relative max-w-2xl space-y-4">
        {/* شارة صغيرة بلون غامق للتباين */}
        <span className="inline-flex rounded-full bg-slate-900 px-3 py-1 text-xs font-medium tracking-wide text-white">
          {t("brand.name")}
        </span>
        
        {/* العنوان بلون غامق جداً (Slate-950) */}
        <h1 className="text-3xl font-bold leading-tight tracking-tight text-slate-950 sm:text-5xl">
          {t("hero.title")}
        </h1>
        
        {/* الوصف بلون رمادي متوسط للتباين الهادئ */}
        <p className="max-w-lg text-sm text-slate-600 sm:text-lg">
          {t("hero.subtitle")}
        </p>

        {/* زر تجريبي (اختياري) لإظهار قوة التباين */}
        <div className="pt-4">
          <button className="rounded-lg bg-slate-900 px-6 py-2.5 text-sm font-medium text-white transition-all hover:bg-brand-600">
            تصفح المنتجات
          </button>
        </div>
      </div>
    </section>
  );
}
