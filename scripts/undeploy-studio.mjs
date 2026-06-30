#!/usr/bin/env node
/**
 * Undeploy a Sanity-hosted Studio by hostname, without relying on the
 * deprecated `studioHost` CLI config property.
 *
 * Why this exists:
 * `sanity undeploy` has no `--url`/`--host` flag — it only resolves which
 * studio to remove via `studioHost` or `deployment.appId` in sanity.cli.ts.
 * Since this project deploys with `sanity deploy --url <hostname>` (and no
 * longer keeps a studioHost in config), `sanity undeploy` has nothing to go
 * on. This script calls the same "user-applications" API that the Sanity
 * CLI itself uses internally for both `deploy` and `undeploy`, looking the
 * deployment up by hostname instead.
 *
 * Usage:
 *   node scripts/undeploy-studio.mjs <hostname>
 *
 * Required env vars:
 *   SANITY_AUTH_TOKEN          - deploy token (same one used for `sanity deploy`)
 *   SANITY_STUDIO_PROJECT_ID   - your Sanity project ID
 */

const API_VERSION = 'v2024-08-01'
const API_HOST = process.env.SANITY_API_HOST || 'https://api.sanity.io'

const projectId = process.env.SANITY_STUDIO_PROJECT_ID || process.env.SANITY_PROJECT_ID
const token = process.env.SANITY_AUTH_TOKEN
const hostname = process.argv[2]

function fail(message) {
  console.error(`❌ ${message}`)
  process.exit(1)
}

if (!hostname) {
  fail('Usage: node scripts/undeploy-studio.mjs <hostname>')
}

if (!projectId) {
  fail('SANITY_STUDIO_PROJECT_ID environment variable is required')
}

if (!token) {
  fail('SANITY_AUTH_TOKEN environment variable is required')
}

async function apiRequest(path, options = {}) {
  const res = await fetch(`${API_HOST}/${API_VERSION}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })
  return res
}

async function main() {
  console.log(`🔎 Looking up studio deployment for "${hostname}"...`)

  const lookupRes = await apiRequest(
    `/projects/${projectId}/user-applications?appHost=${encodeURIComponent(hostname)}&appType=studio`,
  )

  if (lookupRes.status === 404) {
    console.log(`ℹ️  No deployment found for "${hostname}". Nothing to undeploy.`)
    return
  }

  if (!lookupRes.ok) {
    const body = await lookupRes.text()
    fail(`Lookup failed (${lookupRes.status}): ${body}`)
  }

  const userApplication = await lookupRes.json()

  if (!userApplication || !userApplication.id) {
    console.log(`ℹ️  No deployment found for "${hostname}". Nothing to undeploy.`)
    return
  }

  console.log(`🗑️  Found deployment (id: ${userApplication.id}). Undeploying...`)

  const deleteRes = await apiRequest(
    `/user-applications/${userApplication.id}?appType=studio`,
    {method: 'DELETE'},
  )

  if (!deleteRes.ok && deleteRes.status !== 404) {
    const body = await deleteRes.text()
    fail(`Undeploy failed (${deleteRes.status}): ${body}`)
  }

  console.log(`✅ Studio "${hostname}.sanity.studio" undeploy scheduled.`)
}

main().catch((err) => fail(err?.message || String(err)))
