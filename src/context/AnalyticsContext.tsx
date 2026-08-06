import { createContext } from 'react';
import type { AnalyticsContextValue } from '../lib/analytics';

export const AnalyticsContext = createContext<AnalyticsContextValue | null>(null);
