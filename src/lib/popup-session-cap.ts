const SESSION_POPUP_KEY = 'kidszone-session-popup:v1';

/** Returns true if a global popup may show this browser session (one per session). */
export function canShowSessionPopup(popupId: string): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const raw = sessionStorage.getItem(SESSION_POPUP_KEY);
    const shown: string[] = raw ? JSON.parse(raw) : [];
    return !shown.includes(popupId);
  } catch {
    return true;
  }
}

export function markSessionPopupShown(popupId: string): void {
  if (typeof window === 'undefined') return;
  try {
    const raw = sessionStorage.getItem(SESSION_POPUP_KEY);
    const shown: string[] = raw ? JSON.parse(raw) : [];
    if (!shown.includes(popupId)) {
      shown.push(popupId);
      sessionStorage.setItem(SESSION_POPUP_KEY, JSON.stringify(shown));
    }
  } catch {
    /* ignore */
  }
}
