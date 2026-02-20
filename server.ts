import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import dotenv from "dotenv";

dotenv.config();

const db = new Database("monetizer.db");

// Initialize DB
db.exec(`
  CREATE TABLE IF NOT EXISTS user_settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    wallet_address TEXT UNIQUE,
    binance_usdt_address TEXT
  )
`);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes
  app.get("/api/settings/:address", (req, res) => {
    const { address } = req.params;
    const settings = db.prepare("SELECT * FROM user_settings WHERE wallet_address = ?").get(address);
    res.json(settings || { binance_usdt_address: "" });
  });

  app.post("/api/settings", (req, res) => {
    const { wallet_address, binance_usdt_address } = req.body;
    const stmt = db.prepare(`
      INSERT INTO user_settings (wallet_address, binance_usdt_address)
      VALUES (?, ?)
      ON CONFLICT(wallet_address) DO UPDATE SET binance_usdt_address = excluded.binance_usdt_address
    `);
    stmt.run(wallet_address, binance_usdt_address);
    res.json({ success: true });
  });

  // Mock Exchange Rates API (In a real app, these would fetch from CEX/DEX APIs)
  app.get("/api/rates/:symbol", async (req, res) => {
    const { symbol } = req.params;
    // For demo purposes, we'll return slightly varied rates
    // In production, you'd use axios.get('https://api.binance.com/api/v3/ticker/price?symbol=' + symbol + 'USDT')
    const basePrice = 1.0; // Mock base
    
    const exchanges = [
      { name: "Binance", rate: basePrice * (1 + (Math.random() * 0.02 - 0.01)), fee: 0.001 },
      { name: "Coinbase", rate: basePrice * (1 + (Math.random() * 0.02 - 0.01)), fee: 0.005 },
      { name: "Kraken", rate: basePrice * (1 + (Math.random() * 0.02 - 0.01)), fee: 0.002 },
      { name: "OKX", rate: basePrice * (1 + (Math.random() * 0.02 - 0.01)), fee: 0.001 },
      { name: "Kucoin", rate: basePrice * (1 + (Math.random() * 0.02 - 0.01)), fee: 0.001 },
      { name: "1inch", rate: basePrice * (1 + (Math.random() * 0.02 - 0.01)), fee: 0.0005 },
    ];

    res.json(exchanges.sort((a, b) => b.rate - a.rate));
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
