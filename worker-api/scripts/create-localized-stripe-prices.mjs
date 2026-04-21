#!/usr/bin/env node

const STRIPE_API_BASE = "https://api.stripe.com/v1";
const INTERVAL = "month";

const secretKey = String(process.env.STRIPE_SECRET_KEY || "").trim();
const starterSourcePriceId = String(process.env.STRIPE_CV_STARTER_PRICE_ID || "").trim();
const plusSourcePriceId = String(process.env.STRIPE_CV_PLUS_PRICE_ID || "").trim();

if (!secretKey || !starterSourcePriceId || !plusSourcePriceId) {
  console.error(
    [
      "Missing required env vars.",
      "Expected STRIPE_SECRET_KEY, STRIPE_CV_STARTER_PRICE_ID, and STRIPE_CV_PLUS_PRICE_ID."
    ].join(" ")
  );
  process.exit(1);
}

const PLAN_CONFIG = Object.freeze({
  cv_starter: {
    sourcePriceId: starterSourcePriceId,
    amounts: Object.freeze({
      USD: 400,
      EUR: 300,
      KRW: 4500
    })
  },
  cv_plus: {
    sourcePriceId: plusSourcePriceId,
    amounts: Object.freeze({
      USD: 1200,
      EUR: 900,
      KRW: 13500
    })
  }
});

async function stripeRequest(path, { method = "GET", body = null } = {}) {
  const response = await fetch(`${STRIPE_API_BASE}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${secretKey}`,
      ...(body ? { "Content-Type": "application/x-www-form-urlencoded" } : {})
    },
    body: body ? body.toString() : undefined
  });

  const text = await response.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null;
  }

  if (!response.ok) {
    const message = data && data.error && data.error.message ? data.error.message : text || `Stripe error ${response.status}`;
    throw new Error(message);
  }

  return data;
}

async function fetchPrice(priceId) {
  return await stripeRequest(`/prices/${encodeURIComponent(priceId)}`);
}

async function listProductPrices(productId, currency) {
  const params = new URLSearchParams();
  params.set("active", "true");
  params.set("product", productId);
  params.set("currency", String(currency || "").toLowerCase());
  params.set("limit", "100");
  return await stripeRequest(`/prices?${params.toString()}`);
}

function findMatchingRecurringPrice(prices, amount) {
  const list = Array.isArray(prices && prices.data) ? prices.data : [];
  return list.find((price) =>
    price &&
    price.type === "recurring" &&
    price.recurring &&
    price.recurring.interval === INTERVAL &&
    Number(price.unit_amount) === Number(amount)
  ) || null;
}

async function createRecurringPrice({ productId, planId, amount, currency }) {
  const params = new URLSearchParams();
  params.set("product", productId);
  params.set("currency", String(currency || "").toLowerCase());
  params.set("unit_amount", String(amount));
  params.set("recurring[interval]", INTERVAL);
  params.set("metadata[plan_id]", planId);
  params.set("metadata[currency]", currency);
  params.set("nickname", `jobmejob ${planId} ${currency.toUpperCase()} monthly`);
  return await stripeRequest("/prices", { method: "POST", body: params });
}

async function ensureLocalizedPrice({ planId, sourcePriceId, currency, amount }) {
  const sourcePrice = await fetchPrice(sourcePriceId);
  const productId = String(sourcePrice && sourcePrice.product || "").trim();
  if (!productId) throw new Error(`Could not resolve product for ${planId}`);

  if (
    String(sourcePrice && sourcePrice.currency || "").trim().toUpperCase() === String(currency || "").trim().toUpperCase() &&
    Number(sourcePrice && sourcePrice.unit_amount) === Number(amount)
  ) {
    return { id: sourcePriceId, reused: true, created: false };
  }

  const existing = findMatchingRecurringPrice(await listProductPrices(productId, currency), amount);
  if (existing && existing.id) {
    return { id: existing.id, reused: true, created: false };
  }

  const created = await createRecurringPrice({ productId, planId, amount, currency });
  return { id: created.id, reused: false, created: true };
}

async function main() {
  const results = {};

  for (const [planId, config] of Object.entries(PLAN_CONFIG)) {
    results[planId] = {};
    for (const [currency, amount] of Object.entries(config.amounts)) {
      results[planId][currency] = await ensureLocalizedPrice({
        planId,
        sourcePriceId: config.sourcePriceId,
        currency,
        amount
      });
    }
  }

  const envLines = [
    `STRIPE_CV_STARTER_PRICE_ID_USD=${results.cv_starter.USD.id}`,
    `STRIPE_CV_STARTER_PRICE_ID_EUR=${results.cv_starter.EUR.id}`,
    `STRIPE_CV_STARTER_PRICE_ID_KRW=${results.cv_starter.KRW.id}`,
    `STRIPE_CV_PLUS_PRICE_ID_USD=${results.cv_plus.USD.id}`,
    `STRIPE_CV_PLUS_PRICE_ID_EUR=${results.cv_plus.EUR.id}`,
    `STRIPE_CV_PLUS_PRICE_ID_KRW=${results.cv_plus.KRW.id}`
  ];

  console.log(envLines.join("\n"));
}

main().catch((error) => {
  console.error(String(error && error.message || error || "Stripe price creation failed"));
  process.exit(1);
});
