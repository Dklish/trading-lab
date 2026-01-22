import express from "express";
import ccxt from "ccxt";

const app = express();
const PORT = 4000;

// Enable CORS for all routes
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});

app.use(express.json());

// Initialize exchanges (public, no API keys needed)
const exchanges = [
  new ccxt.binance({ enableRateLimit: true }),
  new ccxt.coinbase({ enableRateLimit: true }),
  new ccxt.kraken({ enableRateLimit: true }),
];

// Symbols to fetch
const symbols = ["BTC/USDT", "ETH/USDT"];

// Normalize ticker data
function normalizeTicker(exchange: string, symbol: string, ticker: any): {
  exchange: string;
  symbol: string;
  bid: number;
  ask: number;
  ts: number;
} | null {
  if (!ticker.bid || !ticker.ask) {
    return null;
  }

  return {
    exchange,
    symbol: symbol.replace("/", "-"),
    bid: ticker.bid,
    ask: ticker.ask,
    ts: ticker.timestamp || Date.now(),
  };
}

// GET /markets endpoint
app.get("/markets", async (req, res) => {
  const markets: Array<{
    exchange: string;
    symbol: string;
    bid: number;
    ask: number;
    ts: number;
  }> = [];

  // Fetch from all exchanges in parallel
  const promises = exchanges.map(async (exchange) => {
    const exchangeName = exchange.id;
    const results: Array<{
      exchange: string;
      symbol: string;
      bid: number;
      ask: number;
      ts: number;
    }> = [];

    for (const symbol of symbols) {
      try {
        const ticker = await exchange.fetchTicker(symbol);
        const normalized = normalizeTicker(exchangeName, symbol, ticker);
        if (normalized) {
          results.push(normalized);
        }
      } catch (error) {
        // Skip symbols that don't exist on this exchange
        console.error(`Failed to fetch ${symbol} from ${exchangeName}:`, error instanceof Error ? error.message : error);
      }
    }

    return results;
  });

  // Wait for all exchanges, even if some fail
  const allResults = await Promise.allSettled(promises);

  // Collect successful results
  allResults.forEach((result) => {
    if (result.status === "fulfilled") {
      markets.push(...result.value);
    } else {
      console.error("Exchange fetch failed:", result.reason);
    }
  });

  res.json(markets);
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
