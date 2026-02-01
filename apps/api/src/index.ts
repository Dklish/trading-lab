import express from "express";
import { WebSocketServer, WebSocket } from "ws";
import { createServer } from "http";

console.log("boot");
const app = express();
console.log("created express app");
const PORT = 4000;
const server = createServer(app);
console.log("created http server");

// Defer ccxt import until after server is listening (it's heavy and can block startup)
let coinbaseExchange: any;
let krakenExchange: any;
let exchangeConfigs: { exchange: any; name: string; timeout: number }[] = [];

async function initExchanges() {
  const ccxt = await import("ccxt");
  coinbaseExchange = new ccxt.coinbase({ enableRateLimit: true });
  krakenExchange = new ccxt.kraken({ enableRateLimit: true });
  exchangeConfigs.length = 0;
  exchangeConfigs.push(
    { exchange: coinbaseExchange, name: "coinbase", timeout: 2000 },
    { exchange: krakenExchange, name: "kraken", timeout: 6000 }
  );
}

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

// Symbols to fetch
const symbols = ["BTC/USDT", "ETH/USDT"];

// Kraken cache with TTL (10 seconds)
interface CachedMarket {
  data: Array<{
    exchange: string;
    symbol: string;
    bid: number;
    ask: number;
    ts: number;
  }>;
  timestamp: number;
}

let krakenCache: CachedMarket | null = null;
const KRAKEN_CACHE_TTL = 10000; // 10 seconds
const KRAKEN_POLL_INTERVAL = 10000; // Poll Kraken every 10 seconds

// Rate-limited logging
const logThrottle: Map<string, number> = new Map();
const LOG_THROTTLE_MS = 30000; // Only log same error once per 30 seconds

function rateLimitedLog(level: "error" | "warn", message: string, ...args: any[]) {
  const key = `${level}:${message}`;
  const now = Date.now();
  const lastLog = logThrottle.get(key);
  
  if (!lastLog || now - lastLog > LOG_THROTTLE_MS) {
    logThrottle.set(key, now);
    if (level === "error") {
      console.error(message, ...args);
    } else {
      console.warn(message, ...args);
    }
  }
}

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

// Helper to add timeout to a promise
function withTimeout<T>(promise: Promise<T>, timeoutMs: number, exchangeName: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      setTimeout(() => reject(new Error(`${exchangeName} request timeout after ${timeoutMs}ms`)), timeoutMs);
    }),
  ]);
}

// Fetch Kraken data (used for background polling)
async function fetchKrakenData(): Promise<
  Array<{ exchange: string; symbol: string; bid: number; ask: number; ts: number }>
> {
  if (!krakenExchange) return [];

  const results: Array<{
    exchange: string;
    symbol: string;
    bid: number;
    ask: number;
    ts: number;
  }> = [];

  const symbolPromises = symbols.map(async (symbol) => {
    try {
      const tickerPromise = krakenExchange.fetchTicker(symbol);
      const ticker = await withTimeout(tickerPromise, 6000, "kraken");
      const normalized = normalizeTicker("kraken", symbol, ticker);
      if (normalized) {
        results.push(normalized);
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      rateLimitedLog("error", `Failed to fetch ${symbol} from kraken:`, errorMsg);
    }
  });

  await Promise.allSettled(symbolPromises);
  return results;
}

// Background polling for Kraken (updates cache every 10 seconds)
async function pollKraken() {
  try {
    const data = await fetchKrakenData();
    krakenCache = {
      data,
      timestamp: Date.now(),
    };
  } catch (error) {
    rateLimitedLog("error", "Kraken background poll failed:", error);
  }
}

// WebSocket server setup
const wss = new WebSocketServer({ server, path: "/ws" });
console.log("attached ws");
const clients = new Set<WebSocket>();

// Store latest market data for snapshot
let latestMarkets: Array<{
  exchange: string;
  symbol: string;
  bid: number;
  ask: number;
  ts: number;
}> = [];

// Broadcast function to send data to all connected clients
function broadcast(data: { type: string; data: any }) {
  const message = JSON.stringify(data);
  const deadClients: WebSocket[] = [];
  
  clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      try {
        client.send(message);
      } catch (error) {
        rateLimitedLog("error", "Failed to send WebSocket message:", error);
        deadClients.push(client);
      }
    } else {
      deadClients.push(client);
    }
  });
  
  // Clean up dead clients
  deadClients.forEach((client) => {
    clients.delete(client);
  });
}

