import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';

interface CurrencyContextType {
  currency: string;
  currencySymbol: string;
  baseCurrency: string;
  exchangeRate: number;
  formatPrice: (amount: number) => string;
  convertPrice: (amount: number) => number;
  toStripeAmount: (amount: number) => number;
  setCurrency: (currency: string, symbol?: string) => void;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

const USER_CURRENCY_KEY = 'patchpress-user-currency';
const CMS_CONTENT_KEY = 'cms_site_content';

const CURRENCY_SYMBOLS: Record<string, string> = {
  usd: '$',
  sgd: 'S$',
  eur: '€',
  gbp: '£',
  jpy: '¥',
  krw: '₩',
};

// Stripe zero-decimal currencies (amount is in whole units, not cents)
const ZERO_DECIMAL_CURRENCIES = new Set(['jpy', 'krw']);

function getSymbolFor(currency: string): string {
  return CURRENCY_SYMBOLS[currency.toLowerCase()] || '$';
}

function loadFromStorage(): {
  currency: string;
  symbol: string;
  baseCurrency: string;
} {
  // 1. User preference (highest priority)
  try {
    const userPref = localStorage.getItem(USER_CURRENCY_KEY);
    if (userPref) {
      const parsed = JSON.parse(userPref);
      if (parsed.currency) {
        return {
          currency: parsed.currency.toLowerCase(),
          symbol: parsed.symbol || getSymbolFor(parsed.currency),
          baseCurrency: parsed.baseCurrency || 'sgd',
        };
      }
    }
  } catch { /* ignore */ }

  // 2. CMS default
  try {
    const cms = localStorage.getItem(CMS_CONTENT_KEY);
    if (cms) {
      const content = JSON.parse(cms);
      const c = content?.global?.currency || content?.global_settings?.currency;
      if (c) {
        return {
          currency: c.toLowerCase(),
          symbol: content?.global?.currencySymbol || content?.global_settings?.currencySymbol || getSymbolFor(c),
          baseCurrency: c.toLowerCase(),
        };
      }
    }
  } catch { /* ignore */ }

  return { currency: 'sgd', symbol: 'S$', baseCurrency: 'sgd' };
}

async function fetchExchangeRate(base: string, target: string): Promise<number> {
  if (base.toLowerCase() === target.toLowerCase()) return 1;
  try {
    const res = await fetch(`https://open.er-api.com/v6/latest/${base.toUpperCase()}`);
    const data = await res.json();
    if (data.rates && data.rates[target.toUpperCase()]) {
      return data.rates[target.toUpperCase()];
    }
  } catch (err) {
    console.error('Failed to fetch exchange rate:', err);
  }
  return 1; // fallback: no conversion
}

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const saved = loadFromStorage();
  const [currency, setCurrencyState] = useState(saved.currency);
  const [currencySymbol, setCurrencySymbol] = useState(saved.symbol);
  const [baseCurrency, setBaseCurrency] = useState(saved.baseCurrency);
  const [exchangeRate, setExchangeRate] = useState(1);

  // Fetch exchange rate when currency changes
  useEffect(() => {
    let cancelled = false;
    fetchExchangeRate(baseCurrency, currency).then((rate) => {
      if (!cancelled) setExchangeRate(rate);
    });
    return () => { cancelled = true; };
  }, [baseCurrency, currency]);

  // Listen for cross-tab changes
  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key === USER_CURRENCY_KEY || e.key === CMS_CONTENT_KEY) {
        const next = loadFromStorage();
        setCurrencyState(next.currency);
        setCurrencySymbol(next.symbol);
        setBaseCurrency(next.baseCurrency);
      }
    };
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, []);

  const setCurrency = useCallback((newCurrency: string, newSymbol?: string) => {
    const c = newCurrency.toLowerCase();
    const symbol = newSymbol || getSymbolFor(c);
    setCurrencyState(c);
    setCurrencySymbol(symbol);
    localStorage.setItem(USER_CURRENCY_KEY, JSON.stringify({ currency: c, symbol, baseCurrency }));
  }, [baseCurrency]);

  const convertPrice = useCallback(
    (amount: number) => {
      if (currency === baseCurrency) return amount;
      return amount * exchangeRate;
    },
    [currency, baseCurrency, exchangeRate]
  );

  const toStripeAmount = useCallback(
    (amount: number) => {
      // amount is in base currency dollars (e.g. 25.50)
      const converted = convertPrice(amount);
      if (ZERO_DECIMAL_CURRENCIES.has(currency)) {
        // Round to whole units for zero-decimal currencies
        return Math.round(converted);
      }
      // Convert to cents for 2-decimal currencies
      return Math.round(converted * 100);
    },
    [convertPrice, currency]
  );

  const formatPrice = useCallback(
    (amount: number) => {
      const converted = convertPrice(amount);
      try {
        return new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: currency.toUpperCase(),
        }).format(converted);
      } catch {
        return `${currencySymbol}${converted.toFixed(2)}`;
      }
    },
    [convertPrice, currency, currencySymbol]
  );

  const value = useMemo(
    () => ({
      currency,
      currencySymbol,
      baseCurrency,
      exchangeRate,
      formatPrice,
      convertPrice,
      toStripeAmount,
      setCurrency,
    }),
    [currency, currencySymbol, baseCurrency, exchangeRate, formatPrice, convertPrice, toStripeAmount, setCurrency]
  );

  return (
    <CurrencyContext.Provider value={value}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency(): CurrencyContextType {
  const ctx = useContext(CurrencyContext);
  if (!ctx) throw new Error('useCurrency must be used within CurrencyProvider');
  return ctx;
}
