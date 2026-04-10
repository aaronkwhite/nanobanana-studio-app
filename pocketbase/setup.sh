#!/bin/bash
# pocketbase/setup.sh
# Run this to set up a fresh PocketBase instance with all required collections.
# Usage: cd pocketbase && ./setup.sh
set -e

ADMIN_EMAIL="${PB_ADMIN_EMAIL:-admin@nana.local}"
ADMIN_PASSWORD="${PB_ADMIN_PASSWORD:-Admin1234!}"
PB_URL="http://127.0.0.1:8090"

if [ "$ADMIN_PASSWORD" = "Admin1234!" ]; then
  echo "WARNING: Using default admin password. Set PB_ADMIN_PASSWORD env var for production."
fi

echo "Starting PocketBase..."
./pocketbase serve &
PB_PID=$!

echo "Waiting for PocketBase to be ready..."
for i in $(seq 1 15); do
  curl -s "$PB_URL/api/health" > /dev/null 2>&1 && break
  sleep 1
done

echo "Creating admin account..."
curl -s -X POST "$PB_URL/api/admins" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASSWORD\",\"passwordConfirm\":\"$ADMIN_PASSWORD\"}" > /dev/null || echo "(admin may already exist)"

echo "Getting admin token..."
TOKEN="Bearer $(curl -s -X POST "$PB_URL/api/admins/auth-with-password" \
  -H "Content-Type: application/json" \
  -d "{\"identity\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASSWORD\"}" | python3 -c "import sys,json; print(json.load(sys.stdin)['token'])")"

if [ -z "$TOKEN" ] || [ "$TOKEN" = "Bearer " ]; then
  echo "ERROR: Failed to get admin token. Check credentials and PocketBase status." >&2
  kill $PB_PID 2>/dev/null
  exit 1
fi

echo "Creating collections..."

# credit_ledger
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$PB_URL/api/collections" \
  -H "Authorization: $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "credit_ledger", "type": "base",
    "schema": [
      {"name":"user_id","type":"relation","required":true,"options":{"collectionId":"_pb_users_auth_","cascadeDelete":false,"maxSelect":1}},
      {"name":"amount","type":"number","required":true},
      {"name":"balance_after","type":"number","required":true},
      {"name":"type","type":"select","required":true,"options":{"maxSelect":1,"values":["purchase","generation","refund"]}},
      {"name":"reference_id","type":"text","required":true}
    ],
    "listRule": "@request.auth.id = user_id",
    "viewRule": "@request.auth.id = user_id",
    "createRule": null, "updateRule": null, "deleteRule": null
  }')
[ "$RESPONSE" = "200" ] && echo "  ✓ credit_ledger created" || echo "  ~ credit_ledger skipped (status $RESPONSE)"

# jobs
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$PB_URL/api/collections" \
  -H "Authorization: $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "jobs", "type": "base",
    "schema": [
      {"name":"user_id","type":"relation","required":true,"options":{"collectionId":"_pb_users_auth_","cascadeDelete":false,"maxSelect":1}},
      {"name":"status","type":"select","required":true,"options":{"maxSelect":1,"values":["pending","processing","complete","failed"]}},
      {"name":"mode","type":"select","required":true,"options":{"maxSelect":1,"values":["realtime","batch"]}},
      {"name":"model","type":"text","required":true},
      {"name":"credits_cost","type":"number","required":true},
      {"name":"kie_job_id","type":"text","required":false}
    ],
    "listRule": "@request.auth.id = user_id",
    "viewRule": "@request.auth.id = user_id",
    "createRule": null, "updateRule": null, "deleteRule": null
  }')
[ "$RESPONSE" = "200" ] && echo "  ✓ jobs created" || echo "  ~ jobs skipped (status $RESPONSE)"

JOBS_ID=$(curl -s "$PB_URL/api/collections/jobs" \
  -H "Authorization: $TOKEN" | python3 -c "import sys,json; print(json.load(sys.stdin)['id'])")

# job_items (references jobs collection by ID)
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$PB_URL/api/collections" \
  -H "Authorization: $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"name\": \"job_items\", \"type\": \"base\",
    \"schema\": [
      {\"name\":\"job_id\",\"type\":\"relation\",\"required\":true,\"options\":{\"collectionId\":\"$JOBS_ID\",\"cascadeDelete\":true,\"maxSelect\":1}},
      {\"name\":\"status\",\"type\":\"select\",\"required\":true,\"options\":{\"maxSelect\":1,\"values\":[\"pending\",\"processing\",\"complete\",\"failed\"]}},
      {\"name\":\"prompt\",\"type\":\"text\",\"required\":true},
      {\"name\":\"resolution\",\"type\":\"select\",\"required\":true,\"options\":{\"maxSelect\":1,\"values\":[\"1K\",\"2K\",\"4K\"]}},
      {\"name\":\"output_url\",\"type\":\"url\",\"required\":false},
      {\"name\":\"error\",\"type\":\"text\",\"required\":false}
    ],
    \"listRule\": \"@request.auth.id = job_id.user_id\",
    \"viewRule\": \"@request.auth.id = job_id.user_id\",
    \"createRule\": null, \"updateRule\": null, \"deleteRule\": null
  }")
[ "$RESPONSE" = "200" ] && echo "  ✓ job_items created" || echo "  ~ job_items skipped (status $RESPONSE)"

# payments
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$PB_URL/api/collections" \
  -H "Authorization: $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "payments", "type": "base",
    "schema": [
      {"name":"user_id","type":"relation","required":true,"options":{"collectionId":"_pb_users_auth_","cascadeDelete":false,"maxSelect":1}},
      {"name":"stripe_session_id","type":"text","required":true},
      {"name":"credits_purchased","type":"number","required":true},
      {"name":"amount_paid_cents","type":"number","required":true},
      {"name":"status","type":"select","required":true,"options":{"maxSelect":1,"values":["pending","complete","refunded"]}}
    ],
    "indexes": ["CREATE UNIQUE INDEX idx_payments_stripe_session ON payments (stripe_session_id)"],
    "listRule": "@request.auth.id = user_id",
    "viewRule": "@request.auth.id = user_id",
    "createRule": null, "updateRule": null, "deleteRule": null
  }')
[ "$RESPONSE" = "200" ] && echo "  ✓ payments created" || echo "  ~ payments skipped (status $RESPONSE)"

echo "Exporting schema..."
curl -s "$PB_URL/api/collections" -H "Authorization: $TOKEN" > pb_schema.json
echo "  - Schema exported to pb_schema.json"

echo "Stopping PocketBase..."
kill $PB_PID 2>/dev/null || true

echo ""
echo "Done! Admin credentials:"
echo "  Email:    $ADMIN_EMAIL"
echo "  Password: $ADMIN_PASSWORD"
echo ""
echo "To start PocketBase: cd pocketbase && ./pocketbase serve"
