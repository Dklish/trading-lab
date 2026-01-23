"use client";

import { useState, useEffect } from "react";
import { useMarketsPoll, MarketRow } from "../hooks/useMarketsPoll";
import DashboardHeader from "../components/DashboardHeader";
import MarketFilters from "../components/MarketFilters";
import MarketsTable from "../components/MarketsTable";
import { useRouter } from "next/navigation";

export default function MarketsPage() {
  const { rows, errors, status, lastUpdated } = useMarketsPoll(2000);
  const [filteredRows, setFilteredRows] = useState<MarketRow[]>(rows);
  const router = useRouter();

  // Update filtered rows when rows change
  useEffect(() => {
    setFilteredRows(rows);
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
          <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Markets</h2>
            
            <MarketFilters rows={rows} onFilterChange={setFilteredRows} />
            
            <MarketsTable rows={filteredRows} onRowClick={handleRowClick} />
          </div>
        )}
      </div>
    </main>
  );
}
