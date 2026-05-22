# GitHub Container Registry (GHCR) Setup

Images for demo apps are published to:

```
ghcr.io/cstortz/ui_widget_npm_lib/demo-angular:<tag>
ghcr.io/cstortz/ui_widget_npm_lib/demo-react:<tag>
```

Every Kubernetes node (kub01, kub02, kub03, …) pulls from GHCR — no per-node `docker import`.

## 1. Push images (GitHub Actions)

**Actions → Deploy → Run workflow → dev**

This job:

1. Builds images on GitHub-hosted runners
2. Pushes to GHCR (`:latest` and `:<git-sha>`)
3. Deploys via Helm on your self-hosted runner (dev01)

Or push manually on dev01:

```bash
echo "$GHCR_TOKEN" | docker login ghcr.io -u cstortz --password-stdin

cd ~/repos/ui_widget_npm_lib/ui_widget_npm_lib
npm ci && npm run build --workspace=demo-angular && npm run build --workspace=demo-react

docker build -f apps/demo-angular/Dockerfile \
  -t ghcr.io/cstortz/ui_widget_npm_lib/demo-angular:latest .
docker build -f apps/demo-react/Dockerfile \
  -t ghcr.io/cstortz/ui_widget_npm_lib/demo-react:latest .

docker push ghcr.io/cstortz/ui_widget_npm_lib/demo-angular:latest
docker push ghcr.io/cstortz/ui_widget_npm_lib/demo-react:latest
```

Token needs **`write:packages`** (classic) or Packages write (fine-grained).

## 2. Allow the cluster to pull

Choose **one**:

### Option A — Public packages (simplest)

For each package on GitHub:

1. **Packages** → `demo-angular` / `demo-react`
2. **Package settings** → **Change visibility** → **Public**

No pull secret required.

### Option B — Private packages + pull secret

Create a PAT with **`read:packages`**.

Add to GitHub repo secrets as **`GHCR_TOKEN`** (optional — Actions can use `GITHUB_TOKEN` for same-repo packages).

On dev01 (once):

```bash
cd ~/repos/ui_widget_npm_lib/ui_widget_npm_lib
chmod +x scripts/setup-ghcr-secret.sh
GHCR_TOKEN=ghp_xxxx ./scripts/setup-ghcr-secret.sh
```

This creates `ghcr-pull` in the `widget-system` namespace. All nodes use it automatically.

## 3. Deploy with Helm

```bash
cd ~/repos/ui_widget_npm_lib/ui_widget_npm_lib
git pull
./scripts/deploy.sh ghcr dev
```

Custom tag:

```bash
IMAGE_TAG=abc123def ./scripts/deploy.sh ghcr dev
```

## 4. Verify

```bash
kubectl get pods -n widget-system -o wide
kubectl describe pod -n widget-system -l app.kubernetes.io/name=demo-angular | grep -i image
curl -I http://widget-system.dev.stortz.tech/
```

Pods should show:

```
Image: ghcr.io/cstortz/ui_widget_npm_lib/demo-angular:latest
```

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| `pull access denied` | Run `setup-ghcr-secret.sh` or make packages public |
| `manifest unknown` | Run Deploy workflow first to push images |
| Pod on kub03 fails, dev01 OK | GHCR fixes this — all nodes pull from registry |
| Actions deploy secret fails | Add `GHCR_TOKEN` secret; ensure `packages: read` permission |

## GitHub secrets summary

| Secret | Purpose |
|--------|---------|
| `GHCR_TOKEN` | (Optional) PAT with `read:packages` for cluster pull secret |
| `GITHUB_TOKEN` | Auto — used by Actions to push/pull same-repo packages |
| `KUBE_CONFIG` | Cluster access for deploy job |
