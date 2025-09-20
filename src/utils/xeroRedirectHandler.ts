// This file is deprecated - OAuth handling is now done via XeroOAuthCallback.tsx component
/**
 * @deprecated Use XeroOAuthCallback.tsx component instead
 * Legacy OAuth redirect handler - kept for compatibility but should be replaced
 */
export default async function handleXeroRedirect(): Promise<boolean> {
  console.warn('handleXeroRedirect is deprecated. Use XeroOAuthCallback.tsx component instead.');
  return false;
}
