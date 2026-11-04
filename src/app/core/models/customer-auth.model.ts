import { ApiResponse } from './cuisine.model';

export { parseJwtClaims } from './owner-auth.model';
export type { DecodedJwtClaims } from './owner-auth.model';

/**
 * Customer Registration Request Payload (JSON)
 * Endpoint: POST /api/auth/register
 */
export interface CustomerRegisterRequest {
  name: string;
  email: string;
  password: string;
}

/**
 * Customer Registration Response Data
 * Returned in data payload from POST /api/auth/register
 */
export interface CustomerRegisterResponseData {
  id: number | string;
  name: string;
  email: string;
}

/**
 * Customer Login Request Payload (JSON)
 * Endpoint: POST /api/auth/login
 */
export interface CustomerLoginRequest {
  email: string;
  password: string;
}

/**
 * Customer Login Response Data
 * Returned in data payload from POST /api/auth/login
 */
export interface CustomerLoginResponseData {
  accessToken: string;
  tokenType: string;
  expiresIn: number;
}

/**
 * Typed API Response envelopes
 */
export type CustomerRegisterResponse = ApiResponse<CustomerRegisterResponseData>;
export type CustomerLoginResponse = ApiResponse<CustomerLoginResponseData>;

/**
 * Customer User representation inside active customer session
 */
export interface CustomerUser {
  id: string | number;
  name: string;
  email: string;
  role: string;
}

/**
 * Customer Authentication Session stored in browser state
 * Key: 'dinevia_customer_session'
 */
export interface CustomerAuthSession {
  user: CustomerUser;
  accessToken: string;
  tokenType: string;
  expiresIn: number;
  authenticatedAt: number;
}
