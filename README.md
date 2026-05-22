# @cstortz/widget-system

Framework-agnostic widget layout system for web applications. Install once, use
in Angular, React, Vue, or plain HTML.

> **Vision:** See [Widget-System-Library.pptx](./Widget-System-Library.pptx)  
> **Implementation spec:** See [AGENTS-ui-widget-system.md](./AGENTS-ui-widget-system.md)

## Packages

| Package | Description |
|---------|-------------|
| `@cstortz/widget-system` | Pure TypeScript core — types, state machine, pluggable adapters |
| `@cstortz/widget-system-angular` | Angular 17+ standalone components and services |
| `@cstortz/widget-system-react` | React 18+ components and hooks |

## Quick start

```bash
npm install
npm run build
npm run test
```

Install in a consumer project (once published):

```bash
npm install @cstortz/widget-system-angular
```

## Monorepo structure

```
packages/
  core/       @cstortz/widget-system
  angular/    @cstortz/widget-system-angular
  react/      @cstortz/widget-system-react
apps/
  demo-angular/   Demo app (deployed to k8s)
  demo-react/     Demo app (deployed to k8s)
helm/widget-system/   Kubernetes Helm chart
k8s/                  Raw kubectl manifests
.github/workflows/    CI, release, deploy
docs/DEVOPS.md        DevOps guide
```

## What this library provides

From the product spec:

- **Widget registry** — register widget types by ID
- **Workspace state** — panel order, collapse state, widget config
- **Pluggable adapters** — HTTP, localStorage, or in-memory persistence
- **WorkspaceLayout** — two-panel CSS Grid with swap control
- **WidgetPanel** — collapsible panel wrapper with content projection
- **CSS custom properties** — style with any design system

## DevOps

Full guide: [docs/DEVOPS.md](./docs/DEVOPS.md)

| Workflow | Purpose |
|----------|---------|
| `.github/workflows/ci.yml` | Lint, build, test, Docker build, Helm lint |
| `.github/workflows/release.yml` | Changesets → npm publish |
| `.github/workflows/deploy.yml` | Build images → Helm deploy to k8s |

Local deploy:

```bash
chmod +x scripts/deploy.sh
./scripts/deploy.sh helm dev
```

## Releasing

```bash
npm run changeset          # describe your change
# commit, merge PR
# Release workflow opens "Version Packages" PR
# merge that PR → packages publish to npm
```

Requires `NPM_TOKEN` secret in GitHub.

## GitHub repo

Remote: `git@github.com:cstortz/ui_widget_npm_lib.git`

After pushing, configure secrets (`NPM_TOKEN`, `KUBE_CONFIG`) and GitHub
Environments (`dev`, `staging`, `prod`) per [docs/DEVOPS.md](./docs/DEVOPS.md).

## License

AGPL-3.0-or-later — see [LICENSE](./LICENSE).
