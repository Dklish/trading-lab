"use client";

import { useState, useMemo, useEffect } from "react";
import { useMarketsPoll, MarketRow } from "./hooks/useMarketsPoll";
import DashboardHeader from "./components/DashboardHeader";
import SummaryCards from "./components/SummaryCards";
import MarketsTable from "./components/MarketsTable";
import { useRouter } from "next/navigation";

export default function Home() {
  const { rows, errors, status, lastUpdated } = useMarketsPoll(2000);
  const [filteredRows, setFilteredRows] = useState<MarketRow[]>(rows);
  const router = useRouter();

  // Update filtered rows when rows change
  useEffect(() => {
    setFilteredRows(rows);
  }, [rows]);

  // Find top movers (best spreads)
  const topMovers = useMemo(() => {
    const spreads = rows.map(row => ({
      row,
      spread: row.ask - row.bid,
      spreadPercent: ((row.ask - row.bid) / row.bid) * 100,
    })).sort((a, b) => a.spreadPercent - b.spreadPercent).slice(0, 5);
    
    return spreads;
  }, [rows]);

  // Find best execution opportunities (lowest spread)
  const bestExecution = useMemo(() => {
    const bySymbol = new Map<string, MarketRow & { spread: number; spreadPercent: number }>();
    
    rows.forEach(row => {
      const spread = row.ask - row.bid;
      const spreadPercent = (spread / row.bid) * 100;
      const existing = bySymbol.get(row.symbol);
      
      if (!existing || spreadPercent < existing.spreadPercent) {
        bySymbol.set(row.symbol, { ...row, spread, spreadPercent });
      }
    });
    
    return Array.from(bySymbol.values()).sort((a, b) => a.spreadPercent - b.spreadPercent);
  }, [rows]);

  const handleRowClick = (row: MarketRow) => {
    router.push(`/markets/${row.symbol}`);
  };

  return (
    <main className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <DashboardHeader status={status} lastUpdated={lastUpdated} errors={errors} />
        
        {status === "loading" && rows.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-600">Loading market data...</p>
          </div>
        ) : status === "error" && rows.length === 0 ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <p className="text-red-800">
              <strong>Error:</strong> {errors.join(", ")}
            </p>
          </div>
        ) : (
          <>
            <SummaryCards rows={rows} />
            
            <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6 shadow-sm">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Best Execution Opportunities</h2>
              {bestExecution.length > 0 ? (
                <div className="space-y-2">
                  {bestExecution.map((item, idx) => (
                    <div key={`${item.exchange}-${item.symbol}-${idx}`} className="flex items-center justify-between p-3 bg-gray-50 rounded border border-gray-200">
                      <div>
                        <span className="font-mono font-semibold text-gray-900">{item.symbol}</span>
                        <span className="text-sm text-gray-600 ml-2">on {item.exchange}</span>
                      </div>
                      <div className="text-right">
                        <div className="font-mono text-sm text-gray-900">
                          Spread: ${item.spread.toFixed(2)} ({item.spreadPercent.toFixed(4)}%)
                        </div>
                        <div className="text-xs text-gray-500">
                          Bid: ${item.bid.toFixed(2)} | Ask: ${item.ask.toFixed(2)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500">No execution opportunities available</p>
              )}
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
              <h2 className="text-xl font-bold text-gray-900 mb-4">All Markets</h2>
              <MarketsTable rows={filteredRows} onRowClick={handleRowClick} />
            </div>
          </>
        )}
      </div>
    </main>
  );
}
