# Micopay Protocol — Agent Skill

**Payment:** x402 (USDC on Stellar) — no API keys, no signup
**Discovery:** `GET /api/v1/services`
**Network:** Stellar Testnet

---

## What is Micopay?

Micopay Protocol is an x402 microservice network on Stellar that any AI agent
can discover, pay per-request, and compose. Services include atomic swap
coordination (cross-chain HTLCs via Claude + deterministic executor), on-chain
reputation scoring, and a self-funding meta-demo endpoint.

---

## How to pay (x402)

1. Send a request to any endpoint below — you'll get a `402 Payment Required`
2. Build a Stellar USDC payment tx to the `pay_to` address in the challenge
3. Include the signed tx XDR in the `X-Payment` header
4. Resend the request with the header — you'll get a `200` with data

```
GET /api/v1/swaps/search?sell_asset=USDC&buy_asset=XLM&amount=100
→ 402 { challenge: { amount_usdc: "0.001", pay_to: "G...", memo: "micopay:swap_search" } }

GET /api/v1/swaps/search?sell_asset=USDC&buy_asset=XLM&amount=100
X-Payment: <signed_xdr>
→ 200 { counterparties: [...] }
```

---

## Endpoints

### Free (no payment)

| Endpoint | Description |
|----------|-------------|
| `GET /health` | API health check |
| `GET /api/v1/services` | Full service catalog (this document as JSON) |
| `GET /skill.md` | This file |
| `GET /api/v1/fund/stats` | Fund Micopay live stats |

### Paid (x402 USDC)

| Endpoint | Price | Description |
|----------|-------|-------------|
| `GET /api/v1/swaps/search` | $0.001 | Find swap counterparties |
| `POST /api/v1/swaps/plan` | $0.01 | AI swap planning (Claude) |
| `POST /api/v1/swaps/execute` | $0.05 | Execute atomic swap |
| `GET /api/v1/swaps/:id/status` | $0.0001 | Poll swap status |
| `GET /api/v1/reputation/:address` | $0.0005 | On-chain reputation score |
| `POST /api/v1/fund` | $0.10 min | Fund the Micopay project |

---

## Complete example: search → plan → execute

```bash
# 1. Search for counterparties ($0.001)
curl -H "X-Payment: <xdr>" \
  "https://api.micopay.xyz/api/v1/swaps/search?sell_asset=USDC&buy_asset=XLM&amount=50"

# 2. Plan the swap ($0.01) — Claude parses intent and queries real data
curl -X POST -H "X-Payment: <xdr>" -H "Content-Type: application/json" \
  -d '{"intent":"swap 50 USDC for XLM","user_address":"G..."}' \
  "https://api.micopay.xyz/api/v1/swaps/plan"

# 3. Execute ($0.05) — deterministic executor, no LLM
curl -X POST -H "X-Payment: <xdr>" -H "Content-Type: application/json" \
  -d '{"plan_id":"plan_xxx","user_address":"G..."}' \
  "https://api.micopay.xyz/api/v1/swaps/execute"

# 4. Poll status ($0.0001)
curl -H "X-Payment: <xdr>" \
  "https://api.micopay.xyz/api/v1/swaps/swap_xxx/status"
```

---

## Fund Micopay (meta-demo)

Any agent can fund the Micopay project using the same x402 infrastructure
it's demonstrating. This proves the protocol works in 10 seconds.

```bash
curl -X POST -H "X-Payment: <xdr>" -H "Content-Type: application/json" \
  -d '{"message":"Great project!"}' \
  "https://api.micopay.xyz/api/v1/fund"

# Response:
# { "thank_you": true, "supporter_id": "mcp-supporter-001",
#   "total_funded_usdc": "12.50", "stellar_expert_url": "https://..." }
```

---

## Architecture

- **Intent Parser (Claude):** Understands natural language, queries live data, produces SwapPlan
- **Swap Executor (TypeScript):** Deterministic — follows the plan exactly, never hallucinates
- **Contracts (Soroban/Rust):** HashedTimeLock trait with two implementations
- **x402 Middleware:** Payment IS authentication — no accounts, no API keys

The LLM never touches funds. The executor never makes decisions.

---

## Reputation tiers

| Score | Tier | NFT Soulbound |
|-------|------|---------------|
| 95-100 | Maestro | Yes |
| 85-94 | Hongo | Yes |
| 70-84 | Micelio | Yes |
| 0-69 | Espora | No |
