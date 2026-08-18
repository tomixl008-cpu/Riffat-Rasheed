"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server.ts
var import_express = __toESM(require("express"), 1);
var import_path = __toESM(require("path"), 1);
var import_fs = __toESM(require("fs"), 1);
var import_vite = require("vite");
var import_stripe = __toESM(require("stripe"), 1);
async function startServer() {
  const app = (0, import_express.default)();
  const PORT = 3e3;
  app.use(import_express.default.json());
  let activeSubscription = {
    isActive: false,
    plan: "FanTik Coins VIP Pass",
    price: "$2.33 / month",
    startedAt: null,
    expiresAt: null,
    email: null,
    paymentMethod: null,
    subscriptionId: null
  };
  const getStripe = () => {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) return null;
    return new import_stripe.default(key);
  };
  app.get("/api/subscription/status", (_req, res) => {
    res.json(activeSubscription);
  });
  app.post("/api/subscription/pay", async (req, res) => {
    const { email, paymentMethod, paymentToken, txId, details } = req.body;
    const now = /* @__PURE__ */ new Date();
    const expiry = /* @__PURE__ */ new Date();
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
      subscriptionId: subId
    };
    return res.json({
      success: true,
      message: `Payment of $2.33 received successfully via ${paymentMethod || "Global Payment"}`,
      subscription: activeSubscription
    });
  });
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
                  description: "Unlimited 24/7 automated coin collection and turbo sync"
                },
                unit_amount: 233,
                // $2.33 USD
                recurring: {
                  interval: "month"
                }
              },
              quantity: 1
            }
          ],
          mode: "subscription",
          customer_email: email || void 0,
          success_url: `${req.headers.origin || "http://localhost:3000"}/?subscribed=true`,
          cancel_url: `${req.headers.origin || "http://localhost:3000"}/?canceled=true`
        });
        return res.json({ checkoutUrl: session.url });
      } catch (err) {
        console.error("Stripe session error:", err);
      }
    }
    const now = /* @__PURE__ */ new Date();
    const expiry = /* @__PURE__ */ new Date();
    expiry.setMonth(expiry.getMonth() + 1);
    activeSubscription = {
      isActive: true,
      plan: "FanTik Coins VIP Pass",
      price: "$2.33 / month",
      startedAt: now.toISOString(),
      expiresAt: expiry.toISOString(),
      email: email || "user@fantik.app",
      paymentMethod: "Global Payment",
      subscriptionId: `sub_ft_${Date.now().toString(36)}`
    };
    return res.json({
      success: true,
      subscription: activeSubscription
    });
  });
  app.post("/api/subscription/cancel", (_req, res) => {
    activeSubscription = {
      isActive: false,
      plan: "FanTik Coins VIP Pass",
      price: "$2.33 / month",
      startedAt: null,
      expiresAt: null,
      email: null,
      paymentMethod: null,
      subscriptionId: null
    };
    res.json({ success: true, message: "Subscription cancelled" });
  });
  app.get("/api/health", (_req, res) => {
    res.json({
      status: "online",
      serverTime: (/* @__PURE__ */ new Date()).toISOString(),
      app: "FanTik Coins",
      version: "1.0.0",
      subscriptionPrice: "$2.33"
    });
  });
  if (process.env.NODE_ENV !== "production") {
    const vite = await (0, import_vite.createServer)({
      server: { middlewareMode: true, host: "0.0.0.0", port: 3e3 },
      appType: "spa"
    });
    app.use(vite.middlewares);
    app.use(async (req, res, next) => {
      if (req.method !== "GET") return next();
      const url = req.originalUrl;
      try {
        const indexPath = import_path.default.resolve(process.cwd(), "index.html");
        let template = import_fs.default.readFileSync(indexPath, "utf-8");
        template = await vite.transformIndexHtml(url, template);
        res.status(200).set({ "Content-Type": "text/html" }).end(template);
      } catch (e) {
        vite.ssrFixStacktrace(e);
        next(e);
      }
    });
  } else {
    const distPath = import_path.default.join(process.cwd(), "dist");
    app.use(import_express.default.static(distPath));
    app.use((_req, res) => {
      res.sendFile(import_path.default.join(distPath, "index.html"));
    });
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`FanTik Coins server running on http://0.0.0.0:${PORT}`);
  });
}
startServer();
//# sourceMappingURL=server.cjs.map
