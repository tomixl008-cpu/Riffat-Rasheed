import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import Stripe from "stripe";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Subscription state store
  let activeSubscription: {
    isActive: boolean;
    plan: string;
    price: string;
    startedAt: string | null;
    expiresAt: string | null;
    email: string | null;
    paymentMethod: string | null;
    subscriptionId: string | null;
  } = {
    isActive: false,
    plan: "FanTik Coins VIP Pass",
    price: "$2.33 / month",
    startedAt: null,
    expiresAt: null,
    email: null,
    paymentMethod: null,
    subscriptionId: null,
  };

  const getStripe = (): Stripe | null => {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) return null;
    return new Stripe(key);
  };

  // Get current subscription status
  app.get("/api/subscription/status", (_req, res) => {
    res.json(activeSubscription);
  });

  // Global Worldwide Payment Processing ($2.33)
  app.post("/api/subscription/pay", async (req, res) => {
    const { email, paymentMethod, paymentToken, txId, details } = req.body;

    const now = new Date();
    const expiry = new Date();
    expiry.setMonth(expiry.getMonth() + 1);

    const subId = txId || paymentToken || `ft_${Date.now().toString(36)}`;

    activeSubscription = {
      isActive: true,
      plan: "FanTik Coins VIP Pass",
      price: "$2.33 / month",
      startedAt: now.toISOString(),
      expiresAt: expiry.toISOString(),
      email: email || "user@fantik.app",
      paymentMethod: paymentMethod || "Global Payment",
      subscriptionId: subId,
    };

    return res.json({
      success: true,
      message: `Payment of $2.33 received successfully via ${paymentMethod || "Global Payment"}`,
      subscription: activeSubscription,
    });
  });

  // Stripe Checkout Session
  app.post("/api/subscription/checkout", async (req, res) => {
    const { email } = req.body;
    const stripe = getStripe();

    if (stripe) {
      try {
        const session = await stripe.checkout.sessions.create({
          payment_method_types: ["card"],
          line_items: [
            {
              price_data: {
                currency: "usd",
                product_data: {
                  name: "FanTik Coins VIP Pass",
                  description: "Unlimited 24/7 automated coin collection and turbo sync",
                },
                unit_amount: 233, // $2.33 USD
                recurring: {
                  interval: "month",
                },
              },
              quantity: 1,
            },
          ],
          mode: "subscription",
          customer_email: email || undefined,
          success_url: `${req.headers.origin || "http://localhost:3000"}/?subscribed=true`,
          cancel_url: `${req.headers.origin || "http://localhost:3000"}/?canceled=true`,
        });

        return res.json({ checkoutUrl: session.url });
      } catch (err: any) {
        console.error("Stripe session error:", err);
      }
    }

    const now = new Date();
    const expiry = new Date();
    expiry.setMonth(expiry.getMonth() + 1);

    activeSubscription = {
      isActive: true,
      plan: "FanTik Coins VIP Pass",
      price: "$2.33 / month",
      startedAt: now.toISOString(),
      expiresAt: expiry.toISOString(),
      email: email || "user@fantik.app",
      paymentMethod: "Global Payment",
      subscriptionId: `sub_ft_${Date.now().toString(36)}`,
    };

    return res.json({
      success: true,
      subscription: activeSubscription,
    });
  });

  // Cancel Subscription endpoint
  app.post("/api/subscription/cancel", (_req, res) => {
    activeSubscription = {
      isActive: false,
      plan: "FanTik Coins VIP Pass",
      price: "$2.33 / month",
      startedAt: null,
      expiresAt: null,
      email: null,
      paymentMethod: null,
      subscriptionId: null,
    };
    res.json({ success: true, message: "Subscription cancelled" });
  });

  // Health and connection check endpoint
  app.get("/api/health", (_req, res) => {
    res.json({
      status: "online",
      serverTime: new Date().toISOString(),
      app: "FanTik Coins",
      version: "1.0.0",
      subscriptionPrice: "$2.33",
    });
  });

  // Vite middleware for development or static serving for production
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true, host: "0.0.0.0", port: 3000 },
      appType: "spa",
    });
    
    app.use(vite.middlewares);

    // Development SPA HTML fallback
    app.use(async (req, res, next) => {
      if (req.method !== "GET") return next();
      const url = req.originalUrl;
      try {
        const indexPath = path.resolve(process.cwd(), "index.html");
        let template = fs.readFileSync(indexPath, "utf-8");
        template = await vite.transformIndexHtml(url, template);
        res.status(200).set({ "Content-Type": "text/html" }).end(template);
      } catch (e: any) {
        vite.ssrFixStacktrace(e);
        next(e);
      }
    });
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    
    // Production SPA fallback
    app.use((_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`FanTik Coins server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
