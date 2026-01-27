"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useMarketsWS, MarketRow } from "../../hooks/useMarketsWS";

interface ExchangeData {
  exchange: string;
  bid: number;
  ask: number;
  spread: number;
  midPrice: number;
  previousBid?: number;
  previousAsk?: number;
  previousMidPrice?: number;
}

export default function CoinDetailPage() {
  const params = useParams();
  const symbol = params.symbol as string;
  const { rows, status, errors } = useMarketsWS();
  const [previousMarkets, setPreviousMarkets] = useState<MarketRow[]>([]);

  // Filter to only the selected symbol
  const markets = useMemo(() => {
    return rows.filter((m) => m.symbol === symbol);
  }, [rows, symbol]);

  // Track previous markets for price comparison
  useEffect(() => {
    if (markets.length > 0) {
      setPreviousMarkets((prev) => {
        if (prev.length === 0) return markets;
        return prev;
      });
    }
  }, [markets]);

  const error = errors.length > 0 ? errors.join(", ") : null;
  const loading = status === "connecting" && markets.length === 0;

  // Group by exchange and track previous values
  const exchangeData = useMemo(() => {
    const exchangeMap = new Map<string, ExchangeData>();
    
    markets.forEach((market) => {
      exchangeMap.set(market.exchange, {
        exchange: market.exchange,
        bid: market.bid,
        ask: market.ask,
        spread: market.ask - market.bid,
        midPrice: (market.bid + market.ask) / 2,
      });
    });
    
    // Add previous values for comparison
    const previousExchangeMap = new Map<string, { bid: number; ask: number; midPrice: number }>();
    previousMarkets
      .filter((m) => m.symbol === symbol)
      .forEach((market) => {
        previousExchangeMap.set(market.exchange, {
          bid: market.bid,
          ask: market.ask,
          midPrice: (market.bid + market.ask) / 2,
        });
      });
    
    // Add previous values to exchange data
    exchangeMap.forEach((exchange, exchangeName) => {
      const previous = previousExchangeMap.get(exchangeName);
      if (previous) {
        exchange.previousBid = previous.bid;
        exchange.previousAsk = previous.ask;
        exchange.previousMidPrice = previous.midPrice;
      }
    });
    
    return Array.from(exchangeMap.values()).sort((a, b) => a.exchange.localeCompare(b.exchange));
  }, [markets, previousMarkets, symbol]);

  const getPriceColor = (current: number, previous?: number): string => {
    if (previous === undefined) return "#000";
    if (current > previous) return "#16a34a"; // green
    if (current < previous) return "#dc2626"; // red
    return "#000";
  };

  return (
    <main style={{ padding: "32px", maxWidth: "1200px", margin: "0 auto" }}>
      <div style={{ marginBottom: "24px" }}>
        <Link 
          href="/markets"
          style={{
            color: "#0066cc",
            textDecoration: "none",
            fontSize: "14px",
            marginBottom: "16px",
            display: "inline-block"
          }}
        >
          ← Back to Markets
        </Link>
      </div>
      
      <h1 style={{ fontSize: "32px", fontWeight: "bold", marginBottom: "24px", color: "#000" }}>
        {symbol}
      </h1>
      
      {error ? (
        <div style={{ 
          padding: "16px", 
          backgroundColor: "#fee", 
          border: "1px solid #fcc", 
          borderRadius: "4px",
          color: "#c00",
          marginBottom: "16px"
        }}>
          <strong>Error:</strong> {error}
        </div>
      ) : null}
      
      {status === "connecting" && markets.length === 0 && !error ? (
        <p>Connecting to market data stream...</p>
      ) : status === "disconnected" && markets.length === 0 ? (
        <p>Disconnected. Reconnecting...</p>
      ) : error ? (
        <div style={{ 
          padding: "16px", 
          backgroundColor: "#fee", 
          border: "1px solid #fcc", 
          borderRadius: "4px",
          color: "#c00",
          marginBottom: "16px"
        }}>
          <strong>Error:</strong> {error}
        </div>
      ) : exchangeData.length === 0 ? (
        <p>No market data available for {symbol}</p>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ 
            width: "100%", 
            borderCollapse: "collapse", 
            border: "1px solid #ddd" 
          }}>
            <thead>
              <tr style={{ backgroundColor: "#f5f5f5" }}>
                <th style={{ border: "1px solid #ddd", padding: "12px", textAlign: "left", fontWeight: "bold", color: "#000" }}>Exchange</th>
                <th style={{ border: "1px solid #ddd", padding: "12px", textAlign: "right", fontWeight: "bold", color: "#000" }}>Bid</th>
                <th style={{ border: "1px solid #ddd", padding: "12px", textAlign: "right", fontWeight: "bold", color: "#000" }}>Ask</th>
                <th style={{ border: "1px solid #ddd", padding: "12px", textAlign: "right", fontWeight: "bold", color: "#000" }}>Mid Price</th>
                <th style={{ border: "1px solid #ddd", padding: "12px", textAlign: "right", fontWeight: "bold", color: "#000" }}>Spread</th>
              </tr>
            </thead>
            <tbody>
              {exchangeData.map((exchange, index) => {
                const bidColor = getPriceColor(exchange.bid, exchange.previousBid);
                const askColor = getPriceColor(exchange.ask, exchange.previousAsk);
                const midColor = getPriceColor(exchange.midPrice, exchange.previousMidPrice);
                
                return (
                  <tr 
                    key={exchange.exchange}
                    style={{ 
                      backgroundColor: index % 2 === 0 ? "#fff" : "#f9f9f9"
                    }}
                  >
                    <td style={{ border: "1px solid #ddd", padding: "12px", color: "#000", fontWeight: "bold" }}>
                      {exchange.exchange}
                    </td>
                    <td style={{ 
                      border: "1px solid #ddd", 
                      padding: "12px", 
                      textAlign: "right", 
                      fontFamily: "monospace", 
                      color: bidColor,
                      fontWeight: "bold",
                      transition: "color 0.3s ease"
                    }}>
                      {exchange.bid.toFixed(2)}
                    </td>
                    <td style={{ 
                      border: "1px solid #ddd", 
                      padding: "12px", 
                      textAlign: "right", 
                      fontFamily: "monospace", 
                      color: askColor,
                      fontWeight: "bold",
                      transition: "color 0.3s ease"
                    }}>
                      {exchange.ask.toFixed(2)}
                    </td>
                    <td style={{ 
                      border: "1px solid #ddd", 
                      padding: "12px", 
                      textAlign: "right", 
                      fontFamily: "monospace", 
                      color: midColor,
                      fontWeight: "bold",
                      transition: "color 0.3s ease"
                    }}>
                      {exchange.midPrice.toFixed(2)}
                    </td>
                    <td style={{ border: "1px solid #ddd", padding: "12px", textAlign: "right", fontFamily: "monospace", color: "#000" }}>
                      {exchange.spread.toFixed(2)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
