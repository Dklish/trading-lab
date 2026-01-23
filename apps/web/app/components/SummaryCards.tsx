"use client";

import { useMemo } from "react";
import { MarketRow } from "../hooks/useMarketsPoll";

interface SummaryCardsProps {
  rows: MarketRow[];
}

export default function SummaryCards({ rows }: SummaryCardsProps) {
  const coinData = useMemo(() => {
    const coinMap = new Map<string, {
      symbol: string;
      bestBid: number;
      bestAsk: number;
      bestBidExchange: string;
      bestAskExchange: string;
    }>();

    rows.forEach((row) => {
      const existing = coinMap.get(row.symbol);
      
      if (!existing) {
        coinMap.set(row.symbol, {
          symbol: row.symbol,
          bestBid: row.bid,
          bestAsk: row.ask,
          bestBidExchange: row.exchange,
          bestAskExchange: row.exchange,
        });
      } else {
        if (row.bid > existing.bestBid) {
          existing.bestBid = row.bid;
          existing.bestBidExchange = row.exchange;
        }
        if (row.ask < existing.bestAsk) {
          existing.bestAsk = row.ask;
          existing.bestAskExchange = row.exchange;
        }
      }
    });

    return Array.from(coinMap.values()).sort((a, b) => a.symbol.localeCompare(b.symbol));
  }, [rows]);

  const getCard = (coin: { symbol: string; bestBid: number; bestAsk: number; bestBidExchange: string; bestAskExchange: string }) => {
    const spread = coin.bestAsk - coin.bestBid;
    const spreadPercent = (spread / coin.bestBid) * 100;
    const midPrice = (coin.bestBid + coin.bestAsk) / 2;

    return (
      <div key={coin.symbol} className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-900">{coin.symbol}</h3>
          <span className="text-sm text-gray-500">Mid: ${midPrice.toFixed(2)}</span>
        </div>
        
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Best Bid</span>
            <div className="text-right">
              <div className="font-mono font-semibold text-gray-900">${coin.bestBid.toFixed(2)}</div>
              <div className="text-xs text-gray-500">{coin.bestBidExchange}</div>
            </div>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Best Ask</span>
            <div className="text-right">
              <div className="font-mono font-semibold text-gray-900">${coin.bestAsk.toFixed(2)}</div>
              <div className="text-xs text-gray-500">{coin.bestAskExchange}</div>
            </div>
          </div>
          
          <div className="pt-3 border-t border-gray-200">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-gray-700">Spread</span>
              <div className="text-right">
                <div className="font-mono font-semibold text-gray-900">${spread.toFixed(2)}</div>
                <div className="text-xs text-gray-500">{spreadPercent.toFixed(4)}%</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (coinData.length === 0) {
    return null;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
      {coinData.map(getCard)}
    </div>
  );
}
