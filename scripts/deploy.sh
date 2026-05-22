#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

MODE="${1:-helm}"
ENV="${2:-dev}"
IMAGE_TAG="${IMAGE_TAG:-latest}"

usage() {
  cat <<EOF
Usage: $(basename "$0") [helm|kubectl] [dev|staging|prod]

  helm      Deploy demo apps with Helm (default)
  kubectl   Apply raw k8s manifests (local images)

Environment variables:
  IMAGE_TAG   Docker image tag (default: latest)
  KUBECONFIG  Path to kubeconfig (optional)

Examples:
  ./scripts/deploy.sh helm dev
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

deploy_helm() {
  VALUES="-f helm/widget-system/values.yaml"
  case "$ENV" in
    dev)     VALUES="$VALUES -f helm/widget-system/values-dev.yaml" ;;
    staging) VALUES="$VALUES -f helm/widget-system/values-staging.yaml" ;;
    prod)    VALUES="$VALUES -f helm/widget-system/values-prod.yaml" ;;
    *) echo "Unknown environment: $ENV"; exit 1 ;;
  esac

  echo "==> Deploying with Helm (env=$ENV, tag=$IMAGE_TAG)..."
  helm upgrade --install widget-system helm/widget-system \
    $VALUES \
    --namespace widget-system \
    --create-namespace \
    --set global.imageTag="$IMAGE_TAG" \
    --set demoAngular.image.repository="widget-system/demo-angular" \
    --set demoReact.image.repository="widget-system/demo-react" \
    --wait --timeout 5m

  echo "==> Deployment status:"
  kubectl get pods,svc,ingress -n widget-system
}

deploy_kubectl() {
  build_images

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
