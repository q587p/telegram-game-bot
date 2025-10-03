import { I18n } from "@grammyjs/i18n";
import { Context } from "grammy";
import { join } from "node:path";

/**
 * I18n ініціалізація.
 * Дефолтна мова — uk. Визначення мови:
 * 1) ctx.session?.lang (якщо додаси сесію в майбутньому)
 * 2) ctx.from?.language_code (telegрамовий хінт)
 * 3) 'uk'
 */
export function createI18n() {
  const i18n = new I18n<Context>({
    defaultLanguage: "uk",
    directory: join(process.cwd(), "locales"),
    useSession: false
  });

  return i18n;
}
