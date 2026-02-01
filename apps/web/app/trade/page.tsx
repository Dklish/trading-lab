"use client";

import { useState, useMemo, useCallback } from "react";
import { useMarketsWS } from "../hooks/useMarketsWS";
import { usePriceHistory, ChartRange } from "../hooks/usePriceHistory";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

const INITIAL_BALANCE = 10_000;
const SYMBOLS = ["BTC-USDT", "ETH-USDT"];

interface Position {
  symbol: string;
  side: "long" | "short";
  qty: number;
  entryPrice: number;
}

interface TradeRecord {
  id: string;
  time: number;
  symbol: string;
  side: "buy" | "sell";
  qty: number;
  price: number;
  realizedPnl: number;
}

function formatTime(t: number, range: ChartRange): string {
  const d = new Date(t);
  if (range === "day") return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  if (range === "week") return d.toLocaleDateString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

export default function TradePage() {
  const { rows, status } = useMarketsWS();
  const [symbol, setSymbol] = useState<string>(SYMBOLS[0]);
  const [balance, setBalance] = useState(INITIAL_BALANCE);
  const [positions, setPositions] = useState<Position[]>([]);
  const [trades, setTrades] = useState<TradeRecord[]>([]);
  const [quantity, setQuantity] = useState("");
  const [chartRange, setChartRange] = useState<ChartRange>("day");

  const market = useMemo(() => {
    const normalized = symbol.replace("-", "/");
    return rows.find((r) => r.symbol === normalized || r.symbol === symbol);
  }, [rows, symbol]);

  const midPrice = market ? (market.bid + market.ask) / 2 : null;
  const { getChartData } = usePriceHistory(symbol, midPrice);
  const chartData = useMemo(
    () =>
      getChartData(chartRange).map((p) => ({
        ...p,
        timeLabel: formatTime(p.t, chartRange),
      })),
    [getChartData, chartRange]
  );

  const position = useMemo(
    () => positions.find((p) => p.symbol === symbol),
    [positions, symbol]
  );

  const sessionPnl = useMemo(
    () => trades.reduce((sum, t) => sum + t.realizedPnl, 0),
    [trades]
  );

  const executeBuy = useCallback(() => {
    if (!market || !quantity) return;
    const qty = parseFloat(quantity);
    if (qty <= 0 || isNaN(qty)) return;
    const price = market.ask;
    const cost = price * qty;
    if (cost > balance) return;

    setBalance((b) => b - cost);
    setPositions((prev) => {
      const idx = prev.findIndex((p) => p.symbol === symbol);
      if (idx >= 0 && prev[idx].side === "long") {
        const next = [...prev];
        const totalQty = next[idx].qty + qty;
        const avgEntry = (next[idx].entryPrice * next[idx].qty + price * qty) / totalQty;
        next[idx] = { ...next[idx], qty: totalQty, entryPrice: avgEntry };
        return next;
      }
      return [...prev, { symbol, side: "long", qty, entryPrice: price }];
    });
    setTrades((prev) => [
      ...prev,
      { id: `${Date.now()}-buy`, time: Date.now(), symbol, side: "buy", qty, price, realizedPnl: 0 },
    ]);
    setQuantity("");
  }, [market, quantity, balance, symbol]);

  const executeSell = useCallback(() => {
    if (!market || !quantity) return;
    const qty = parseFloat(quantity);
    if (qty <= 0 || isNaN(qty)) return;
    const price = market.bid;
    const current = position?.qty ?? 0;
    if (current < qty) return; // can only sell what we have

    setBalance((b) => b + price * qty);
    const closeQty = qty;
    const entry = position!.entryPrice;
    const realizedPnl = (price - entry) * closeQty;

    setPositions((prev) => {
      const idx = prev.findIndex((p) => p.symbol === symbol);
      if (idx < 0) return prev;
      const next = [...prev];
      next[idx].qty -= closeQty;
      if (next[idx].qty <= 0) next.splice(idx, 1);
      return next;
    });
    setTrades((prev) => [
      ...prev,
      { id: `${Date.now()}-sell`, time: Date.now(), symbol, side: "sell", qty, price, realizedPnl },
    ]);
    setQuantity("");
  }, [market, quantity, position, symbol]);

  return (
    <main className="min-h-screen bg-gray-50 p-6 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">Trade</h1>
        <p className="text-gray-600 text-sm">Execute fake trades and track session P&L. Prices from live market feed.</p>

        {/* Account summary */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
            <div className="text-sm text-gray-500 uppercase tracking-wide">Balance</div>
            <div className="text-2xl font-mono font-semibold text-gray-900 mt-1">
              ${balance.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
            <div className="text-sm text-gray-500 uppercase tracking-wide">Session P&L</div>
            <div
              className={`text-2xl font-mono font-semibold mt-1 ${
                sessionPnl >= 0 ? "text-green-600" : "text-red-600"
              }`}
            >
              {sessionPnl >= 0 ? "+" : ""}${sessionPnl.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
        </div>

        {/* Symbol + current price */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <div className="flex flex-wrap items-center gap-4">
            <div>
              <label className="block text-sm text-gray-500 mb-1">Symbol</label>
              <select
                value={symbol}
                onChange={(e) => setSymbol(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 font-mono text-gray-900 bg-white"
              >
                {SYMBOLS.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            {market && (
              <>
                <div>
                  <span className="text-sm text-gray-500">Bid </span>
                  <span className="font-mono font-semibold text-gray-900">{market.bid.toFixed(2)}</span>
                </div>
                <div>
                  <span className="text-sm text-gray-500">Ask </span>
                  <span className="font-mono font-semibold text-gray-900">{market.ask.toFixed(2)}</span>
                </div>
                <div>
                  <span className="text-sm text-gray-500">Mid </span>
                  <span className="font-mono font-semibold text-gray-900">{midPrice?.toFixed(2)}</span>
                </div>
              </>
            )}
            {status !== "live" && (
              <span className="text-amber-600 text-sm">Connecting to market…</span>
            )}
          </div>
        </div>

        {/* Chart + range slider */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-gray-900">{symbol} price</h2>
            <div className="flex rounded-lg border border-gray-200 overflow-hidden">
              {(["day", "week", "month"] as const).map((r) => (
                <button
                  key={r}
                  onClick={() => setChartRange(r)}
                  className={`px-4 py-2 text-sm font-medium capitalize ${
                    chartRange === r
                      ? "bg-gray-900 text-white"
                      : "bg-white text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>
          <div className="h-64 md:h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                <XAxis
                  dataKey="timeLabel"
                  tick={{ fontSize: 11 }}
                  stroke="#888"
                />
                <YAxis
                  domain={["auto", "auto"]}
                  tick={{ fontSize: 11 }}
                  stroke="#888"
                  tickFormatter={(v) => `$${v}`}
                />
                <Tooltip
                  formatter={(value: number) => [`$${value.toFixed(2)}`, "Price"]}
                  labelFormatter={(_, payload) => payload[0]?.payload?.timeLabel ?? ""}
                />
                <Line
                  type="monotone"
                  dataKey="price"
                  stroke="#2563eb"
                  strokeWidth={2}
                  dot={false}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Execute trade */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Execute trade</h2>
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label className="block text-sm text-gray-500 mb-1">Quantity</label>
              <input
                type="number"
                min="0"
                step="0.0001"
                placeholder="0"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 font-mono w-32 text-gray-900"
              />
            </div>
            <button
              onClick={executeBuy}
              disabled={!market || status !== "live"}
              className="px-4 py-2 rounded-lg bg-green-600 text-white font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Buy at {market ? market.ask.toFixed(2) : "—"}
            </button>
            <button
              onClick={executeSell}
              disabled={!market || status !== "live" || !position || position.qty <= 0}
              className="px-4 py-2 rounded-lg bg-red-600 text-white font-medium hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Sell at {market ? market.bid.toFixed(2) : "—"}
            </button>
          </div>
          {position && position.qty > 0 && (
            <p className="mt-2 text-sm text-gray-600">
              Position: {position.qty} @ avg ${position.entryPrice.toFixed(2)}
            </p>
          )}
        </div>

        {/* Positions & trade history */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Positions</h2>
            {positions.length === 0 ? (
              <p className="text-gray-500 text-sm">No open positions.</p>
            ) : (
              <ul className="space-y-2">
                {positions.map((p) => (
                  <li key={p.symbol} className="flex justify-between text-sm font-mono border-b border-gray-100 pb-2">
                    <span className="text-gray-900">{p.symbol} {p.side}</span>
                    <span>{p.qty} @ ${p.entryPrice.toFixed(2)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Session trades</h2>
            {trades.length === 0 ? (
              <p className="text-gray-500 text-sm">No trades this session.</p>
            ) : (
              <ul className="space-y-2 max-h-48 overflow-y-auto">
                {[...trades].reverse().slice(0, 20).map((t) => (
                  <li key={t.id} className="flex justify-between text-sm font-mono border-b border-gray-100 pb-2">
                    <span className={t.side === "buy" ? "text-green-600" : "text-red-600"}>
                      {t.side.toUpperCase()} {t.qty} @ ${t.price.toFixed(2)}
                    </span>
                    {t.realizedPnl !== 0 && (
                      <span className={t.realizedPnl >= 0 ? "text-green-600" : "text-red-600"}>
                        P&L ${t.realizedPnl.toFixed(2)}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
