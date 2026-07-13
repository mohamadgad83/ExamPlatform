/**
 * المستخدم بيدخل باسم مستخدم بس، لكن Supabase Auth محتاج إيميل داخليًا.
 * بننشئ إيميل وهمي ثابت مبني على اليوزرنيم، مبيتبعتش لحد، بس بيستخدم
 * كمعرّف داخلي لنظام Supabase Auth (اللي بيخزن الباسورد المشفر بأمان).
 */
export const USERNAME_AUTH_DOMAIN = "auth.examplatform.internal";

export function normalizeUsername(raw: string): string {
  return raw.trim().toLowerCase();
}

export function isValidUsername(raw: string): boolean {
  return /^[a-zA-Z0-9_]{3,30}$/.test(raw);
}

export function usernameToSyntheticEmail(rawUsername: string): string {
  const username = normalizeUsername(rawUsername);
  return `${username}@${USERNAME_AUTH_DOMAIN}`;
}
