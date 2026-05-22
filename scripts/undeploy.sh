#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

MODE="${1:-all}"

usage() {
  cat <<EOF
Usage: $(basename "$0") [helm|kubectl|all]

  helm      Uninstall Helm release
  kubectl   Delete raw k8s resources
  all       Remove both (default)
EOF
}

undeploy_helm() {
  if helm status widget-system -n widget-system &>/dev/null; then
    echo "==> Uninstalling Helm release..."
    helm uninstall widget-system -n widget-system
  fi
}

undeploy_kubectl() {
  echo "==> Deleting k8s resources..."
  kubectl delete -f k8s/ingress.yaml --ignore-not-found
  kubectl delete -f k8s/demo-apps.yaml --ignore-not-found
  kubectl delete -f k8s/namespace.yaml --ignore-not-found
}

case "$MODE" in
  helm)     undeploy_helm ;;
  kubectl)  undeploy_kubectl ;;
  all)      undeploy_helm; undeploy_kubectl ;;
  -h|--help|help) usage ;;
  *) echo "Unknown mode: $MODE"; usage; exit 1 ;;
esac

echo "Done."
