"use client";

import { useState, useEffect } from "react";
import { MarketRow } from "../hooks/useMarketsPoll";

interface MarketFiltersProps {
  rows: MarketRow[];
  onFilterChange: (filtered: MarketRow[]) => void;
}

export default function MarketFilters({ rows, onFilterChange }: MarketFiltersProps) {
  const [selectedSymbol, setSelectedSymbol] = useState<string>("all");
  const [selectedExchanges, setSelectedExchanges] = useState<Set<string>>(new Set());
  const [hideStale, setHideStale] = useState(false);

  const symbols = Array.from(new Set(rows.map(r => r.symbol))).sort();
  const exchanges = Array.from(new Set(rows.map(r => r.exchange))).sort();
  const STALE_THRESHOLD_MS = 10000;

  useEffect(() => {
    let filtered = [...rows];

    // Filter by symbol
    if (selectedSymbol !== "all") {
      filtered = filtered.filter(r => r.symbol === selectedSymbol);
    }

    // Filter by exchanges
    if (selectedExchanges.size > 0) {
      filtered = filtered.filter(r => selectedExchanges.has(r.exchange));
    }

    // Filter stale
    if (hideStale) {
      filtered = filtered.filter(r => (Date.now() - r.ts) < STALE_THRESHOLD_MS);
    }

    onFilterChange(filtered);
  }, [rows, selectedSymbol, selectedExchanges, hideStale, onFilterChange]);

  const toggleExchange = (exchange: string) => {
    const newSet = new Set(selectedExchanges);
    if (newSet.has(exchange)) {
      newSet.delete(exchange);
    } else {
      newSet.add(exchange);
    }
    setSelectedExchanges(newSet);
  };

  return (
    <div className="flex flex-wrap items-center gap-4 mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
      <div className="flex items-center gap-2">
        <label className="text-sm font-medium text-gray-700">Symbol:</label>
        <select
          value={selectedSymbol}
          onChange={(e) => setSelectedSymbol(e.target.value)}
          className="px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">All</option>
          {symbols.map(symbol => (
            <option key={symbol} value={symbol}>{symbol}</option>
          ))}
        </select>
      </div>

      <div className="flex items-center gap-2">
        <label className="text-sm font-medium text-gray-700">Exchanges:</label>
        <div className="flex flex-wrap gap-2">
          {exchanges.map(exchange => (
            <label key={exchange} className="flex items-center gap-1 cursor-pointer">
              <input
                type="checkbox"
                checked={selectedExchanges.has(exchange)}
                onChange={() => toggleExchange(exchange)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">{exchange}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={hideStale}
            onChange={(e) => setHideStale(e.target.checked)}
            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <span className="text-sm font-medium text-gray-700">Hide Stale</span>
        </label>
      </div>
    </div>
  );
}
