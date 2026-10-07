"use client";

import { useCallback } from "react";
import { useReportWebVitals } from "next/web-vitals";

export function WebVitals() {
  useReportWebVitals(
    useCallback((metric: { name: string; value: number; rating: string }) => {
      const analytics = (
        window as Window & {
          umami?: {
            track: (
              event: string,
              data: Record<string, string | number>,
            ) => void;
          };
        }
      ).umami;
      // Use the existing analytics integration; no new endpoint or identifiers.
      analytics?.track("web-vital", {
        metric: metric.name,
        value: Math.round(metric.value * 1000) / 1000,
        rating: metric.rating,
        page: window.location.pathname,
      });
    }, []),
  );
  return null;
}
