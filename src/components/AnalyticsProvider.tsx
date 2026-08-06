import { useEffect, useMemo, type ReactNode, type ReactElement } from 'react';
import { AnalyticsContext } from '../context/AnalyticsContext';
import type { AnalyticsContextValue, AnalyticsProduct, GtagWindow, Currency } from '../lib/analytics';

const GA_ID = import.meta.env.VITE_GA_MEASUREMENT_ID as string | undefined;

function isGtagAvailable(): boolean {
  return typeof window !== 'undefined' && 'gtag' in window && typeof (window as GtagWindow).gtag === 'function';
}

function gtag(...args: unknown[]) {
  if (isGtagAvailable()) {
    (window as GtagWindow).gtag!(...args);
  }
}

function useGa4Script() {
  useEffect(() => {
    if (!GA_ID) return;

    if (document.getElementById('ga4-script')) return;

    const script = document.createElement('script');
    script.id = 'ga4-script';
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
    document.head.appendChild(script);

    const inline = document.createElement('script');
    inline.id = 'ga4-inline';
    inline.textContent = `
      window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);}
      gtag('js', new Date());
      gtag('config', '${GA_ID}', { send_page_view: false });
    `;
    document.head.appendChild(inline);
  }, []);
}

function buildAnalyticsItems(items: AnalyticsProduct[]) {
  return items.map((item) => ({
    item_id: item.id,
    item_name: item.name,
    price: item.price,
    quantity: item.quantity || 1,
    currency: item.currency,
  }));
}

function useAnalyticsValue(): AnalyticsContextValue {
  useGa4Script();

  return useMemo<AnalyticsContextValue>(() => ({
    trackEvent: (name: string, params?: Record<string, unknown>) => {
      if (!GA_ID) return;
      gtag('event', name, params);
    },
    trackPageView: (pageTitle?: string) => {
      if (!GA_ID) return;
      gtag('event', 'page_view', {
        page_title: pageTitle || document.title,
        page_location: window.location.href,
        page_path: window.location.pathname + window.location.hash,
      });
    },
    trackAddToCart: (item: AnalyticsProduct) => {
      if (!GA_ID) return;
      gtag('event', 'add_to_cart', {
        currency: item.currency,
        value: item.price * (item.quantity || 1),
        items: [{
          item_id: item.id,
          item_name: item.name,
          price: item.price,
          quantity: item.quantity || 1,
          currency: item.currency,
        }],
      });
    },
    trackBeginCheckout: (items: AnalyticsProduct[], value: number, currency: Currency) => {
      if (!GA_ID) return;
      gtag('event', 'begin_checkout', {
        currency,
        value,
        items: buildAnalyticsItems(items),
      });
    },
    trackPurchase: (transactionId: string, items: AnalyticsProduct[], value: number, currency: Currency) => {
      if (!GA_ID) return;
      gtag('event', 'purchase', {
        transaction_id: transactionId,
        currency,
        value,
        items: buildAnalyticsItems(items),
      });
    },
  }), []);
}

export function AnalyticsProvider({ children }: { children: ReactNode }): ReactElement {
  const value = useAnalyticsValue();
  return <AnalyticsContext.Provider value={value}>{children}</AnalyticsContext.Provider>;
}

export function NoopAnalyticsProvider({ children }: { children: ReactNode }): ReactElement {
  const noop: AnalyticsContextValue = {
    trackEvent: () => {},
    trackPageView: () => {},
    trackAddToCart: () => {},
    trackBeginCheckout: () => {},
    trackPurchase: () => {},
  };
  return <AnalyticsContext.Provider value={noop}>{children}</AnalyticsContext.Provider>;
}
