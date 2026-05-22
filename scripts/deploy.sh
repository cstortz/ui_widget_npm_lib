#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

MODE="${1:-ghcr}"
ENV="${2:-dev}"
IMAGE_TAG="${IMAGE_TAG:-latest}"
HELM_WAIT="${HELM_WAIT:-1}"
GHCR_PREFIX="${GHCR_PREFIX:-ghcr.io/cstortz/ui_widget_npm_lib}"

usage() {
  cat <<EOF
Usage: $(basename "$0") [ghcr|helm-local|kubectl] [dev|staging|prod]

  ghcr        Deploy using GHCR images (default — works on all cluster nodes)
  helm-local  Build on this machine and load into containerd (single-node only)
  kubectl     Apply raw k8s manifests with local images

Environment variables:
  IMAGE_TAG     Image tag (default: latest)
  HELM_WAIT     Wait for pods: 1 (default) or 0
  GHCR_TOKEN    PAT with read:packages (for setup-ghcr-secret.sh)
  GHCR_PREFIX   Registry path (default: ghcr.io/cstortz/ui_widget_npm_lib)

Examples:
  ./scripts/deploy.sh ghcr dev
  ./scripts/setup-ghcr-secret.sh              # once, for private GHCR packages
  IMAGE_TAG=\$(git rev-parse --short HEAD) ./scripts/deploy.sh ghcr dev
  HELM_WAIT=0 ./scripts/deploy.sh ghcr dev
EOF
}

build_images() {
  echo "==> Building demo assets..."
  npm ci
  npm run build --workspace=demo-angular
  npm run build --workspace=demo-react

  echo "==> Building Docker images..."
  docker build -f apps/demo-angular/Dockerfile -t "widget-system/demo-angular:${IMAGE_TAG}" .
  docker build -f apps/demo-react/Dockerfile -t "widget-system/demo-react:${IMAGE_TAG}" .
}

load_images_to_cluster() {
  echo "==> Loading local images into container runtime on this node..."
  for img in "widget-system/demo-angular:${IMAGE_TAG}" "widget-system/demo-react:${IMAGE_TAG}"; do
    if command -v ctr >/dev/null 2>&1; then
      docker save "$img" | sudo ctr -n k8s.io images import -
    elif command -v nerdctl >/dev/null 2>&1; then
      docker save "$img" | sudo nerdctl -n k8s.io load
    else
      echo "Warning: ctr/nerdctl not found."
    fi
  done
}

show_pod_diagnostics() {
  echo ""
  echo "==> Pod status:"
  kubectl get pods -n widget-system -o wide || true
  echo ""
  echo "==> Recent events:"
  kubectl get events -n widget-system --sort-by='.lastTimestamp' | tail -15 || true
  echo ""
  echo "Fixes:"
  echo "  GHCR ImagePullBackOff:  ./scripts/setup-ghcr-secret.sh  OR make packages public"
  echo "  Wrong tag:              IMAGE_TAG=latest ./scripts/deploy.sh ghcr dev"
  echo "  Debug:                  HELM_WAIT=0 ./scripts/deploy.sh ghcr dev"
}

deploy_helm() {
  local image_source="$1"  # ghcr | local
  VALUES="-f helm/widget-system/values.yaml"
  HELM_EXTRA=()

  case "$ENV" in
    dev)     VALUES="$VALUES -f helm/widget-system/values-dev.yaml" ;;
    staging) VALUES="$VALUES -f helm/widget-system/values-staging.yaml" ;;
    prod)    VALUES="$VALUES -f helm/widget-system/values-prod.yaml" ;;
    *) echo "Unknown environment: $ENV"; exit 1 ;;
  esac

  HELM_SET=(
    --set "global.imageTag=${IMAGE_TAG}"
  )

  if [ "$image_source" = "ghcr" ]; then
    HELM_SET+=(
      --set "demoAngular.image.repository=${GHCR_PREFIX}/demo-angular"
      --set "demoReact.image.repository=${GHCR_PREFIX}/demo-react"
    )
  else
    HELM_SET+=(
      --set-json 'global.imagePullSecrets=[]'
      --set "global.imagePullPolicy=IfNotPresent"
      --set "demoAngular.image.repository=widget-system/demo-angular"
      --set "demoReact.image.repository=widget-system/demo-react"
    )
  fi

  if [ "$HELM_WAIT" = "1" ]; then
    HELM_EXTRA+=(--wait --timeout 5m)
  fi

  echo "==> Deploying with Helm (env=$ENV, tag=$IMAGE_TAG, source=$image_source)..."
  if ! helm upgrade --install widget-system helm/widget-system \
    $VALUES \
    --namespace widget-system \
    --create-namespace \
    "${HELM_SET[@]}" \
    "${HELM_EXTRA[@]}"; then
    show_pod_diagnostics
    exit 1
  fi

  echo "==> Deployment status:"
  kubectl get pods,svc,ingress -n widget-system
}

deploy_kubectl() {
  build_images
  load_images_to_cluster

  kubectl apply -f k8s/namespace.yaml
  kubectl apply -f k8s/demo-apps.yaml
  kubectl apply -f k8s/ingress.yaml

  kubectl rollout status deployment/demo-angular -n widget-system --timeout=120s
  kubectl rollout status deployment/demo-react -n widget-system --timeout=120s
  kubectl get pods,svc,ingress -n widget-system
}

case "$MODE" in
  ghcr)
    if [ -z "${GHCR_TOKEN:-}" ] && ! kubectl get secret ghcr-pull -n widget-system &>/dev/null; then
      echo "Note: ghcr-pull secret not found. For private packages run:"
      echo "  GHCR_TOKEN=ghp_xxx ./scripts/setup-ghcr-secret.sh"
      echo "Or make GHCR packages public (see docs/GHCR.md)."
      echo ""
    fi
    deploy_helm ghcr
    ;;
  helm-local)
    build_images
    load_images_to_cluster
    deploy_helm local
    ;;
  kubectl|helm)
    if [ "$MODE" = "helm" ]; then
      echo "Note: 'helm' mode renamed to 'ghcr'. Using GHCR deploy."
      deploy_helm ghcr
    else
      deploy_kubectl
    fi
    ;;
  -h|--help|help)
    usage
    ;;
  *)
    echo "Unknown mode: $MODE"
    usage
    exit 1
    ;;
esac

echo ""
echo "Done. http://widget-system.stortz.tech/"
