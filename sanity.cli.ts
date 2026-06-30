import {defineCliConfig} from 'sanity/cli'

export default defineCliConfig({
  api: {
    projectId: process.env.SANITY_STUDIO_PROJECT_ID,
    dataset: process.env.SANITY_STUDIO_DATASET || 'production'
  },
  // NOTE: `studioHost` is deprecated and intentionally omitted here.
  // Branch-based deployments instead pass the hostname per-invocation via
  // `sanity deploy --url <hostname>` (see .github/workflows/studio-deploy.yml
  // and scripts/undeploy-studio.mjs for the matching cleanup step).
  deployment: {
    /**
     * Enable auto-updates for studios.
     * Learn more at https://www.sanity.io/docs/studio/latest-version-of-sanity#k47faf43faf56
     */
    autoUpdates: true,
  }
})
