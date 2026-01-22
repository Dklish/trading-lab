"use client";

import { useEffect, useState } from "react";

interface Market {
  exchange: string;
  symbol: string;
  bid: number;
  ask: number;
  ts: number;
}

export default function Home() {
  const [markets, setMarkets] = useState<Market[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMarkets = async () => {
    try {
      const res = await fetch("http://localhost:4000/markets");
      
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      
      const data = await res.json();
      
      if (Array.isArray(data)) {
        setMarkets(data);
        setError(null);
      } else {
        throw new Error("Invalid response format: expected an array");
      }
      
      setLoading(false);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to fetch market data";
      setError(errorMessage);
      setLoading(false);
      console.error("Failed to fetch markets:", err);
    }
  };

  useEffect(() => {
    fetchMarkets();
    const interval = setInterval(fetchMarkets, 2000);
    return () => clearInterval(interval);
  }, []);

  const calculateSpread = (bid: number, ask: number) => {
    return ask - bid;
  };

  const formatTimestamp = (ts: number) => {
    return new Date(ts).toLocaleTimeString();
  };

  return (
    <main style={{ minHeight: "100vh", padding: "32px", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
        <h1 style={{ fontSize: "28px", fontWeight: "bold", marginBottom: "24px", color: "#000" }}>
          Trading Lab Dashboard
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
        
        {loading && markets.length === 0 ? (
          <p>Loading market data...</p>
        ) : markets.length === 0 ? (
          <p>No market data available</p>
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
                  <th style={{ border: "1px solid #ddd", padding: "12px", textAlign: "left", fontWeight: "bold", color: "#000" }}>Symbol</th>
                  <th style={{ border: "1px solid #ddd", padding: "12px", textAlign: "right", fontWeight: "bold", color: "#000" }}>Bid</th>
                  <th style={{ border: "1px solid #ddd", padding: "12px", textAlign: "right", fontWeight: "bold", color: "#000" }}>Ask</th>
                  <th style={{ border: "1px solid #ddd", padding: "12px", textAlign: "right", fontWeight: "bold", color: "#000" }}>Spread</th>
                  <th style={{ border: "1px solid #ddd", padding: "12px", textAlign: "left", fontWeight: "bold", color: "#000" }}>Last Updated</th>
                </tr>
              </thead>
              <tbody>
                {markets.map((market, index) => (
                  <tr 
                    key={`${market.exchange}-${market.symbol}-${index}`}
                    style={{ 
                      backgroundColor: index % 2 === 0 ? "#fff" : "#f9f9f9"
                    }}
                  >
                    <td style={{ border: "1px solid #ddd", padding: "12px", color: "#000" }}>{market.exchange}</td>
                    <td style={{ border: "1px solid #ddd", padding: "12px", fontFamily: "monospace", color: "#000" }}>{market.symbol}</td>
                    <td style={{ border: "1px solid #ddd", padding: "12px", textAlign: "right", fontFamily: "monospace", color: "#000" }}>
                      {market.bid.toFixed(2)}
                    </td>
                    <td style={{ border: "1px solid #ddd", padding: "12px", textAlign: "right", fontFamily: "monospace", color: "#000" }}>
                      {market.ask.toFixed(2)}
                    </td>
                    <td style={{ border: "1px solid #ddd", padding: "12px", textAlign: "right", fontFamily: "monospace", color: "#000" }}>
                      {calculateSpread(market.bid, market.ask).toFixed(2)}
                    </td>
                    <td style={{ border: "1px solid #ddd", padding: "12px", color: "#000" }}>
                      {formatTimestamp(market.ts)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}
