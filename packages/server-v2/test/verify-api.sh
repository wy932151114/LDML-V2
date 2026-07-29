#!/bin/bash
# DZN OS V2 - Real API Verification Script

BASE="http://localhost:5000/api"
LOGIN=$(curl -s -X POST "$BASE/v2/auth/login" \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@daoziran.com","password":"admin888"}')
TOKEN=$(echo "$LOGIN" | python3 -c "import sys,json; print(json.load(sys.stdin)['accessToken'])")
AUTH="Authorization: Bearer $TOKEN"

echo "=== Verification Report ==="
echo ""

# 1. Workflow List
echo "--- 1. Workflow List ---"
curl -s "$BASE/v2/workflows" -H "$AUTH" | python3 -c "
import sys,json
d=json.load(sys.stdin)
print(f'Status: OK | Items: {len(d.get(\"items\",[]))} | Total: {d.get(\"total\",0)}')
"

# 2. Workflow Stats
echo "--- 2. Workflow Stats ---"
curl -s "$BASE/v2/workflows/stats" -H "$AUTH" | python3 -c "
import sys,json
d=json.load(sys.stdin)
print(f'Status: OK | Data: {json.dumps(d,ensure_ascii=False)[:200]}')
"

# 3. Create Workflow
echo "--- 3. Create Workflow ---"
CREATE=$(curl -s -X POST "$BASE/v2/workflows" -H "$AUTH" \
  -H 'Content-Type: application/json' \
  -d '{"name":"验证测试流程","category":"bazi","description":"系统闭环验证"}')
echo "$CREATE" | python3 -c "
import sys,json
d=json.load(sys.stdin)
print(f'Status: OK | WorkflowId: {d.get(\"workflowId\",\"?\")} | Name: {d.get(\"name\",\"?\")}')
" 2>/dev/null || echo "Create result: $(echo $CREATE | head -c 200)"

# 4. Execute Workflow (if created)
WFID=$(echo "$CREATE" | python3 -c "import sys,json; print(json.load(sys.stdin).get('workflowId',''))" 2>/dev/null)
if [ -n "$WFID" ]; then
  echo "--- 4. Execute Workflow $WFID ---"
  curl -s -X POST "$BASE/v2/workflows/$WFID/execute" -H "$AUTH" \
    -H 'Content-Type: application/json' \
    -d '{}' | python3 -c "
import sys,json
d=json.load(sys.stdin)
print(f'Status: {d.get(\"status\",\"?\")} | ExecutionId: {d.get(\"executionId\",\"?\")}')
"
fi

# 5. Prompt Center
echo "--- 5. Prompt Center (seeded prompts) ---"
curl -s "$BASE/v2/prompts" -H "$AUTH" | python3 -c "
import sys,json
data=json.load(sys.stdin)
items = data if isinstance(data,list) else data.get('prompts',data.get('items',[]))
print(f'Status: OK | Prompts: {len(items)}')
for p in items[:3]:
  print(f'  - {p.get(\"promptId\",\"?\")} ({p.get(\"category\",\"?\")}) v{p.get(\"version\",\"?\")} [{p.get(\"status\",\"?\")}]')
"

# 6. Report Center (list recent reports)
echo "--- 6. Report Center ---"
curl -s "$BASE/v2/report?limit=3" -H "$AUTH" | python3 -c "
import sys,json
d=json.load(sys.stdin)
items = d.get('reports',d.get('items',[]))
print(f'Status: OK | Reports: {len(items)}')
for r in items[:3]:
  pi = r.get('promptId','-')
  pv = r.get('promptVersion','-')
  pr = r.get('provider','-')
  mo = r.get('model','-')
  print(f'  - promptId={pi} version={pv} provider={pr} model={mo}')
"

# 7. AI Runtime
echo "--- 7. AI Runtime Health ---"
curl -s "$BASE/v2/ai-runtime/health" -H "$AUTH" | python3 -c "
import sys,json
d=json.load(sys.stdin)
providers = d.get('providers',{})
configured = sum(1 for p in providers.values() if p.get('status')=='healthy')
print(f'Status: {d.get(\"runtime\",{}).get(\"status\",\"?\")}')
print(f'Providers: {len(providers)} total, {configured} configured')
for name,p in providers.items():
  print(f'  - {name}: {p.get(\"status\",\"?\")} ({p.get(\"latency\",\"?\")}ms)')
"

echo ""
echo "=== Verification Complete ==="
