"use client";

import { useRef, useState, useCallback, useEffect } from "react";

const MAX_POINTS = 5000;
const DAY_MS = 24 * 60 * 60 * 1000;

export interface PricePoint {
  t: number;
  price: number;
}

export type ChartRange = "day" | "week" | "month";

export function usePriceHistory(symbol: string | null, midPrice: number | null) {
  const [priceHistory, setPriceHistory] = useState<PricePoint[]>([]);
  const initialPriceRef = useRef<number | null>(null);

  // When symbol changes, reset history for the new symbol
  useEffect(() => {
    if (!symbol) {
      setPriceHistory([]);
      initialPriceRef.current = null;
      return;
    }
    setPriceHistory([]);
    initialPriceRef.current = null;
  }, [symbol]);

  // Append new price on tick
  useEffect(() => {
    if (symbol == null || midPrice == null) return;
    const t = Date.now();
    setPriceHistory((prev) => {
      const next = [...prev, { t, price: midPrice }];
      if (next.length > MAX_POINTS) return next.slice(-MAX_POINTS);
      return next;
    });
  }, [symbol, midPrice]);

  const getChartData = useCallback(
    (range: ChartRange): PricePoint[] => {
      const now = Date.now();
      const windowMs =
        range === "day" ? DAY_MS : range === "week" ? 7 * DAY_MS : 30 * DAY_MS;
      const from = now - windowMs;
      const filtered = priceHistory.filter((p) => p.t >= from);
      if (filtered.length >= 2) return filtered;
      // Pad with synthetic start so chart has a line
      if (priceHistory.length > 0) {
        const first = priceHistory[0];
        const start: PricePoint = { t: Math.max(from, first.t - windowMs), price: first.price };
        return [start, ...priceHistory.filter((p) => p.t >= from)];
      }
      if (midPrice != null) {
        return [
          { t: from, price: midPrice },
          { t: now, price: midPrice },
        ];
      }
      return [];
    },
    [priceHistory, midPrice]
  );

  return { priceHistory, getChartData };
}
