#!/usr/bin/env bash
# Demo B — Anonymous reputation for AI agents
#
# Demonstrates: AI agent A (buyer) proves to agent B (market-maker)
# that their reputation tier is >= SILVER, without revealing identity.
# Agent B verifies via ZKaaS, paying 0.001 USDC (mocked in dev).
#
# Requirements:
#   - WSL2 Ubuntu with nargo 1.0.0-beta.9 and bb 0.87.0
#   - API running (npm run dev in apps/api)
#   - ZK_VERIFIER_CONTRACT_ID deployed and VKs registered
#   - ADMIN_SECRET_KEY set (for publish-root)
#
# Usage:
#   cd apps/api && bash demo/run_demo_b.sh [--api-url http://localhost:3000]

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
API_URL="${API_URL:-http://localhost:3000}"
DEMO_DIR="$REPO_ROOT/apps/api/demo"
CIRCUIT_DIR="$REPO_ROOT/circuits/reputation_v1"
WSL_CIRCUIT="/mnt/c/Users/eric/Desktop/HACKATON/circuits/reputation_v1"
WSL_DEMO="/mnt/c/Users/eric/Desktop/HACKATON/apps/api/demo"

# Parse args
while [[ $# -gt 0 ]]; do
  case "$1" in
    --api-url) API_URL="$2"; shift 2;;
    *) echo "Unknown arg: $1"; exit 1;;
  esac
done

echo "======================================================================"
echo "  Demo B — ZKaaS Anonymous Reputation (MicoPay x Stellar)"
echo "======================================================================"
echo "  API:        $API_URL"
echo "  Circuit:    reputation_v1 (depth-20 Merkle + tier threshold + nullifier)"
echo "======================================================================"
echo

# ── Step 0: List available circuits ──────────────────────────────────────────
echo "[0/5] Listing available ZKaaS circuits..."
curl -s "$API_URL/api/v1/zk/circuits" | python3 -m json.tool || \
  curl -s "$API_URL/api/v1/zk/circuits"
echo

# ── Step 1: Build demo tree & generate Prover.toml ───────────────────────────
echo "[1/5] Building demo Merkle tree for alice (GOLD tier, secret=1001)..."
cd "$REPO_ROOT/apps/api"
npx tsx src/cli/rep-engine.ts build-tree \
  --seed demo/demo_users.json \
  --user alice \
  --context 42 \
  --threshold 2
echo

# ── Step 2: Generate witness in WSL2 ─────────────────────────────────────────
echo "[2/5] Generating witness in WSL2 (nargo execute)..."
wsl -d Ubuntu-24.04 -- bash -c "
  set -e
  cd '$WSL_CIRCUIT'
  nargo execute witness
  echo '[ok] Witness generated: target/witness.gz'
"
echo

# ── Step 3: Generate UltraHonk proof in WSL2 (bb prove) ─────────────────────
echo "[3/5] Generating UltraHonk proof in WSL2 (bb prove)..."
wsl -d Ubuntu-24.04 -- bash -c "
  set -e
  mkdir -p ~/zkwork/rep_demo
  cp '$WSL_CIRCUIT/target/reputation_v1.json' ~/zkwork/rep_demo/
  cp '$WSL_CIRCUIT/target/witness.gz' ~/zkwork/rep_demo/
  cd ~/zkwork/rep_demo
  ~/.bb/bb prove -b reputation_v1.json -w witness.gz -o proof/
  cp proof/proof '$WSL_DEMO/alice_proof.bin'
  echo \"[ok] Proof generated: \$(wc -c < proof/proof) bytes\"
"
echo

# ── Step 4: Encode proof as base64 ───────────────────────────────────────────
echo "[4/5] Encoding proof as base64..."
if [[ -f "$DEMO_DIR/alice_proof.bin" ]]; then
  PROOF_B64=$(base64 -w0 "$DEMO_DIR/alice_proof.bin" 2>/dev/null || base64 "$DEMO_DIR/alice_proof.bin")
else
  echo "[error] alice_proof.bin not found. Did step 3 succeed?" >&2
  exit 1
fi
echo "[ok] Proof: ${#PROOF_B64} base64 chars ($(wc -c < "$DEMO_DIR/alice_proof.bin") bytes)"
echo

# ── Step 5: Submit to ZKaaS API ──────────────────────────────────────────────
ROOT="0x079fa7cd6ecb9dc5b48eedf99357995c04771a815c19072ac63b0f1265868bd5"
CONTEXT="42"
NULLIFIER="0x1b7d99efaf246eb3489deefcff6b29541e57fbc7c048da3713b00df3e84eccc2"
TIER_THRESHOLD="2"

# Convert hex to decimal for API (expects decimal field strings)
ROOT_DEC=$(python3 -c "print(int('$ROOT', 16))")
NULLIFIER_DEC=$(python3 -c "print(int('$NULLIFIER', 16))")

echo "[5/5] Submitting proof to ZKaaS API..."
echo "  circuit_id:    reputation_v1"
echo "  public_inputs: [root, tier_threshold=${TIER_THRESHOLD}, context=${CONTEXT}, nullifier]"
echo "  payment:       X-Payment: mock (dev mode)"
echo

RESPONSE=$(curl -s -X POST "$API_URL/api/v1/zk/verify" \
  -H "Content-Type: application/json" \
  -H "X-Payment: mock" \
  -d "{
    \"circuit_id\": \"reputation_v1\",
    \"proof\": \"$PROOF_B64\",
    \"public_inputs\": [\"$ROOT_DEC\", \"$TIER_THRESHOLD\", \"$CONTEXT\", \"$NULLIFIER_DEC\"]
  }" 2>&1)

echo "  Response: $RESPONSE"
echo

# ── Summary ──────────────────────────────────────────────────────────────────
echo "======================================================================"
VERIFIED=$(echo "$RESPONSE" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('verified','?'))" 2>/dev/null || echo "?")
if [[ "$VERIFIED" == "True" || "$VERIFIED" == "true" ]]; then
  echo "  RESULT: PROOF VERIFIED ✓"
  echo "  Agent B knows: counterparty has reputation >= SILVER"
  echo "  Agent B knows: NOTHING ELSE (identity, address, exact tier)"
  echo "  Trade can proceed: A commits to HTLC via poseidon_preimage circuit"
else
  echo "  RESULT: $VERIFIED"
  echo "  (If running locally without on-chain contract, set ZK_VERIFIER_CONTRACT_ID)"
fi
echo "======================================================================"
