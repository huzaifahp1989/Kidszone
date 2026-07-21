const VISITOR_TOKEN_KEY = 'kids_zone_chat_visitor_token';

export function getChatVisitorToken(): string {
  if (typeof window === 'undefined') return '';
  try {
    let token = window.localStorage.getItem(VISITOR_TOKEN_KEY);
    if (!token) {
      token = crypto.randomUUID();
      window.localStorage.setItem(VISITOR_TOKEN_KEY, token);
    }
    return token;
  } catch {
    return crypto.randomUUID();
  }
}
