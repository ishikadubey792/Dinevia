/**
 * Test helper for generating mock JWT tokens with customizable payloads.
 */
export interface TestJwtPayloadOverrides {
  nameid?: string | number;
  unique_name?: string;
  name?: string;
  email?: string;
  role?: string;
  exp?: any;
  [key: string]: any;
}

/**
 * Creates a raw JWT token containing exactly the claims passed in `payload`.
 * Automatically appends a valid `exp` claim unless `omitExp: true` or `exp` is specified.
 */
export function createTestJwt(
  payload: TestJwtPayloadOverrides = {}
): string {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

  const payloadData: Record<string, any> = { ...payload };

  // If caller used 'id', ensure 'nameid' is also set if not present
  if (payloadData['id'] !== undefined && payloadData['nameid'] === undefined) {
    payloadData['nameid'] = String(payloadData['id']);
  }

  const body = btoa(JSON.stringify(payloadData))
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

  return `${header}.${body}.mock-signature`;
}

/**
 * Helper with standard defaults matching `auth.service.spec.ts`.
 */
export function createMockJwt(
  claims: { role?: string; name?: string; email?: string; exp?: any; id?: string | number } = {},
  options: { omitExp?: boolean } = {}
): string {
  const payloadData: Record<string, any> = {
    role: claims.role ?? 'Customer',
    name: claims.name ?? 'Ishika H',
    email: claims.email ?? 'ishika@example.com',
    nameid: String(claims.id ?? 1001)
  };
  if (claims.exp !== undefined) {
    payloadData['exp'] = claims.exp;
  } else if (!options.omitExp) {
    payloadData['exp'] = Math.floor(Date.now() / 1000) + 3600;
  }
  return createTestJwt(payloadData);
}

export const validCustomerJwt = createTestJwt({
  nameid: '1001',
  unique_name: 'Ishika Patron',
  name: 'Ishika Patron',
  email: 'ishika@example.com',
  role: 'Customer',
  exp: Math.floor(Date.now() / 1000) + 3600
});

export const validOwnerJwt = createTestJwt({
  nameid: 'owner-44',
  unique_name: 'Chef Julien Laurent',
  name: 'Chef Julien Laurent',
  email: 'chef.julien@legabriel.fr',
  role: 'RestaurantOwner',
  exp: Math.floor(Date.now() / 1000) + 3600
});

export const expiredCustomerJwt = createTestJwt({
  nameid: '1002',
  unique_name: 'Expired Customer',
  name: 'Expired Customer',
  email: 'expired@example.com',
  role: 'Customer',
  exp: Math.floor(Date.now() / 1000) - 300
});
