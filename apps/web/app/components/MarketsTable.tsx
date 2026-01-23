"use client";

import { useState, useMemo } from "react";
import { MarketRow } from "../hooks/useMarketsPoll";

type SortColumn = "exchange" | "symbol" | "bid" | "ask" | "spread" | "spreadPercent" | "age";
type SortDirection = "asc" | "desc";

interface MarketsTableProps {
  rows: MarketRow[];
  onRowClick?: (row: MarketRow) => void;
}

export default function MarketsTable({ rows, onRowClick }: MarketsTableProps) {
  const [sortColumn, setSortColumn] = useState<SortColumn>("exchange");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  const sortedRows = useMemo(() => {
    const sorted = [...rows].sort((a, b) => {
      let aVal: number | string;
      let bVal: number | string;

      switch (sortColumn) {
        case "exchange":
          aVal = a.exchange;
          bVal = b.exchange;
          break;
        case "symbol":
          aVal = a.symbol;
          bVal = b.symbol;
          break;
        case "bid":
          aVal = a.bid;
          bVal = b.bid;
          break;
        case "ask":
          aVal = a.ask;
          bVal = b.ask;
          break;
        case "spread":
          aVal = a.ask - a.bid;
          bVal = b.ask - b.bid;
          break;
        case "spreadPercent":
          aVal = ((a.ask - a.bid) / a.bid) * 100;
          bVal = ((b.ask - b.bid) / b.bid) * 100;
          break;
        case "age":
          aVal = Date.now() - a.ts;
          bVal = Date.now() - b.ts;
          break;
        default:
          return 0;
      }

      if (typeof aVal === "string" && typeof bVal === "string") {
        return sortDirection === "asc" 
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      }

      return sortDirection === "asc" 
        ? (aVal as number) - (bVal as number)
        : (bVal as number) - (aVal as number);
    });

    return sorted;
  }, [rows, sortColumn, sortDirection]);

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  };

  const getStatusBadge = (ts: number) => {
    const age = Date.now() - ts;
    const ageSeconds = Math.floor(age / 1000);
    
    if (ageSeconds < 5) {
      return { text: "Live", color: "bg-green-100 text-green-800" };
    } else if (ageSeconds < 10) {
      return { text: "Recent", color: "bg-yellow-100 text-yellow-800" };
    } else {
      return { text: "Stale", color: "bg-red-100 text-red-800" };
    }
  };

  const SortIcon = ({ column }: { column: SortColumn }) => {
    if (sortColumn !== column) return null;
    return sortDirection === "asc" ? " ↑" : " ↓";
  };

  if (rows.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        No market data available
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full border-collapse border border-gray-300">
        <thead>
          <tr className="bg-gray-50">
            <th 
              className="border border-gray-300 px-4 py-3 text-left text-sm font-semibold text-gray-900 cursor-pointer hover:bg-gray-100"
              onClick={() => handleSort("exchange")}
            >
              Exchange <SortIcon column="exchange" />
            </th>
            <th 
              className="border border-gray-300 px-4 py-3 text-left text-sm font-semibold text-gray-900 cursor-pointer hover:bg-gray-100"
              onClick={() => handleSort("symbol")}
            >
              Symbol <SortIcon column="symbol" />
            </th>
            <th 
              className="border border-gray-300 px-4 py-3 text-right text-sm font-semibold text-gray-900 cursor-pointer hover:bg-gray-100"
              onClick={() => handleSort("bid")}
            >
              Bid <SortIcon column="bid" />
            </th>
            <th 
              className="border border-gray-300 px-4 py-3 text-right text-sm font-semibold text-gray-900 cursor-pointer hover:bg-gray-100"
              onClick={() => handleSort("ask")}
            >
              Ask <SortIcon column="ask" />
            </th>
            <th 
              className="border border-gray-300 px-4 py-3 text-right text-sm font-semibold text-gray-900 cursor-pointer hover:bg-gray-100"
              onClick={() => handleSort("spread")}
            >
              Spread ($) <SortIcon column="spread" />
            </th>
            <th 
              className="border border-gray-300 px-4 py-3 text-right text-sm font-semibold text-gray-900 cursor-pointer hover:bg-gray-100"
              onClick={() => handleSort("spreadPercent")}
            >
              Spread (%) <SortIcon column="spreadPercent" />
            </th>
            <th 
              className="border border-gray-300 px-4 py-3 text-right text-sm font-semibold text-gray-900 cursor-pointer hover:bg-gray-100"
              onClick={() => handleSort("age")}
            >
              Age (s) <SortIcon column="age" />
            </th>
            <th className="border border-gray-300 px-4 py-3 text-center text-sm font-semibold text-gray-900">
              Status
            </th>
          </tr>
        </thead>
        <tbody>
          {sortedRows.map((row, index) => {
            const spread = row.ask - row.bid;
            const spreadPercent = (spread / row.bid) * 100;
            const ageSeconds = Math.floor((Date.now() - row.ts) / 1000);
            const status = getStatusBadge(row.ts);

            return (
              <tr
                key={`${row.exchange}-${row.symbol}-${index}`}
                onClick={() => onRowClick?.(row)}
                className={`${index % 2 === 0 ? "bg-white" : "bg-gray-50"} ${onRowClick ? "cursor-pointer hover:bg-blue-50" : ""} transition-colors`}
              >
                <td className="border border-gray-300 px-4 py-3 text-sm text-gray-900">
                  {row.exchange}
                </td>
                <td className="border border-gray-300 px-4 py-3 text-sm font-mono font-semibold text-gray-900">
                  {row.symbol}
                </td>
                <td className="border border-gray-300 px-4 py-3 text-sm font-mono text-right text-gray-900">
                  {row.bid.toFixed(2)}
                </td>
                <td className="border border-gray-300 px-4 py-3 text-sm font-mono text-right text-gray-900">
                  {row.ask.toFixed(2)}
                </td>
                <td className="border border-gray-300 px-4 py-3 text-sm font-mono text-right text-gray-900">
                  {spread.toFixed(2)}
                </td>
                <td className="border border-gray-300 px-4 py-3 text-sm font-mono text-right text-gray-900">
                  {spreadPercent.toFixed(4)}%
                </td>
                <td className="border border-gray-300 px-4 py-3 text-sm text-right text-gray-900">
                  {ageSeconds}s
                </td>
                <td className="border border-gray-300 px-4 py-3 text-center">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${status.color}`}>
                    {status.text}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
