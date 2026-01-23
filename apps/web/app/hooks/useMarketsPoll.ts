"use client";

import { useEffect, useState } from "react";

export interface MarketRow {
  exchange: string;
  symbol: string;
  bid: number;
  ask: number;
  ts: number;
}

export type MarketStatus = "loading" | "live" | "stale" | "error";

export interface UseMarketsPollResult {
  rows: MarketRow[];
  errors: string[];
  status: MarketStatus;
  lastUpdated: number | null;
}

const STALE_THRESHOLD_MS = 10000; // 10 seconds

export function useMarketsPoll(intervalMs: number = 2000): UseMarketsPollResult {
  const [rows, setRows] = useState<MarketRow[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [status, setStatus] = useState<MarketStatus>("loading");
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);

  useEffect(() => {
    const fetchMarkets = async () => {
      try {
        const res = await fetch("/api/markets", {
          cache: "no-store",
        });

        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}));
          const errorMessage = errorData.error || `HTTP error! status: ${res.status}`;
          setErrors([errorMessage]);
          setStatus("error");
          return;
        }

        const data = await res.json();

        // Handle both array format and object with markets array
        const markets = Array.isArray(data) ? data : (data.markets || []);
        const apiErrors = data.errors || [];

        if (Array.isArray(markets)) {
          setRows(markets);
          setErrors(apiErrors);
          setLastUpdated(Date.now());
          
          // Determine status
          const now = Date.now();
          const oldestTimestamp = markets.length > 0 
            ? Math.min(...markets.map(m => m.ts))
            : now;
          const age = now - oldestTimestamp;
          
          if (apiErrors.length > 0 && markets.length === 0) {
            setStatus("error");
          } else if (age > STALE_THRESHOLD_MS) {
            setStatus("stale");
          } else {
            setStatus("live");
          }
        } else {
          throw new Error("Invalid response format: expected an array");
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Failed to fetch market data";
        setErrors([errorMessage]);
        setStatus("error");
        console.error("Failed to fetch markets:", err);
      }
    };

    // Initial fetch
    fetchMarkets();

    // Poll every intervalMs
    const interval = setInterval(fetchMarkets, intervalMs);

    return () => clearInterval(interval);
  }, [intervalMs]);

  return { rows, errors, status, lastUpdated };
}
