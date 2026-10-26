/* ============================================================
 * lib/otp.js — shared helpers for OTP Netlify Functions
 * Zero npm dependencies (Node 18+ global fetch + crypto).
 * ============================================================ */
const crypto = require("node:crypto");

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

function corsResponse(body, status = 200) {
  return { statusCode: status, headers: CORS_HEADERS, body: JSON.stringify(body) };
}

function readBody(event) {
  try {
    return JSON.parse(event.body || "{}");
  } catch {
    return {};
  }
}

function hashToken(token, target) {
  return crypto.createHash("sha256").update(`${token}.${target}`).digest("hex");
}

function generateCode() {
  return String(crypto.randomInt(0, 1_000_000)).padStart(6, "0");
}

function supabaseConfigured() {
  return !!(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

async function supabaseRest(path, { method = "GET", body } = {}) {
  const res = await fetch(`${process.env.SUPABASE_URL}/rest/v1/${path}`, {
    method,
    headers: {
      apikey: process.env.SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json",
      Prefer: method === "POST" ? "return=representation" : "return=minimal",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) throw new Error(`Supabase REST ${res.status}: ${text}`);
  return data;
}

async function sendSmsWebhook(target, code) {
  // Optional generic SMS gateway webhook.
  // Set SMS_API_URL (+ optionally SMS_API_KEY) in Netlify env vars.
  if (!process.env.SMS_API_URL) return false;
  try {
    await fetch(process.env.SMS_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(process.env.SMS_API_KEY ? { Authorization: `Bearer ${process.env.SMS_API_KEY}` } : {}),
      },
      body: JSON.stringify({ to: target, message: `myGov demo OTP: ${code}`, otp: code }),
    });
    return true;
  } catch (err) {
    console.warn("SMS webhook failed:", err.message);
    return false;
  }
}

module.exports = {
  CORS_HEADERS,
  corsResponse,
  readBody,
  hashToken,
  generateCode,
  supabaseConfigured,
  supabaseRest,
  sendSmsWebhook,
};
