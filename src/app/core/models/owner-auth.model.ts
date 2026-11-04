/**
 * Restaurant Owner Registration Request Payload
 */
export interface OwnerRegisterRequest {
  ownerName: string;
  ownerEmail: string;
  password: string;
  restaurantName: string;
  address: string;
  city: string;
  description: string;
  phone: string;
  restaurantEmail: string;
  cuisineIds: number[];
  coverImage?: File | null;
}

/**
 * Restaurant details returned in registration response
 */
export interface OwnerRestaurantSummary {
  id?: number | string;
  name?: string;
  address?: string;
  city?: string;
  [key: string]: any;
}

/**
 * Standard data payload returned by POST /api/auth/register-restaurant-owner
 */
export interface OwnerRegisterResponseData {
  id: string | number;
  name: string;
  email: string;
  role: string;
  restaurant?: OwnerRestaurantSummary | null;
  accessToken: string;
  tokenType: string;
  expiresIn: number;
}

/**
 * Restaurant Owner Login Request Payload (JSON)
 */
export interface OwnerLoginRequest {
  email: string;
  password: string;
}

/**
 * Data payload returned by POST /api/auth/login
 */
export interface OwnerLoginResponseData {
  accessToken: string;
  tokenType: string;
  expiresIn: number;
  id?: string | number;
  name?: string;
  email?: string;
  role?: string;
  restaurant?: OwnerRestaurantSummary | null;
}

/**
 * Decoded JWT claims contract from ASP.NET Core JwtService
 */
export interface DecodedJwtClaims {
  id?: string | number;
  name?: string;
  email?: string;
  role?: string;
  exp?: number;
  iss?: string;
  aud?: string;
  [key: string]: any;
}

/**
 * Safely decodes standard JWT payload without external libraries.
 * Handles standard JWT claim keys as well as Microsoft ClaimTypes URIs:
 * - ClaimTypes.NameIdentifier
 * - ClaimTypes.Name
 * - ClaimTypes.Email
 * - ClaimTypes.Role
 */
export function parseJwtClaims(token: string): DecodedJwtClaims | null {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;

  try {
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    const raw = JSON.parse(jsonPayload);

    const role =
      raw.role ||
      raw['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'] ||
      '';

    const name =
      raw.unique_name ||
      raw.name ||
      raw['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name'] ||
      '';

    const email =
      raw.email ||
      raw['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress'] ||
      '';

    const id =
      raw.nameid ||
      raw.sub ||
      raw['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier'] ||
      '';

    return {
      ...raw,
      id,
      name,
      email,
      role
    };
  } catch {
    return null;
  }
}

/**
 * Logically separated owner session stored in browser state
 */
export interface OwnerUser {
  id: string | number;
  name: string;
  email: string;
  role: string;
  restaurant?: OwnerRestaurantSummary | null;
}

export interface OwnerAuthSession {
  owner: OwnerUser;
  accessToken: string;
  tokenType: string;
  expiresIn: number;
  authenticatedAt: number;
}

