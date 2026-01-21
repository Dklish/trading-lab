import express from "express";

const app = express();
const PORT = 4000;

app.use(express.json());

// GET /markets endpoint
app.get("/markets", (req, res) => {
  const markets = [
    { exchange: "binance", symbol: "BTC-USDT", bid: 43000, ask: 43010, ts: 1705640000000 },
  ];

  res.json(markets);
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
