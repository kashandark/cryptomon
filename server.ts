import express from "express";
import { createServer as createViteServer } from "vite";
import { createClient } from "@supabase/supabase-js";
import path from "path";
import dotenv from "dotenv";

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || "";
const supabaseKey = process.env.SUPABASE_ANON_KEY || "";
const supabase = createClient(supabaseUrl, supabaseKey);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes
  app.get("/api/settings/:address", async (req, res) => {
    const { address } = req.params;
    
    if (!supabaseUrl || !supabaseKey) {
      return res.json({ binance_usdt_address: "" });
    }

    const { data, error } = await supabase
      .from("user_settings")
      .select("*")
      .eq("wallet_address", address)
      .single();

    if (error && error.code !== "PGRST116") { // PGRST116 is "no rows found"
      console.error("Supabase error:", error);
      return res.status(500).json({ message: "Database error" });
    }

    res.json(data || { binance_usdt_address: "" });
  });

  app.post("/api/settings", async (req, res) => {
    const { wallet_address, binance_usdt_address } = req.body;

    if (!supabaseUrl || !supabaseKey) {
      return res.status(500).json({ message: "Supabase credentials not configured" });
    }

    const { error } = await supabase
      .from("user_settings")
      .upsert({ 
        wallet_address, 
        binance_usdt_address 
      }, { 
        onConflict: "wallet_address" 
      });

    if (error) {
      console.error("Supabase error:", error);
      return res.status(500).json({ message: "Failed to save settings" });
    }

    res.json({ success: true });
  });

  // Mock Exchange Rates API (In a real app, these would fetch from CEX/DEX APIs)
  app.get("/api/rates/:symbol", async (req, res) => {
    const { symbol } = req.params;

    // Simulate occasional API failure (10% chance)
    if (Math.random() < 0.1) {
      return res.status(503).json({ 
        message: "Exchange API is currently overloaded. Please try again in a few seconds." 
      });
    }

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
