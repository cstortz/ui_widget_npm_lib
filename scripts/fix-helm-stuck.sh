#!/usr/bin/env bash
set -euo pipefail

# Clears a Helm release stuck in pending-install / pending-upgrade state.
#
# Usage: ./scripts/fix-helm-stuck.sh [release-name] [namespace]

RELEASE="${1:-widget-system}"
NAMESPACE="${2:-widget-system}"

echo "==> Checking Helm release: $RELEASE (namespace: $NAMESPACE)"

if ! helm status "$RELEASE" -n "$NAMESPACE" &>/dev/null; then
  echo "No release found — nothing to fix."
  exit 0
fi

STATUS="$(helm status "$RELEASE" -n "$NAMESPACE" -o json 2>/dev/null | grep -o '"status":"[^"]*"' | head -1 | cut -d'"' -f4 || true)"
echo "Current status: ${STATUS:-unknown}"

if helm status "$RELEASE" -n "$NAMESPACE" 2>&1 | grep -qiE 'pending-install|pending-upgrade|pending-rollback'; then
  echo "==> Release is pending — attempting rollback..."
  if helm rollback "$RELEASE" -n "$NAMESPACE" 2>/dev/null; then
    echo "Rollback succeeded."
    exit 0
  fi

  echo "==> Rollback failed — removing pending Helm secrets..."
  kubectl get secrets -n "$NAMESPACE" -l "owner=helm,name=${RELEASE}" -o name 2>/dev/null \
    | while read -r secret; do
        if kubectl get "$secret" -n "$NAMESPACE" -o jsonpath='{.metadata.labels.status}' 2>/dev/null \
          | grep -qE 'pending-install|pending-upgrade|pending-rollback'; then
          echo "Deleting $secret"
          kubectl delete "$secret" -n "$NAMESPACE"
        fi
      done

  echo "==> Done. Retry: ./scripts/deploy.sh ghcr dev"
else
  echo "Release is not in a pending state."
fi
