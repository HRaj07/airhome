"use client";

import { createContext, useCallback, useContext, useEffect, useState, ReactNode } from "react";

/**
 * Currency + language/region preferences, chosen from the globe icon in the
 * header (mirrors Airbnb's "Language and region / Currency" modal).
 *
 * All prices in the database are stored in USD; display conversion uses a
 * fixed mock rate table (this is a demo — no live FX feed).
 */

export type CurrencyCode = "USD" | "INR" | "EUR" | "GBP" | "JPY" | "AUD" | "CAD" | "SGD";

export interface CurrencyOption {
  code: CurrencyCode;
  name: string;
  symbol: string;
  locale: string;
  rate: number; // 1 USD = rate units of this currency
  decimals: number;
}

export const CURRENCIES: CurrencyOption[] = [
  { code: "USD", name: "United States dollar", symbol: "$", locale: "en-US", rate: 1, decimals: 2 },
  { code: "INR", name: "Indian rupee", symbol: "₹", locale: "en-IN", rate: 83.5, decimals: 0 },
  { code: "EUR", name: "Euro", symbol: "€", locale: "de-DE", rate: 0.92, decimals: 2 },
  { code: "GBP", name: "Pound sterling", symbol: "£", locale: "en-GB", rate: 0.79, decimals: 2 },
  { code: "JPY", name: "Japanese yen", symbol: "¥", locale: "ja-JP", rate: 149, decimals: 0 },
  { code: "AUD", name: "Australian dollar", symbol: "A$", locale: "en-AU", rate: 1.52, decimals: 2 },
  { code: "CAD", name: "Canadian dollar", symbol: "C$", locale: "en-CA", rate: 1.36, decimals: 2 },
  { code: "SGD", name: "Singapore dollar", symbol: "S$", locale: "en-SG", rate: 1.34, decimals: 2 },
];

export interface LanguageOption {
  code: string; // e.g. "en-IN"
  language: string;
  region: string;
}

export const SUGGESTED_LANGUAGES: LanguageOption[] = [
  { code: "en-GB", language: "English", region: "United Kingdom" },
  { code: "en-US", language: "English", region: "United States" },
  { code: "hi-IN", language: "हिन्दी", region: "भारत" },
  { code: "kn-IN", language: "ಕನ್ನಡ", region: "ಭಾರತ" },
  { code: "mr-IN", language: "मराठी", region: "भारत" },
];

export const ALL_LANGUAGES: LanguageOption[] = [
  { code: "en-IN", language: "English", region: "India" },
  { code: "az-AZ", language: "Azərbaycan dili", region: "Azərbaycan" },
  { code: "id-ID", language: "Bahasa Indonesia", region: "Indonesia" },
  { code: "bs-BA", language: "Bosanski", region: "Bosna i Hercegovina" },
  { code: "ca-ES", language: "Català", region: "Espanya" },
  { code: "cs-CZ", language: "Čeština", region: "Česká republika" },
  { code: "sr-ME", language: "Crnogorski", region: "Crna Gora" },
  { code: "da-DK", language: "Dansk", region: "Danmark" },
  { code: "de-DE", language: "Deutsch", region: "Deutschland" },
  { code: "de-AT", language: "Deutsch", region: "Österreich" },
  { code: "de-CH", language: "Deutsch", region: "Schweiz" },
  { code: "de-LU", language: "Deutsch", region: "Luxemburg" },
  { code: "et-EE", language: "Eesti", region: "Eesti" },
  { code: "en-AU", language: "English", region: "Australia" },
  { code: "en-CA", language: "English", region: "Canada" },
  { code: "en-GB", language: "English", region: "United Kingdom" },
  { code: "en-US", language: "English", region: "United States" },
  { code: "es-ES", language: "Español", region: "España" },
  { code: "es-MX", language: "Español", region: "México" },
  { code: "fr-FR", language: "Français", region: "France" },
  { code: "fr-CA", language: "Français", region: "Canada" },
  { code: "it-IT", language: "Italiano", region: "Italia" },
  { code: "ja-JP", language: "日本語", region: "日本" },
  { code: "ko-KR", language: "한국어", region: "대한민국" },
  { code: "nl-NL", language: "Nederlands", region: "Nederland" },
  { code: "pt-BR", language: "Português", region: "Brasil" },
  { code: "pt-PT", language: "Português", region: "Portugal" },
  { code: "hi-IN", language: "हिन्दी", region: "भारत" },
  { code: "zh-CN", language: "简体中文", region: "中国" },
];

interface LocaleContextValue {
  currency: CurrencyOption;
  setCurrency: (code: CurrencyCode) => void;
  language: LanguageOption;
  setLanguage: (code: string) => void;
  /** Format a USD amount in the selected currency. */
  formatPrice: (usdAmount: number, opts?: { decimals?: number }) => string;
}

const LocaleContext = createContext<LocaleContextValue | undefined>(undefined);

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [currencyCode, setCurrencyCode] = useState<CurrencyCode>("USD");
  const [languageCode, setLanguageCode] = useState<string>("en-US");

  useEffect(() => {
    try {
      const storedCurrency = window.localStorage.getItem("airbnb_currency") as CurrencyCode | null;
      const storedLanguage = window.localStorage.getItem("airbnb_language");
      if (storedCurrency && CURRENCIES.some((c) => c.code === storedCurrency)) setCurrencyCode(storedCurrency);
      if (storedLanguage) setLanguageCode(storedLanguage);
    } catch {
      // ignore storage errors
    }
  }, []);

  const setCurrency = useCallback((code: CurrencyCode) => {
    setCurrencyCode(code);
    try {
      window.localStorage.setItem("airbnb_currency", code);
    } catch {
      // ignore
    }
  }, []);

  const setLanguage = useCallback((code: string) => {
    setLanguageCode(code);
    try {
      window.localStorage.setItem("airbnb_language", code);
    } catch {
      // ignore
    }
  }, []);

  const currency = CURRENCIES.find((c) => c.code === currencyCode) || CURRENCIES[0];
  const language =
    ALL_LANGUAGES.find((l) => l.code === languageCode) ||
    SUGGESTED_LANGUAGES.find((l) => l.code === languageCode) ||
    ALL_LANGUAGES[0];

  const formatPrice = useCallback(
    (usdAmount: number, opts?: { decimals?: number }) => {
      const amount = usdAmount * currency.rate;
      const decimals = opts?.decimals ?? currency.decimals;
      try {
        return new Intl.NumberFormat(currency.locale, {
          style: "currency",
          currency: currency.code,
          minimumFractionDigits: decimals,
          maximumFractionDigits: decimals,
        }).format(amount);
      } catch {
        return `${currency.symbol}${amount.toFixed(decimals)}`;
      }
    },
    [currency]
  );

  return (
    <LocaleContext.Provider value={{ currency, setCurrency, language, setLanguage, formatPrice }}>
      {children}
    </LocaleContext.Provider>
  );
}

export function useLocale() {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error("useLocale must be used within LocaleProvider");
  return ctx;
}
