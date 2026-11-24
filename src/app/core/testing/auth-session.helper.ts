import { AuthService } from '../services/auth.service';
import { createTestJwt, validCustomerJwt, validOwnerJwt } from './test-jwt.helper';

export interface SetupCustomerSessionOptions {
  id?: number | string;
  name?: string;
  email?: string;
  role?: string;
  accessToken?: string;
  tokenType?: string;
  expiresIn?: number;
  phone?: string;
}

/**
 * Helper to quickly configure an active Customer session in AuthService.
 */
export function setupCustomerSession(
  authService: AuthService,
  options: SetupCustomerSessionOptions = {}
): boolean {
  const id = options.id ?? 1001;
  const name = options.name ?? 'Ishika Patron';
  const email = options.email ?? 'ishika@example.com';
  const role = options.role ?? 'Customer';
  const accessToken =
    options.accessToken ??
    (id === 1001 && name === 'Ishika Patron' && email === 'ishika@example.com' && role === 'Customer'
      ? validCustomerJwt
      : createTestJwt({
          nameid: id,
          unique_name: name,
          email,
          role
        }));

  return authService.setCustomerSession({
    id,
    name,
    email,
    role,
    accessToken,
    tokenType: options.tokenType ?? 'Bearer',
    expiresIn: options.expiresIn ?? 3600,
    phone: options.phone
  });
}

export interface SetupOwnerSessionOptions {
  id?: string;
  name?: string;
  email?: string;
  role?: string;
  restaurant?: any;
  accessToken?: string;
  tokenType?: string;
  expiresIn?: number;
}

/**
 * Helper to quickly configure an active RestaurantOwner session in AuthService.
 */
export function setupOwnerSession(
  authService: AuthService,
  options: SetupOwnerSessionOptions = {}
): void {
  const id = options.id ?? 'owner-44';
  const name = options.name ?? 'Chef Julien Laurent';
  const email = options.email ?? 'chef.julien@legabriel.fr';
  const role = options.role ?? 'RestaurantOwner';
  const accessToken =
    options.accessToken ??
    (id === 'owner-44' && name === 'Chef Julien Laurent' && email === 'chef.julien@legabriel.fr' && role === 'RestaurantOwner'
      ? validOwnerJwt
      : createTestJwt({
          nameid: id,
          unique_name: name,
          email,
          role
        }));

  authService.setOwnerSession({
    id,
    name,
    email,
    role,
    restaurant: options.restaurant,
    accessToken,
    tokenType: options.tokenType ?? 'Bearer',
    expiresIn: options.expiresIn ?? 3600
  });
}
