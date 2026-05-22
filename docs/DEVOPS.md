# Widget System — DevOps Guide

This document covers GitHub Actions, Helm, and kubectl workflows for the
`ui_widget_npm_lib` monorepo.

## Prerequisites

| Tool | Version | Purpose |
|------|---------|---------|
| Node.js | 20+ | Build packages and demo apps |
| npm | 10+ | Workspace management |
| Docker | 24+ | Demo app container images |
| kubectl | 1.28+ | Cluster access |
| Helm | 3.16+ | Chart-based deployments |

## Repository layout

```
.github/workflows/     CI, release, and deploy pipelines
helm/widget-system/    Helm chart for demo apps
k8s/                   Raw kubectl manifests (local dev fallback)
scripts/               deploy.sh, undeploy.sh
packages/              npm publishable libraries
apps/                  Demo apps (deployed to k8s)
```

## GitHub Actions

### CI (`ci.yml`)

Runs on every push and pull request to `main`:

1. **build-and-test** — `npm ci`, lint, build, test
2. **docker-build** — builds demo Docker images (no push)
3. **helm-lint** — `helm lint` and `helm template` dry-run

### Release (`release.yml`)

Uses [Changesets](https://github.com/changesets/changesets) to version and
publish npm packages:

- `@ncs_software/widget-system`
- `@ncs_software/widget-system-angular`
- `@ncs_software/widget-system-react`

**Required secrets:**
- `NPM_TOKEN` — npm automation token with publish access
- `GH_PAT` (optional) — GitHub PAT if Actions cannot create PRs (see below)

Workflow:
1. Developer runs `npm run changeset` and commits the changeset file
2. On merge to `main`, the action opens a "Version Packages" PR
3. Merging that PR triggers `npm run release` to publish

#### Fix: "Actions is not permitted to create or approve pull requests"

Enable in **Settings → Actions → General → Workflow permissions**:

1. Select **Read and write permissions**
2. Check **Allow GitHub Actions to create and approve pull requests**

Then re-run the failed Release workflow (Actions → Release → Re-run jobs).

**Alternative:** Add a classic PAT as secret `GH_PAT` with `repo` scope. The
Release workflow uses `GH_PAT` when present instead of `GITHUB_TOKEN`.

**Fallback (no PR):** Version locally, push, then publish manually:

```bash
npm run version-packages
git add . && git commit -m "chore: version packages" && git push origin main
```

Then either:
- Actions → **Publish to npm (manual)** → Run workflow, or
- Locally: `NPM_TOKEN=... npm run release`

### Deploy (`deploy.yml`)

Builds and pushes demo images to GitHub Container Registry, then deploys
via Helm.

**Triggers:**
- Manual (`workflow_dispatch`) with environment choice: dev / staging / prod
- Auto on push to `main` when `apps/`, `helm/`, or the workflow changes

**Required secret:** `KUBE_CONFIG` — kubeconfig for the target cluster (see below).

Set `KUBE_CONFIG` at **repo level** or on the **dev** environment (Settings →
Environments → dev → Environment secrets).

**Option A — paste raw kubeconfig (easiest)**

Copy the entire contents of `~/.kube/config` into the secret (including
`apiVersion`, `clusters`, `contexts`, `users`).

**Option B — base64-encoded**

```bash
# Linux
base64 -w0 < ~/.kube/config

# macOS
base64 < ~/.kube/config | tr -d '\n'
```

Paste the single-line output into the `KUBE_CONFIG` secret.

**Private LAN clusters (192.168.x.x)**

GitHub-hosted runners cannot reach a control plane on a private IP. The **deploy**
job uses `runs-on: self-hosted` so it runs on a machine on your network (e.g.
`dev01`).

1. Register a self-hosted runner on dev01:
   - Repo → **Settings → Actions → Runners → New self-hosted runner**
   - Follow the Linux install steps on dev01
2. Ensure **kubectl** and **helm** are installed on dev01
3. Either keep `KUBE_CONFIG` in GitHub secrets **or** rely on `~/.kube/config`
   already on dev01

**Deploy without GitHub Actions (immediate option on dev01):**

```bash
cd ~/repos/ui_widget_npm_lib/ui_widget_npm_lib
./scripts/deploy.sh helm dev
```

**Common mistakes**

- Pasting only part of the file
- Extra quotes around the value
- Using a local-only cluster (minikube/kind) that GitHub runners cannot reach

**GitHub environments:** Create `dev`, `staging`, and `prod` environments in
repo Settings → Environments. Add environment-specific secrets and optional
approval gates for prod.

## GitHub setup checklist

1. Push this repo to `github.com/cstortz/ui_widget_npm_lib`
2. Enable GitHub Actions (Settings → Actions)
3. Enable GitHub Packages for container images
4. Add repository secrets:
   - `NPM_TOKEN` — for npm publish
   - `GH_PAT` — (optional) classic PAT with `repo` scope if Release cannot open PRs
   - `KUBE_CONFIG` — full `~/.kube/config` YAML **or** base64-encoded (see Deploy section)
5. **Settings → Actions → General → Workflow permissions:**
   - Read and write permissions
   - ✅ Allow GitHub Actions to create and approve pull requests
6. Create GitHub Environments: `dev`, `staging`, `prod`
7. (Optional) Add branch protection on `main`

## Local development

```bash
cd /home/cstortz/repos/ui_widget_npm_lib/ui_widget_npm_lib

# Install and build
npm install
npm run build

# Run tests
npm run test
```

## Deploy with Helm (recommended)

```bash
chmod +x scripts/deploy.sh scripts/undeploy.sh

# Build images and deploy to dev
./scripts/deploy.sh helm dev

# Custom tag
IMAGE_TAG=$(git rev-parse --short HEAD) ./scripts/deploy.sh helm dev
```

Verify:

```bash
kubectl get all -n widget-system
curl http://widget-system.stortz.tech/angular
```

Point internal DNS `widget-system.stortz.tech` at your ingress controller IP.

## Deploy with kubectl (raw manifests)

For clusters where you load images locally (kind, minikube):

```bash
# Load images into kind (example)
kind load docker-image widget-system/demo-angular:latest
kind load docker-image widget-system/demo-react:latest

./scripts/deploy.sh kubectl
```

## Undeploy

```bash
./scripts/undeploy.sh all      # remove Helm release + k8s resources
./scripts/undeploy.sh helm     # Helm only
./scripts/undeploy.sh kubectl  # raw manifests only
```

## Helm values per environment

| File | Environment | Notes |
|------|-------------|-------|
| `values.yaml` | Base defaults | Shared config |
| `values-dev.yaml` | Development | Single replica, `widget-system.stortz.tech` |
| `values-staging.yaml` | Staging | 2 replicas |
| `values-prod.yaml` | Production | 3 replicas, TLS via cert-manager |

Override at deploy time:

```bash
helm upgrade --install widget-system helm/widget-system \
  -f helm/widget-system/values.yaml \
  -f helm/widget-system/values-dev.yaml \
  --set global.imageTag=abc123 \
  --namespace widget-system --create-namespace
```

## Useful kubectl commands

```bash
# Watch pods
kubectl get pods -n widget-system -w

# Logs
kubectl logs -f deployment/demo-angular -n widget-system
kubectl logs -f deployment/demo-react -n widget-system

# Port-forward (bypass ingress)
kubectl port-forward svc/demo-angular 8080:80 -n widget-system
kubectl port-forward svc/demo-react 8081:80 -n widget-system

# Restart deployments
kubectl rollout restart deployment/demo-angular -n widget-system
```

## What gets deployed

The Helm chart and k8s manifests deploy **demo apps** that showcase the
widget system. The npm packages themselves are published to npm, not
deployed to Kubernetes.

Future additions (when the widget state API backend is built):

- Add a `widget-api` subchart or deployment
- Wire demo apps to the API via ConfigMap env vars
- See `AGENTS-ui-widget-system.md` for the API contract

## Troubleshooting

| Problem | Fix |
|---------|-----|
| `npm ci` fails in CI | Run `npm install` locally and commit `package-lock.json` |
| Image pull errors | Ensure GHCR package visibility or use local images with `kubectl` mode |
| Ingress 404 | Check `/etc/hosts`, ingress controller installed, and host in values |
| Helm `--wait` timeout | `kubectl describe pod -n widget-system` for events |
| NPM publish E404 on `@ncs_software/*` | Your npm account must **own the `@ncs_software` scope** — see below |

### npm publish E404 — scope ownership

npm returns **404 Not Found** (not 403) when you try to publish to a scope you
don't own. Fix one of these:

**Option A — your npm username is `cstortz`**

1. Confirm at [npmjs.com/settings/profile](https://www.npmjs.com/settings/profile)
2. Create a new **Automation** token (not Read-only):
   - Access token → Generate New Token → **Classic** → **Automation**
3. Replace the `NPM_TOKEN` secret in GitHub with the new token
4. Re-run Release or **Publish to npm (manual)**

**Option B — your npm username is different (e.g. `myuser`)**

Either create an npm **organization** named `cstortz`:

1. [npmjs.com/org/create](https://www.npmjs.com/org/create) → name it `cstortz`
2. Regenerate `NPM_TOKEN` from the org owner account

Or rename packages to your username scope (`@myuser/widget-system`) — ask to
update the repo if you want this.

**Option C — Granular Access Token**

If using a fine-grained token, it must include:

- **Packages and scopes:** Read and write
- **Organizations:** access to `@ncs_software` (or select the org)

**Verify locally before CI:**

```bash
npm whoami                    # must show the account that owns @ncs_software
npm publish --dry-run --workspace=@ncs_software/widget-system
```