// Fetch all markets (reusable function)
async function fetchAllMarkets(): Promise<{
  markets: Array<{
    exchange: string;
    symbol: string;
    bid: number;
    ask: number;
    ts: number;
  }>;
  errors: Array<{
    exchange: string;
    error: string;
  }>;
}> {
  const markets: Array<{
    exchange: string;
    symbol: string;
    bid: number;
    ask: number;
    ts: number;
  }> = [];
  const errors: Array<{
    exchange: string;
    error: string;
  }> = [];

  // Use cached Kraken data if available and fresh
  const now = Date.now();
  if (krakenCache && (now - krakenCache.timestamp) < KRAKEN_CACHE_TTL) {
    markets.push(...krakenCache.data);
  }

  // Fetch from fast exchanges (Coinbase) in parallel
  const fastExchangePromises = exchangeConfigs
    .filter(config => config.name !== "kraken") // Skip Kraken - use cache instead
    .map(async (config) => {
      const { exchange, name, timeout } = config;
      const results: Array<{
        exchange: string;
        symbol: string;
        bid: number;
        ask: number;
        ts: number;
      }> = [];

      // Fetch all symbols for this exchange with timeout
      const symbolPromises = symbols.map(async (symbol) => {
        try {
          const tickerPromise = exchange.fetchTicker(symbol);
          const ticker = await withTimeout(tickerPromise, timeout, name);
          const normalized = normalizeTicker(name, symbol, ticker);
          if (normalized) {
            results.push(normalized);
          }
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : String(error);
          rateLimitedLog("error", `Failed to fetch ${symbol} from ${name}:`, errorMsg);
        }
      });

      await Promise.allSettled(symbolPromises);
      return { exchangeName: name, results };
    });

  // Wait for fast exchanges with overall timeout (max 2 seconds total)
  const overallTimeout = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error("Overall request timeout")), 2000);
  });

  try {
    const allResults = await Promise.race([
      Promise.allSettled(fastExchangePromises),
      overallTimeout,
    ]);

    // Collect successful results and errors
    if (Array.isArray(allResults)) {
      allResults.forEach((result) => {
        if (result.status === "fulfilled") {
          markets.push(...result.value.results);
        } else {
          const errorMsg = result.reason instanceof Error ? result.reason.message : String(result.reason);
          errors.push({
            exchange: "unknown",
            error: errorMsg,
          });
          rateLimitedLog("error", "Exchange fetch failed:", result.reason);
        }
      });
    }
  } catch (error) {
    // Overall timeout or other error
    const errorMsg = error instanceof Error ? error.message : String(error);
    errors.push({
      exchange: "system",
      error: errorMsg,
    });
    rateLimitedLog("error", "Overall fetch error:", error);
  }

  // If Kraken cache is stale or missing, add error (but don't block response)
  if (!krakenCache || (now - krakenCache.timestamp) >= KRAKEN_CACHE_TTL) {
    errors.push({
      exchange: "kraken",
      error: "Kraken data temporarily unavailable (using cached data or polling)",
    });
  }

  return { markets, errors };
}

// WebSocket connection handling
wss.on("connection", (ws: WebSocket) => {
  clients.add(ws);
  console.log(`WebSocket client connected. Total clients: ${clients.size}`);

  // Send initial snapshot if available
  if (latestMarkets.length > 0) {
    try {
      ws.send(JSON.stringify({ type: "snapshot", data: latestMarkets }));
    } catch (error) {
      rateLimitedLog("error", "Failed to send initial snapshot:", error);
    }
  }

  // Handle client disconnect
  ws.on("close", () => {
    clients.delete(ws);
    console.log(`WebSocket client disconnected. Total clients: ${clients.size}`);
  });

  // Handle errors
  ws.on("error", (error) => {
    rateLimitedLog("error", "WebSocket error:", error);
    clients.delete(ws);
  });

  // Handle pong response for heartbeat
  ws.on("pong", () => {
    // Client is alive, no action needed
  });
});

// Heartbeat: ping clients every 30 seconds and terminate dead connections
setInterval(() => {
  const deadClients: WebSocket[] = [];
  
  clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      try {
        client.ping();
      } catch (error) {
        rateLimitedLog("error", "Failed to ping client:", error);
        deadClients.push(client);
      }
    } else {
      deadClients.push(client);
    }
  });
  
  // Clean up dead clients
  deadClients.forEach((client) => {
    clients.delete(client);
  });
}, 30000);

// Poll markets and broadcast updates every 2 seconds
async function pollAndBroadcastMarkets() {
  try {
    const { markets, errors } = await fetchAllMarkets();
    
    // Update latest markets for snapshot
    latestMarkets = markets;
    
    // Broadcast tick to all connected clients
    if (markets.length > 0) {
      broadcast({ type: "tick", data: markets });
    }
  } catch (error) {
    rateLimitedLog("error", "Failed to poll and broadcast markets:", error);
  }
}

// GET /markets endpoint (kept as fallback)
app.get("/markets", async (req, res) => {
  const { markets, errors } = await fetchAllMarkets();
  
  // Always return within 1-2 seconds with partial results
  res.json({
    markets,
    errors: errors.length > 0 ? errors : undefined,
  });
});

server.listen(PORT, () => {
  console.log("listening");
  console.log(`Server is running on http://localhost:${PORT}`);
  console.log(`WebSocket server available at ws://localhost:${PORT}/ws`);
  // Load ccxt and start polling only after server is listening (do not block startup)
  initExchanges()
    .then(() => {
      setInterval(pollKraken, KRAKEN_POLL_INTERVAL);
      pollKraken();
      setInterval(pollAndBroadcastMarkets, 2000);
      pollAndBroadcastMarkets();
    })
    .catch((err) => console.error("Failed to init exchanges:", err));
});
