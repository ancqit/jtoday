import { Injectable, signal } from '@angular/core';
import { AppLang, TRANSLATIONS } from './translations';

const STORAGE_KEY = 'junction.today.lang';

@Injectable({ providedIn: 'root' })
export class I18nService {
  readonly lang = signal<AppLang>(this.readInitial());

  t(key: string, params?: Record<string, string | number>): string {
    const dict = TRANSLATIONS[this.lang()] ?? TRANSLATIONS.hi;
    let text = dict[key] ?? TRANSLATIONS.en[key] ?? key;
    if (params) {
      for (const [name, value] of Object.entries(params)) {
        text = text.replaceAll(`{{${name}}}`, String(value));
      }
    }
    return text;
  }

  setLang(lang: AppLang): void {
    this.lang.set(lang);
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch {
      /* ignore */
    }
    document.documentElement.lang = lang === 'hi' ? 'hi' : 'en';
  }

  toggle(): void {
    this.setLang(this.lang() === 'hi' ? 'en' : 'hi');
  }

  private readInitial(): AppLang {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === 'hi' || stored === 'en') {
        document.documentElement.lang = stored === 'hi' ? 'hi' : 'en';
        return stored;
      }
    } catch {
      /* ignore */
    }
    document.documentElement.lang = 'hi';
    return 'hi';
  }
}
