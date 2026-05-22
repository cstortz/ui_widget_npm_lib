#!/usr/bin/env bash
set -euo pipefail

HOST="${1:-widget-system.dev.stortz.tech}"
NS="${NS:-widget-system}"

echo "=== DNS ==="
getent hosts "$HOST" 2>/dev/null || nslookup "$HOST" 2>/dev/null || echo "Could not resolve $HOST"

echo ""
echo "=== Ingress (widget-system namespace) ==="
kubectl get ingress -n "$NS" -o wide 2>/dev/null || echo "No ingress in $NS"

echo ""
echo "=== Ingress controller service ==="
kubectl get svc -A 2>/dev/null | grep -i ingress || echo "No ingress controller service found"

echo ""
echo "=== App pods & services ==="
kubectl get pods,svc,endpoints -n "$NS" 2>/dev/null

echo ""
echo "=== Direct pod health (bypass ingress) ==="
kubectl run curl-test --rm -i --restart=Never --image=curlimages/curl:latest -n "$NS" -- \
  curl -sf "http://demo-angular/health" && echo " demo-angular OK" || echo " demo-angular FAILED"
kubectl run curl-test2 --rm -i --restart=Never --image=curlimages/curl:latest -n "$NS" -- \
  curl -sf "http://demo-react/health" && echo " demo-react OK" || echo " demo-react FAILED"

echo ""
echo "=== Ingress IP tests ==="
INGRESS_IP="$(kubectl get svc -n ingress-nginx ingress-nginx-controller -o jsonpath='{.status.loadBalancer.ingress[0].ip}' 2>/dev/null || true)"
NODE_IP="$(kubectl get nodes -o jsonpath='{.items[0].status.addresses[?(@.type=="InternalIP")].address}' 2>/dev/null || true)"
HTTP_PORT="$(kubectl get svc -n ingress-nginx ingress-nginx-controller -o jsonpath='{.spec.ports[?(@.port==80)].nodePort}' 2>/dev/null || true)"

TARGET="${INGRESS_IP:-$NODE_IP}"
if [ -n "$TARGET" ]; then
  echo "Trying http://${TARGET}/ with Host: $HOST"
  curl -sv --max-time 5 -H "Host: ${HOST}" "http://${TARGET}/" 2>&1 | head -30 || true
  if [ -n "$HTTP_PORT" ] && [ "$HTTP_PORT" != "null" ]; then
    echo ""
    echo "Trying NodePort http://${NODE_IP}:${HTTP_PORT}/ with Host: $HOST"
    curl -sv --max-time 5 -H "Host: ${HOST}" "http://${NODE_IP}:${HTTP_PORT}/" 2>&1 | head -30 || true
  fi
else
  echo "Could not detect ingress IP or node IP automatically."
fi

echo ""
echo "=== DNS should point to ==="
if [ -n "$INGRESS_IP" ] && [ "$INGRESS_IP" != "null" ]; then
  echo "  A record $HOST -> $INGRESS_IP (LoadBalancer EXTERNAL-IP)"
elif [ -n "$NODE_IP" ] && [ -n "$HTTP_PORT" ] && [ "$HTTP_PORT" != "null" ]; then
  echo "  A record $HOST -> $NODE_IP  (ingress uses NodePort $HTTP_PORT)"
else
  echo "  Run: kubectl get svc -n ingress-nginx ingress-nginx-controller -o wide"
fi

echo ""
echo "=== Hostname curl (uses your DNS) ==="
curl -sv --max-time 5 "http://${HOST}/" 2>&1 | head -20 || true
