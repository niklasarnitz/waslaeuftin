// /admin is protected with HTTP basic auth (ADMIN_USERNAME / ADMIN_PASSWORD).
// Without ADMIN_PASSWORD the admin area is disabled entirely.

export const ADMIN_AUTH_REALM =
  'Basic realm="waslaeuft.in admin", charset="UTF-8"';

export const isAdminEnabled = () => !!process.env.ADMIN_PASSWORD;

const timingSafeEqual = (given: string, expected: string) => {
  let mismatch = given.length === expected.length ? 0 : 1;
  for (let index = 0; index < expected.length; index++) {
    mismatch |=
      given.charCodeAt(index % (given.length || 1)) ^
      expected.charCodeAt(index);
  }
  return mismatch === 0;
};

export const isAuthorizedAdmin = (authorizationHeader: string | null) => {
  const password = process.env.ADMIN_PASSWORD;
  if (!password || !authorizationHeader) return false;

  const [scheme, encoded] = authorizationHeader.split(" ");
  if (scheme !== "Basic" || !encoded) return false;

  let decoded: string;
  try {
    decoded = atob(encoded);
  } catch {
    return false;
  }

  const separator = decoded.indexOf(":");
  if (separator === -1) return false;

  const userMatches = timingSafeEqual(
    decoded.slice(0, separator),
    process.env.ADMIN_USERNAME ?? "admin",
  );
  const passwordMatches = timingSafeEqual(
    decoded.slice(separator + 1),
    password,
  );
  return userMatches && passwordMatches;
};
