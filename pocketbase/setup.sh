#!/bin/bash
# pocketbase/setup.sh
# Run this to set up a fresh PocketBase instance with all required collections.
# Usage: cd pocketbase && ./setup.sh
set -e

ADMIN_EMAIL="${PB_ADMIN_EMAIL:-admin@nana.local}"
ADMIN_PASSWORD="${PB_ADMIN_PASSWORD:-Admin1234!}"
PB_URL="http://127.0.0.1:8090"

echo "Starting PocketBase..."
./pocketbase serve &
PB_PID=$!
sleep 3

echo "Creating admin account..."
curl -s -X POST "$PB_URL/api/admins" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASSWORD\",\"passwordConfirm\":\"$ADMIN_PASSWORD\"}" > /dev/null || echo "(admin may already exist)"

echo "Getting admin token..."
TOKEN=$(curl -s -X POST "$PB_URL/api/admins/auth-with-password" \
  -H "Content-Type: application/json" \
  -d "{\"identity\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASSWORD\"}" | python3 -c "import sys,json; print(json.load(sys.stdin)['token'])")

echo "Creating collections..."

# credit_ledger
curl -s -X POST "$PB_URL/api/collections" \
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
  }' > /dev/null && echo "  - credit_ledger created"

# jobs
curl -s -X POST "$PB_URL/api/collections" \
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
  }' > /dev/null && echo "  - jobs created"

JOBS_ID=$(curl -s "$PB_URL/api/collections/jobs" \
  -H "Authorization: $TOKEN" | python3 -c "import sys,json; print(json.load(sys.stdin)['id'])")

# job_items (references jobs collection by ID)
curl -s -X POST "$PB_URL/api/collections" \
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
  }" > /dev/null && echo "  - job_items created"

# payments
curl -s -X POST "$PB_URL/api/collections" \
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
    "listRule": "@request.auth.id = user_id",
    "viewRule": "@request.auth.id = user_id",
    "createRule": null, "updateRule": null, "deleteRule": null
  }' > /dev/null && echo "  - payments created"

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
