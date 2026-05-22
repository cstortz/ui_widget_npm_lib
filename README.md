# @ncs_software/widget-system

Framework-agnostic widget layout system for web applications. Install once, use
in Angular, React, Vue, or plain HTML.

| Resource | Description |
|----------|-------------|
| [Widget-System-Library.pptx](./Widget-System-Library.pptx) | Product vision and npm package strategy |
| [AGENTS-ui-widget-system.md](./AGENTS-ui-widget-system.md) | Implementation spec (types, API, components) |
| [docs/DEVOPS.md](./docs/DEVOPS.md) | GitHub Actions, Helm, kubectl details |
| [docs/GHCR.md](./docs/GHCR.md) | Container registry setup |

---

## Packages (npm)

Published under the **`@ncs_software`** org on npm:

| Package | Description |
|---------|-------------|
| `@ncs_software/widget-system` | Pure TypeScript core — types, adapters, workspace state |
| `@ncs_software/widget-system-angular` | Angular 17+ standalone components and services |
| `@ncs_software/widget-system-react` | React 18+ components and hooks |

```bash
npm install
npm run build
npm run test
```

---

## Repository layout

```
packages/core|angular|react/   npm libraries
apps/demo-angular|demo-react/  static demo apps (nginx → k8s)
helm/widget-system/            Helm chart
k8s/                           raw kubectl manifests (fallback)
.github/workflows/             CI, Release, Deploy
scripts/                       deploy, GHCR secret, debug, fix-helm-stuck
docs/                          DEVOPS.md, GHCR.md
```

**Git remote:** `git@github.com:cstortz/ui_widget_npm_lib.git`

**Clone path on dev01:** `~/repos/ui_widget_npm_lib/ui_widget_npm_lib`

---

## Infrastructure overview

This is how the pieces fit together:

```
GitHub Actions (ubuntu-latest)     build + push images → GHCR
        │
        ▼
ghcr.io/cstortz/ui_widget_npm_lib/demo-angular|demo-react
        │
        ▼
GitHub Actions (self-hosted on dev01)     helm deploy → private k8s cluster
        │
        ▼
Cluster nodes (kub01, kub02, kub03, …)    pull images from GHCR
        │
        ▼
nginx ingress controller                  routes by hostname
        │
        ▼
Internal DNS                            dev.stortz.tech / int.stortz.tech
```

| Component | Details |
|-----------|---------|
| **Cluster** | Private LAN (`192.168.68.x`), control plane e.g. `192.168.68.21:6443` |
| **Deploy runner** | Self-hosted GitHub Actions runner on **dev01** (required — cloud runners cannot reach the cluster) |
| **Images** | GHCR — all nodes pull the same registry (no per-node `docker import`) |
| **Namespace** | `widget-system` |
| **Ingress class** | `nginx` |

---

## URLs and DNS zones

| Environment | URL | DNS zone |
|-------------|-----|----------|
| **dev** | http://widget-system.dev.stortz.tech/ | `dev.stortz.tech` |
| **dev** (angular path) | http://widget-system.dev.stortz.tech/angular | |
| **dev** (react path) | http://widget-system.dev.stortz.tech/react | |
| **staging** | http://widget-system.staging.dev.stortz.tech/ | `dev.stortz.tech` |
| **prod** | http://widget-system.int.stortz.tech/ | `int.stortz.tech` |

### DNS records

Point each hostname at your **ingress controller IP** (not the Kubernetes API port 6443):

```bash
kubectl get svc -n ingress-nginx ingress-nginx-controller -o wide
```

Example records:

```
widget-system.dev.stortz.tech   A   <ingress-ip>    # zone: dev.stortz.tech
widget-system.int.stortz.tech   A   <ingress-ip>    # zone: int.stortz.tech (prod)
```

Clients must use internal DNS (same LAN or VPN). No Windows `hosts` file needed when DNS is correct.

---

## One-time setup checklist

### GitHub repository

1. **Settings → Actions → General → Workflow permissions**
   - Read and write permissions
   - ✅ Allow GitHub Actions to create and approve pull requests

2. **Repository secrets** (Settings → Secrets → Actions)

   | Secret | Purpose |
   |--------|---------|
   | `NPM_TOKEN` | npm Automation token for `@ncs_software/*` publish |
   | `GH_PAT` | Classic PAT with `repo` scope (if Release cannot open PRs) |
   | `KUBE_CONFIG` | Full `~/.kube/config` YAML **or** base64-encoded |
   | `GHCR_TOKEN` | (Optional) PAT with `read:packages` for private GHCR pulls |

3. **Environments:** `dev`, `staging`, `prod` (Settings → Environments)

4. **Self-hosted runner on dev01**
   - Settings → Actions → Runners → New self-hosted runner → Linux
   - Install on dev01; runner must show **Idle**
   - Install `kubectl` and `helm` on dev01

### npm (`@ncs_software` org)

