# Branch-Based Studio Deployment POC

A proof of concept demonstrating automatic Sanity Studio deployment and cleanup based on Git branches.

## What This Does

This project automatically:

- **🚀 Deploys a new Sanity Studio** when you push to any branch
- **🗑️ Removes the Studio** when the branch is deleted (including after PR merges)

Each branch gets its own isolated Studio instance at a unique URL based on the branch name.

## Setup

This repo has no project ID hardcoded — configure your own:

1. **Repository variable**: `SANITY_STUDIO_PROJECT_ID` → your Sanity project ID (Settings → Secrets and variables → Actions → Variables)
2. **Repository secret**: `SANITY_AUTH_TOKEN` → a deploy token from [sanity.io/manage](https://sanity.io/manage) (Settings → Secrets and variables → Actions → Secrets)
3. **Local development**: copy `.env.example` to `.env` (or export the vars in your shell) with your project ID and dataset

## How It Works

| Branch Name | Studio URL |
|-------------|------------|
| `main` | `branchdeletionpoc-main.sanity.studio` |
| `feature/new-design` | `branchdeletionpoc-feature-new-design.sanity.studio` |
| `fix/bug-123` | `branchdeletionpoc-fix-bug-123.sanity.studio` |

The GitHub Action workflow (`.github/workflows/studio-deploy.yml`) handles:

1. **On push**: Sanitizes the branch name → deploys to `branchdeletionpoc-{branch}.sanity.studio` via `sanity deploy --url <hostname>`
2. **On branch delete**: Undeploys the corresponding Studio via a small API script (`scripts/undeploy-studio.mjs`)

## Why not `studioHost`?

`studioHost` in `sanity.cli.ts` is deprecated. This project instead passes
the per-branch hostname at deploy time with `sanity deploy --url <hostname>`,
so nothing branch-specific is persisted in config.

That introduces one wrinkle: **`sanity undeploy` doesn't support a `--url`
flag** — it only knows what to remove via `studioHost` or
`deployment.appId` in `sanity.cli.ts`. Since neither is set, the cleanup job
instead calls the same internal "user-applications" API that the Sanity CLI
itself uses for `deploy`/`undeploy`, but looks the deployment up by hostname:

1. `GET /projects/{projectId}/user-applications?appHost={hostname}&appType=studio` to find the deployment's ID
2. `DELETE /user-applications/{id}?appType=studio` to remove it

See `scripts/undeploy-studio.mjs`. It needs `SANITY_AUTH_TOKEN` (the same
deploy token already used for the deploy job) and `SANITY_STUDIO_PROJECT_ID`,
and has no extra dependencies, so the cleanup job doesn't even need to
install packages.

## Use Cases

This pattern is useful for:

- **Preview environments**: Give each feature branch its own Studio for testing
- **PR reviews**: Reviewers can access a dedicated Studio for the branch
- **Ephemeral environments**: Studios are automatically cleaned up when branches are deleted

## Limitations

- Sanity hostnames must start with a letter
- Branch names are sanitized (lowercased, special chars replaced with hyphens)
- Hostname length is limited, so very long branch names get truncated
