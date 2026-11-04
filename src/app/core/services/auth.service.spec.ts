import { TestBed } from '@angular/core/testing';
import { AuthService, DEFAULT_MOCK_USER } from './auth.service';

function createMockJwt(
  claims: { role?: string; name?: string; email?: string; exp?: any; id?: string | number } = {},
  options: { omitExp?: boolean } = {}
): string {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
    .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const payloadData: Record<string, any> = {
    role: claims.role ?? 'Customer',
    name: claims.name ?? 'Ishika H',
    email: claims.email ?? 'ishika@example.com',
    nameid: String(claims.id ?? 1001)
  };
  if (!options.omitExp) {
    payloadData['exp'] = claims.exp !== undefined ? claims.exp : Math.floor(Date.now() / 1000) + 3600;
  }
  const payload = btoa(JSON.stringify(payloadData))
    .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  return `${header}.${payload}.mockSignature`;
}

describe('AuthService Strict Customer Role Validation & Session Isolation', () => {
  let service: AuthService;

  beforeEach(() => {
    sessionStorage.clear();
    TestBed.configureTestingModule({
      providers: [AuthService]
    });
    service = TestBed.inject(AuthService);
  });

  afterEach(() => {
    sessionStorage.clear();
  });

  it('should initialize with customer browsing persona but unauthenticated for customer token and owner token', () => {
    // Customer browsing has default mock persona for seamless UI exploration
    expect(service.isAuthenticated()).toBe(true);
    expect(service.currentUser()?.fullName).toBe(DEFAULT_MOCK_USER.fullName);

    // Customer JWT session must be strictly unauthenticated by default
    expect(service.isCustomerAuthenticated()).toBe(false);
    expect(service.getCustomerAccessToken()).toBeNull();
    expect(service.getCustomerSession()).toBeNull();

    // Owner portal must be strictly unauthenticated by default
    expect(service.isOwnerAuthenticated()).toBe(false);
    expect(service.currentOwner()).toBeNull();
    expect(service.getOwnerAccessToken()).toBeNull();
  });

  it('should accept a valid Customer JWT token and establish active customer session', () => {
    const validCustomerToken = createMockJwt({
      role: 'Customer',
      name: 'Ishika H',
      email: 'ishika@example.com',
      id: 1001
    });

    const result = service.setCustomerSession({
      id: 1001,
      name: 'Ishika H',
      email: 'ishika@example.com',
      role: 'Customer',
      accessToken: validCustomerToken,
      tokenType: 'Bearer',
      expiresIn: 3600
    });

    expect(result).toBe(true);
    expect(service.isCustomerAuthenticated()).toBe(true);
    expect(service.getCustomerAccessToken()).toBe(validCustomerToken);

    const session = service.getCustomerSession();
    expect(session).toBeTruthy();
    expect(session?.user.id).toBe(1001);
    expect(session?.user.name).toBe('Ishika H');
    expect(session?.user.email).toBe('ishika@example.com');
    expect(session?.user.role).toBe('Customer');
    expect(session?.accessToken).toBe(validCustomerToken);

    // Reactive currentUser should be updated
    expect(service.currentUser()?.fullName).toBe('Ishika H');
    expect(service.currentUser()?.email).toBe('ishika@example.com');
    expect(service.currentUser()?.isMockUser).toBe(false);

    // Verified in sessionStorage
    const stored = sessionStorage.getItem('dinevia_customer_session');
    expect(stored).toBeTruthy();
    expect(JSON.parse(stored!).accessToken).toBe(validCustomerToken);
  });

  it('should reject a RestaurantOwner token when attempting to set a customer session', () => {
    const ownerToken = createMockJwt({
      role: 'RestaurantOwner',
      name: 'Chef Julien Laurent',
      email: 'julien@restaurant.fr',
      id: 'owner-55'
    });

    const result = service.setCustomerSession({
      id: 'owner-55',
      name: 'Chef Julien Laurent',
      email: 'julien@restaurant.fr',
      accessToken: ownerToken,
      tokenType: 'Bearer',
      expiresIn: 3600
    });

    // Must be rejected
    expect(result).toBe(false);
    expect(service.isCustomerAuthenticated()).toBe(false);
    expect(service.getCustomerAccessToken()).toBeNull();
    expect(service.getCustomerSession()).toBeNull();
    expect(sessionStorage.getItem('dinevia_customer_session')).toBeNull();
  });

  it('should reject missing or empty access token', () => {
    const result1 = service.setCustomerSession({
      id: 101,
      name: 'Test',
      email: 'test@example.com',
      accessToken: ''
    });

    const result2 = service.setCustomerSession({
      id: 101,
      name: 'Test',
      email: 'test@example.com',
      accessToken: null as any
    });

    expect(result1).toBe(false);
    expect(result2).toBe(false);
    expect(service.isCustomerAuthenticated()).toBe(false);
    expect(service.getCustomerAccessToken()).toBeNull();
  });

  it('should reject malformed or non-JWT tokens', () => {
    const resultMalformed = service.setCustomerSession({
      id: 101,
      name: 'Test',
      email: 'test@example.com',
      accessToken: 'not-a-valid-jwt-token'
    });

    expect(resultMalformed).toBe(false);
    expect(service.isCustomerAuthenticated()).toBe(false);
    expect(service.getCustomerAccessToken()).toBeNull();
    expect(sessionStorage.getItem('dinevia_customer_session')).toBeNull();
  });

  it('should reject expired Customer JWT tokens', () => {
    const expiredToken = createMockJwt({
      role: 'Customer',
      name: 'Expired Patron',
      email: 'expired@example.com',
      exp: Math.floor(Date.now() / 1000) - 300 // expired 5 minutes ago
    });

    const result = service.setCustomerSession({
      id: 999,
      name: 'Expired Patron',
      email: 'expired@example.com',
      accessToken: expiredToken,
      expiresIn: 1800
    });

    expect(result).toBe(false);
    expect(service.isCustomerAuthenticated()).toBe(false);
    expect(service.getCustomerAccessToken()).toBeNull();
  });

  it('should reject Customer JWT token with missing exp claim', () => {
    const tokenWithoutExp = createMockJwt(
      {
        role: 'Customer',
        name: 'No Exp Customer',
        email: 'noexp@example.com'
      },
      { omitExp: true }
    );

    const result = service.setCustomerSession({
      id: 2001,
      name: 'No Exp Customer',
      email: 'noexp@example.com',
      accessToken: tokenWithoutExp
    });

    expect(result).toBe(false);
    expect(service.isCustomerAuthenticated()).toBe(false);
    expect(service.getCustomerAccessToken()).toBeNull();
    expect(sessionStorage.getItem('dinevia_customer_session')).toBeNull();
  });

  it('should reject Customer JWT token with null or non-numeric exp claim', () => {
    const tokenWithNullExp = createMockJwt({
      role: 'Customer',
      name: 'Null Exp Patron',
      email: 'null-exp@example.com',
      exp: null
    });

    const tokenWithStringExp = createMockJwt({
      role: 'Customer',
      name: 'String Exp Patron',
      email: 'string-exp@example.com',
      exp: '2026-12-31T23:59:59Z'
    });

    const resultNull = service.setCustomerSession({
      id: 2002,
      name: 'Null Exp Patron',
      email: 'null-exp@example.com',
      accessToken: tokenWithNullExp
    });
    expect(resultNull).toBe(false);
    expect(service.isCustomerAuthenticated()).toBe(false);

    const resultString = service.setCustomerSession({
      id: 2003,
      name: 'String Exp Patron',
      email: 'string-exp@example.com',
      accessToken: tokenWithStringExp
    });
    expect(resultString).toBe(false);
    expect(service.isCustomerAuthenticated()).toBe(false);
    expect(service.getCustomerAccessToken()).toBeNull();
  });

  it('should reject Customer JWT token with invalid or non-finite exp claim', () => {
    const tokenWithBoolExp = createMockJwt({
      role: 'Customer',
      name: 'Bool Exp Patron',
      email: 'bool-exp@example.com',
      exp: true
    });

    const result = service.setCustomerSession({
      id: 2004,
      name: 'Bool Exp Patron',
      email: 'bool-exp@example.com',
      accessToken: tokenWithBoolExp
    });

    expect(result).toBe(false);
    expect(service.isCustomerAuthenticated()).toBe(false);
    expect(service.getCustomerAccessToken()).toBeNull();
  });

  it('should not load customer session with missing exp claim on service initialization', () => {
    const tokenNoExp = createMockJwt(
      {
        role: 'Customer',
        name: 'Reload No Exp',
        email: 'reloadnoexp@example.com'
      },
      { omitExp: true }
    );

    sessionStorage.setItem(
      'dinevia_customer_session',
      JSON.stringify({
        user: {
          id: 9999,
          name: 'Reload No Exp',
          email: 'reloadnoexp@example.com',
          role: 'Customer'
        },
        accessToken: tokenNoExp,
        tokenType: 'Bearer',
        expiresIn: 3600,
        authenticatedAt: Date.now()
      })
    );

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [AuthService]
    });
    const reloadedService = TestBed.inject(AuthService);

    expect(reloadedService.isCustomerAuthenticated()).toBe(false);
    expect(reloadedService.getCustomerAccessToken()).toBeNull();
    expect(sessionStorage.getItem('dinevia_customer_session')).toBeNull();
  });

  it('should load valid customer session after service initialization (page refresh simulation)', () => {
    const validToken = createMockJwt({
      role: 'Customer',
      name: 'Marcus Sterling',
      email: 'marcus@dinevia.com',
      id: 5002
    });

    sessionStorage.setItem(
      'dinevia_customer_session',
      JSON.stringify({
        user: {
          id: 5002,
          name: 'Marcus Sterling',
          email: 'marcus@dinevia.com',
          role: 'Customer'
        },
        accessToken: validToken,
        tokenType: 'Bearer',
        expiresIn: 3600,
        authenticatedAt: Date.now()
      })
    );

    // Re-instantiate AuthService to simulate page reload
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [AuthService]
    });
    const reloadedService = TestBed.inject(AuthService);

    expect(reloadedService.isCustomerAuthenticated()).toBe(true);
    expect(reloadedService.getCustomerAccessToken()).toBe(validToken);
    expect(reloadedService.currentUser()?.fullName).toBe('Marcus Sterling');
  });

  it('should not load invalid or tampered customer token on service initialization', () => {
    const tamperedToken = createMockJwt({
      role: 'RestaurantOwner', // invalid role in customer storage
      name: 'Tampered',
      email: 'tampered@example.com'
    });

    sessionStorage.setItem(
      'dinevia_customer_session',
      JSON.stringify({
        user: {
          id: 999,
          name: 'Tampered',
          email: 'tampered@example.com',
          role: 'Customer'
        },
        accessToken: tamperedToken,
        tokenType: 'Bearer',
        expiresIn: 3600,
        authenticatedAt: Date.now()
      })
    );

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [AuthService]
    });
    const reloadedService = TestBed.inject(AuthService);

    // Must be rejected and purged from storage
    expect(reloadedService.isCustomerAuthenticated()).toBe(false);
    expect(reloadedService.getCustomerAccessToken()).toBeNull();
    expect(sessionStorage.getItem('dinevia_customer_session')).toBeNull();
  });

  it('should clear only customer session when clearCustomerSession is called', () => {
    const validCustToken = createMockJwt({ role: 'Customer', name: 'Patron One' });

    service.setCustomerSession({
      id: 101,
      name: 'Patron One',
      email: 'patron@dinevia.com',
      accessToken: validCustToken
    });

    service.setOwnerSession({
      id: 'owner-1',
      name: 'Chef Owner',
      email: 'chef@dinevia.com',
      role: 'RestaurantOwner',
      accessToken: 'owner-token-1',
      tokenType: 'Bearer',
      expiresIn: 3600
    });

    expect(service.isCustomerAuthenticated()).toBe(true);
    expect(service.isOwnerAuthenticated()).toBe(true);

    service.clearCustomerSession();

    // Customer is cleared
    expect(service.isCustomerAuthenticated()).toBe(false);
    expect(service.getCustomerAccessToken()).toBeNull();
    expect(service.getCustomerSession()).toBeNull();
    expect(service.currentUser()).toBeNull();
    expect(sessionStorage.getItem('dinevia_customer_session')).toBeNull();

    // Owner remains authenticated and untouched
    expect(service.isOwnerAuthenticated()).toBe(true);
    expect(service.getOwnerAccessToken()).toBe('owner-token-1');
    expect(sessionStorage.getItem('dinevia_owner_session')).toBeTruthy();
  });

  it('should ensure customer logout does NOT clear owner session', () => {
    service.setOwnerSession({
      id: 'owner-55',
      name: 'Chef Julien Laurent',
      email: 'julien@restaurant.fr',
      role: 'RestaurantOwner',
      accessToken: 'owner-jwt-token-999',
      tokenType: 'Bearer',
      expiresIn: 3600
    });

    const validCustToken = createMockJwt({ role: 'Customer', name: 'Claire Montgomery' });
    service.setCustomerSession({
      id: 'cust-77',
      name: 'Claire Montgomery',
      email: 'claire@montgomery.fr',
      accessToken: validCustToken,
      tokenType: 'Bearer',
      expiresIn: 1800
    });

    expect(service.isCustomerAuthenticated()).toBe(true);
    expect(service.isOwnerAuthenticated()).toBe(true);

    // Call customer logout
    service.logout();

    // Customer session must be cleared
    expect(service.isCustomerAuthenticated()).toBe(false);
    expect(service.getCustomerAccessToken()).toBeNull();
    expect(service.currentUser()).toBeNull();
    expect(sessionStorage.getItem('dinevia_customer_session')).toBeNull();

    // Owner session must remain completely intact
    expect(service.isOwnerAuthenticated()).toBe(true);
    expect(service.currentOwner()?.name).toBe('Chef Julien Laurent');
    expect(service.getOwnerAccessToken()).toBe('owner-jwt-token-999');
    expect(sessionStorage.getItem('dinevia_owner_session')).toBeTruthy();
  });

  it('should maintain complete customer and owner session isolation', () => {
    // 1. Establish owner session only
    service.setOwnerSession({
      id: 'owner-99',
      name: 'Restaurateur Pierre',
      email: 'pierre@bistro.fr',
      role: 'RestaurantOwner',
      accessToken: 'owner-token-99',
      tokenType: 'Bearer',
      expiresIn: 3600
    });

    // Customer token must not reflect owner token
    expect(service.getCustomerAccessToken()).toBeNull();
    expect(service.isCustomerAuthenticated()).toBe(false);
    expect(service.getOwnerAccessToken()).toBe('owner-token-99');
    expect(service.isOwnerAuthenticated()).toBe(true);

    // 2. Establish customer session with valid Customer token
    const validCustToken = createMockJwt({ role: 'Customer', name: 'Sophie Martin' });
    service.setCustomerSession({
      id: 'cust-88',
      name: 'Sophie Martin',
      email: 'sophie@martin.fr',
      accessToken: validCustToken,
      tokenType: 'Bearer',
      expiresIn: 1800
    });

    // Both coexist with distinct tokens
    expect(service.getCustomerAccessToken()).toBe(validCustToken);
    expect(service.getOwnerAccessToken()).toBe('owner-token-99');
    expect(service.isCustomerAuthenticated()).toBe(true);
    expect(service.isOwnerAuthenticated()).toBe(true);

    // 3. Clear owner session only via logoutOwner
    service.logoutOwner();

    // Owner is cleared
    expect(service.isOwnerAuthenticated()).toBe(false);
    expect(service.getOwnerAccessToken()).toBeNull();
    expect(sessionStorage.getItem('dinevia_owner_session')).toBeNull();

    // Customer remains active
    expect(service.isCustomerAuthenticated()).toBe(true);
    expect(service.getCustomerAccessToken()).toBe(validCustToken);
    expect(sessionStorage.getItem('dinevia_customer_session')).toBeTruthy();
  });
});
