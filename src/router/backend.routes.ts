// A tiny mapping of frontend pages to backend routes.
// Keep this file minimal and authoritative for the demo frontend. When backend
// routes change, update these values so the frontend can discover the right
// endpoints without searching the codebase.

const BACKEND_ROUTES = {
  accountsReceivables: {
    invoices: '/api/v1/accounts-receivables/invoices',
    collectionsScan: '/api/v1/accounts-receivables/collections/scan',
    collectionsScheduled: '/api/v1/accounts-receivables/collections/scheduled',
    draftEmail: '/api/v1/accounts-receivables/draft-email',
    status: '/api/v1/accounts-receivables/status',
  },
  admin: {
    tools: '/api/v1/admin/tools',
    audit: '/api/v1/admin/audit',
    providersCapabilities: '/api/v1/admin/providers/capabilities',
  },
  google: {
    status: '/api/v1/google/status',
    authStart: '/api/v1/google/auth/start',
    connect: '/api/v1/google/connect',
    authComplete: '/api/v1/google/auth/complete',
  },
  agents: {
    status: '/api/v1/agents/status',
  },
  xero: {
    organisations: '/api/v1/xero/organisations',
    integrationStatus: '/api/v1/xero/integration/status',
  },
  cashflow: '/api/v1/cashflow',
  health: {
    ping: '/api/v1/healthcheck',
  },
};

export default BACKEND_ROUTES;