- Packages publish to **`@ncs_software/widget-system`*** 
- `NPM_TOKEN` must be from an account with publish access to the **`ncs_software`** org
- If publish fails with **404**, the token does not own that scope — see [Troubleshooting](#troubleshooting)

### GHCR (container images)

Images:

```
ghcr.io/cstortz/ui_widget_npm_lib/demo-angular:latest
ghcr.io/cstortz/ui_widget_npm_lib/demo-react:latest
```

**Option A — public packages (simplest):** GitHub → Packages → each package → **Public**

**Option B — private packages:**

```bash
GHCR_TOKEN=ghp_xxx ./scripts/setup-ghcr-secret.sh
```

Creates `ghcr-pull` secret in `widget-system` namespace (all nodes use it).

---

## Day-to-day operations

### Deploy to dev

**Via GitHub Actions (recommended):**

Actions → **Deploy** → Run workflow → environment: **dev**

**Via dev01 shell:**

```bash
cd ~/repos/ui_widget_npm_lib/ui_widget_npm_lib
git pull
./scripts/deploy.sh ghcr dev
```

### Verify deployment

```bash
kubectl get pods,svc,ingress -n widget-system
./scripts/debug-ingress.sh widget-system.dev.stortz.tech
curl -I http://widget-system.dev.stortz.tech/
```

### Publish npm packages

```bash
npm run changeset          # describe change, commit, push to main
# Merge the "Version Packages" PR opened by Release workflow
# Or: Actions → Publish to npm (manual)
```

### Undeploy

```bash
./scripts/undeploy.sh all
```

---

## Scripts reference

| Script | Purpose |
|--------|---------|
| `./scripts/deploy.sh ghcr dev` | Deploy using GHCR images (default, multi-node) |
| `./scripts/deploy.sh helm-local dev` | Build on dev01 + import to containerd (single-node only) |
| `./scripts/deploy.sh kubectl` | Raw k8s manifests + local images |
| `./scripts/setup-ghcr-secret.sh` | Create `ghcr-pull` secret for private GHCR |
| `./scripts/fix-helm-stuck.sh` | Clear pending Helm release after interrupted deploy |
| `./scripts/debug-ingress.sh [host]` | DNS, ingress, and backend connectivity checks |
| `./scripts/undeploy.sh [all\|helm\|kubectl]` | Remove deployments |

Environment variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `IMAGE_TAG` | `latest` | Container image tag |
| `HELM_WAIT` | `1` | Wait for pods (`0` to skip — useful for debugging) |
| `GHCR_TOKEN` | — | PAT for `setup-ghcr-secret.sh` |

---

## GitHub Actions workflows

| Workflow | Trigger | Runs on | Purpose |
|----------|---------|---------|---------|
| **CI** | Push / PR to `main` | `ubuntu-latest` | Lint, build, test, Docker build, Helm lint |
| **Release** | Push to `main` | `ubuntu-latest` | Changesets → Version Packages PR → npm publish |
| **Publish to npm (manual)** | Manual | `ubuntu-latest` | Publish without Changesets PR |
| **Deploy** | Manual or push to `apps/`, `helm/` | build: `ubuntu-latest`, deploy: **`self-hosted`** | Push to GHCR + Helm deploy |

Deploy job automatically:

- Clears stuck Helm releases
- Creates `ghcr-pull` secret
- Applies Helm chart with environment-specific values

---

## Helm environments

| Values file | Hostname | Replicas | Notes |
|-------------|----------|----------|-------|
| `values.yaml` | base / prod host | 1 | Shared defaults |
| `values-dev.yaml` | `widget-system.dev.stortz.tech` | 1 | Path rewrite for `/angular`, `/react` |
| `values-staging.yaml` | `widget-system.staging.dev.stortz.tech` | 2 | |
| `values-prod.yaml` | `widget-system.int.stortz.tech` | 3 | TLS via cert-manager |

---

## Troubleshooting

### Deploy stuck: "Waiting for a runner"

No self-hosted runner online. Check **Settings → Actions → Runners** on dev01.

### Helm: "another operation is in progress"

```bash
./scripts/fix-helm-stuck.sh
./scripts/deploy.sh ghcr dev
```

### Pods: `ImagePullBackOff`

Cluster cannot pull images.

```bash
kubectl describe pod -n widget-system -l app.kubernetes.io/name=demo-angular
```

| Image prefix | Fix |
|--------------|-----|
| `ghcr.io/...` | Make GHCR packages public or run `setup-ghcr-secret.sh` |
| `widget-system/...` | Wrong mode — use `./scripts/deploy.sh ghcr dev` not local-only images on multi-node cluster |

### Page does not load but pods are Running

```bash
./scripts/debug-ingress.sh widget-system.dev.stortz.tech
```

| Check | Command |
|-------|---------|
| DNS resolves? | `nslookup widget-system.dev.stortz.tech` |
| Ingress IP correct? | `kubectl get svc -n ingress-nginx` |
| Backend OK? | `kubectl port-forward svc/demo-angular 8080:80 -n widget-system` |
| Ingress OK? | `curl -H "Host: widget-system.dev.stortz.tech" http://<ingress-ip>/` |

DNS must point to **ingress IP on port 80**, not the Kubernetes API (`:6443`).

### Release: "Actions not permitted to create pull requests"

Enable **Allow GitHub Actions to create and approve pull requests** in repo settings, or add `GH_PAT` secret.

### npm publish: `E404 Not Found`

npm scope mismatch. Packages are `@ncs_software/*` — token must have publish access to the **`ncs_software`** org.

```bash
npm whoami
npm publish --dry-run --workspace=@ncs_software/widget-system
```

### Useful kubectl commands

```bash
kubectl get pods -n widget-system -w
kubectl logs -f deployment/demo-angular -n widget-system
kubectl rollout restart deployment/demo-angular -n widget-system
kubectl get events -n widget-system --sort-by='.lastTimestamp' | tail -20
```

---

## What gets deployed vs published

| Artifact | Destination |
|----------|-------------|
| `@ncs_software/widget-system*` packages | **npm** (via Release workflow) |
| Demo Angular / React apps | **Kubernetes** (via Deploy workflow / Helm) |

The widget state API backend (`/api/widgets/*`) is not deployed yet — see
[AGENTS-ui-widget-system.md](./AGENTS-ui-widget-system.md) for the planned contract.

---

## License

AGPL-3.0-or-later — see [LICENSE](./LICENSE).
