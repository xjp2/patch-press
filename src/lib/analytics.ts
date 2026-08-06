export type Currency = string;

export interface AnalyticsProduct {
  id: string;
  name: string;
  price: number;
  quantity?: number;
  currency: Currency;
}

export interface AnalyticsContextValue {
  trackEvent: (name: string, params?: Record<string, unknown>) => void;
  trackPageView: (pageTitle?: string) => void;
  trackAddToCart: (item: AnalyticsProduct) => void;
  trackBeginCheckout: (items: AnalyticsProduct[], value: number, currency: Currency) => void;
  trackPurchase: (transactionId: string, items: AnalyticsProduct[], value: number, currency: Currency) => void;
}

export interface GtagWindow extends Window {
  dataLayer?: unknown[];
  gtag?: (...args: unknown[]) => void;
}
