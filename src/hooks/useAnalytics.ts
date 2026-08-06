import { useContext } from 'react';
import { AnalyticsContext } from '../context/AnalyticsContext';
import type { AnalyticsContextValue } from '../lib/analytics';

export function useAnalytics(): AnalyticsContextValue {
  const context = useContext(AnalyticsContext);
  if (!context) {
    throw new Error('useAnalytics must be used within AnalyticsProvider');
  }
  return context;
}
