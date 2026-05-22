#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

MODE="${1:-helm}"
ENV="${2:-dev}"
IMAGE_TAG="${IMAGE_TAG:-latest}"
HELM_WAIT="${HELM_WAIT:-1}"

usage() {
  cat <<EOF
Usage: $(basename "$0") [helm|kubectl] [dev|staging|prod]

  helm      Deploy demo apps with Helm (default)
  kubectl   Apply raw k8s manifests (local images)

Environment variables:
  IMAGE_TAG   Docker image tag (default: latest)
  HELM_WAIT   Wait for pods to become ready: 1 (default) or 0
  KUBECONFIG  Path to kubeconfig (optional)

Examples:
  ./scripts/deploy.sh helm dev
  HELM_WAIT=0 ./scripts/deploy.sh helm dev    # skip wait — debug ImagePull issues
  IMAGE_TAG=\$(git rev-parse --short HEAD) ./scripts/deploy.sh helm dev
  ./scripts/deploy.sh kubectl
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
  echo "==> Loading local images into Kubernetes container runtime..."
  for img in "widget-system/demo-angular:${IMAGE_TAG}" "widget-system/demo-react:${IMAGE_TAG}"; do
    if command -v ctr >/dev/null 2>&1; then
      docker save "$img" | sudo ctr -n k8s.io images import -
    elif command -v nerdctl >/dev/null 2>&1; then
      docker save "$img" | sudo nerdctl -n k8s.io load
    else
      echo "Warning: ctr/nerdctl not found. Cluster nodes must pull images from a registry,"
      echo "         or install containerd import tools on the node."
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
  echo "Common fixes:"
  echo "  ImagePullBackOff + local images:  run this script again (imports via ctr)"
  echo "  ImagePullBackOff + ghcr.io:       make GHCR packages public or add ghcr-pull secret"
  echo "  Debug without waiting:            HELM_WAIT=0 ./scripts/deploy.sh helm dev"
}

deploy_helm() {
  VALUES="-f helm/widget-system/values.yaml"
  HELM_EXTRA=()
  case "$ENV" in
    dev)
      VALUES="$VALUES -f helm/widget-system/values-dev.yaml"
      HELM_EXTRA+=(--set-json 'global.imagePullSecrets=[]')
      HELM_EXTRA+=(--set "global.imagePullPolicy=IfNotPresent")
      ;;
    staging) VALUES="$VALUES -f helm/widget-system/values-staging.yaml" ;;
    prod)    VALUES="$VALUES -f helm/widget-system/values-prod.yaml" ;;
    *) echo "Unknown environment: $ENV"; exit 1 ;;
  esac

  if [ "$HELM_WAIT" = "1" ]; then
    HELM_EXTRA+=(--wait --timeout 5m)
  fi

  echo "==> Deploying with Helm (env=$ENV, tag=$IMAGE_TAG)..."
  if ! helm upgrade --install widget-system helm/widget-system \
    $VALUES \
    --namespace widget-system \
    --create-namespace \
    --set global.imageTag="$IMAGE_TAG" \
    --set demoAngular.image.repository="widget-system/demo-angular" \
    --set demoReact.image.repository="widget-system/demo-react" \
    "${HELM_EXTRA[@]}"; then
    show_pod_diagnostics
    exit 1
  fi

  echo "==> Deployment status:"
  kubectl get pods,svc,ingress -n widget-system

  if ! kubectl wait --for=condition=ready pod \
    -l app.kubernetes.io/part-of=widget-system \
    -n widget-system --timeout=30s 2>/dev/null; then
    show_pod_diagnostics
  fi
}

deploy_kubectl() {
  build_images
  load_images_to_cluster

  echo "==> Applying k8s manifests..."
  kubectl apply -f k8s/namespace.yaml
  kubectl apply -f k8s/demo-apps.yaml
  kubectl apply -f k8s/ingress.yaml

  echo "==> Waiting for rollouts..."
  kubectl rollout status deployment/demo-angular -n widget-system --timeout=120s
  kubectl rollout status deployment/demo-react -n widget-system --timeout=120s

  kubectl get pods,svc,ingress -n widget-system
}

case "$MODE" in
  helm)
    build_images
    load_images_to_cluster
    deploy_helm
    ;;
  kubectl)
    deploy_kubectl
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
echo "Done. Ensure internal DNS resolves widget-system.stortz.tech to your ingress IP."
