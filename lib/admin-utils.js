/**
 * Helper to dispatch a custom event when the admin run changes
 * This allows components in the same window to react beyond just localStorage changes
 */
export const dispatchRunChange = (runId) => {
  if (typeof window !== 'undefined') {
    const event = new CustomEvent('admin_run_changed', { detail: { runId } });
    window.dispatchEvent(event);
  }
};
