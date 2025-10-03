import { I18n } from "@grammyjs/i18n";
import type { MyContext } from "./types.js";
export function createI18n(){
  return new I18n<MyContext>({
    defaultLocale:"uk", directory:"locales",
    localeNegotiator:(ctx)=>{ if(ctx.session.locale) return ctx.session.locale; const h=(ctx.from?.language_code||'').toLowerCase(); return (h.startsWith('uk')||h.startsWith('ru'))?'uk':'en'; }
  });
}
