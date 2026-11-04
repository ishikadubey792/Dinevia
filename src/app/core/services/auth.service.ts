import { Injectable, signal, computed } from '@angular/core';
import { User, ProfileUpdateDto } from '../models/user.model';
import { OwnerAuthSession, OwnerUser } from '../models/owner-auth.model';
import { CustomerAuthSession, CustomerUser, parseJwtClaims } from '../models/customer-auth.model';

export const DEFAULT_MOCK_USER: User = {
  id: 'usr-101',
  fullName: 'Alexander Wright',
  email: 'a.wright@epicuredining.com',
  phone: '+1 (555) 234-5678',
  memberTier: 'Charter Epicurean Member',
  memberSince: 'October 2024',
  preferredCity: 'New York',
  preferredSeating: "Chef's Counter & Window Alcove",
  dietaryPreferences: ['Pescatarian', 'Gluten-Free Friendly'],
  favoriteCuisines: ['Italian', 'French Contemporary', 'Japanese Omakase'],
  reservationsCompleted: 8,
  avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80',
  isMockUser: true,
  role: 'Customer'
};

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  // --------------------------------------------------------------------------
  // 1. Customer JWT Session & Reactive State
  // --------------------------------------------------------------------------
  private readonly currentCustomerSessionSignal = signal<CustomerAuthSession | null>(
    this.loadInitialCustomerSession()
  );
  readonly currentCustomerSession = this.currentCustomerSessionSignal.asReadonly();

  // Reactive currentUser state consumed by Navbar, Profile, and Customer views
  private readonly currentUserSignal = signal<User | null>(this.loadInitialUser());
  readonly currentUser = this.currentUserSignal.asReadonly();

  // Strict token-based customer authentication check
  readonly isCustomerAuthenticated = computed<boolean>(() => {
    const session = this.currentCustomerSessionSignal();
    if (!session || !session.accessToken || typeof session.accessToken !== 'string') {
      return false;
    }

    const token = session.accessToken.trim();
    if (token.length === 0) {
      return false;
    }

    // Decode JWT claims and strictly validate role and exp
    const claims = parseJwtClaims(token);
    if (!claims) {
      return false;
    }

    // Strict role validation: role must be exactly 'Customer'
    if (claims.role !== 'Customer') {
      return false;
    }

    // Require the JWT exp claim to exist and be a valid finite number greater than current timestamp
    const nowInSeconds = Math.floor(Date.now() / 1000);
    if (
      claims.exp === undefined ||
      claims.exp === null ||
      typeof claims.exp !== 'number' ||
      !Number.isFinite(claims.exp) ||
      claims.exp <= nowInSeconds
    ) {
      return false;
    }

    // Check expiration helper
    if (this.isCustomerSessionExpired()) {
      return false;
    }

    return true;
  });

  // Backward-compatible check (true if customer is logged in or active demo user)
  readonly isAuthenticated = computed<boolean>(() => !!this.currentUserSignal());

  // --------------------------------------------------------------------------
  // 2. Restaurant Owner Session State (Strictly isolated from Customer)
  // --------------------------------------------------------------------------
  private readonly currentOwnerSessionSignal = signal<OwnerAuthSession | null>(
    this.loadInitialOwnerSession()
  );
  readonly currentOwnerSession = this.currentOwnerSessionSignal.asReadonly();
  readonly isOwnerAuthenticated = computed<boolean>(() => !!this.currentOwnerSessionSignal());
  readonly currentOwner = computed<OwnerUser | null>(
    () => this.currentOwnerSessionSignal()?.owner ?? null
  );

  // --------------------------------------------------------------------------
  // 3. Customer Session Methods
  // --------------------------------------------------------------------------

  /**
   * Establish authenticated customer session from ASP.NET Core login response.
   * Enforces strict Customer role validation on the JWT token.
   * Rejects missing, malformed, expired, or non-Customer tokens.
   */
  setCustomerSession(data: {
    id: string | number;
    name: string;
    email: string;
    role?: string;
    accessToken: string;
    tokenType?: string;
    expiresIn?: number;
    phone?: string;
  }): boolean {
    if (!data.accessToken || typeof data.accessToken !== 'string') {
      console.warn('[Dinevia Customer Auth] Rejected: Missing or invalid accessToken string.');
      return false;
    }

    const token = data.accessToken.trim();
    if (token.length === 0) {
      console.warn('[Dinevia Customer Auth] Rejected: Empty accessToken.');
      return false;
    }

    // Decode and validate JWT claims
    const claims = parseJwtClaims(token);
    if (!claims) {
      console.warn('[Dinevia Customer Auth] Rejected: Malformed or undecodable JWT token.');
      return false;
    }

    // Role MUST be strictly 'Customer'. Reject RestaurantOwner or other roles
    if (claims.role !== 'Customer') {
      console.warn(`[Dinevia Customer Auth] Rejected: Invalid role '${claims.role}'. Expected strictly 'Customer'.`);
      return false;
    }

    // Require the JWT exp claim to exist, be a valid finite number, and greater than current Unix timestamp
    const nowInSeconds = Math.floor(Date.now() / 1000);
    if (
      claims.exp === undefined ||
      claims.exp === null ||
      typeof claims.exp !== 'number' ||
      !Number.isFinite(claims.exp) ||
      claims.exp <= nowInSeconds
    ) {
      console.warn('[Dinevia Customer Auth] Rejected: Missing, non-numeric, or expired JWT exp claim.');
      return false;
    }

    const session: CustomerAuthSession = {
      user: {
        id: data.id,
        name: data.name,
        email: data.email,
        role: 'Customer'
      },
      accessToken: token,
      tokenType: data.tokenType || 'Bearer',
      expiresIn: data.expiresIn || 1800,
      authenticatedAt: Date.now()
    };

    this.currentCustomerSessionSignal.set(session);
    this.persistCustomerSession(session);

    // Update reactive currentUser representation for Navbar and Profile components
    const user: User = {
      id: String(data.id),
      fullName: data.name,
      email: data.email,
      phone: data.phone || '',
      memberTier: 'Dinevia Connoisseur Member',
      memberSince: new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
      preferredCity: 'New York',
      preferredSeating: "Chef's Counter",
      dietaryPreferences: [],
      favoriteCuisines: ['Italian', 'French Contemporary'],
      reservationsCompleted: 0,
      isMockUser: false,
      role: 'Customer'
    };

    this.currentUserSignal.set(user);
    this.persistUser(user);
    return true;
  }

  /**
   * Retrieve active customer JWT access token safely.
   */
  getCustomerAccessToken(): string | null {
    return this.currentCustomerSessionSignal()?.accessToken ?? null;
  }

  /**
   * Retrieve active customer session payload.
   */
  getCustomerSession(): CustomerAuthSession | null {
    return this.currentCustomerSessionSignal();
  }

  /**
   * Checks if active customer token appears expired based on token claims or session timestamp.
   * Requires exp claim to exist and be a valid finite number greater than current Unix timestamp.
   */
  isCustomerSessionExpired(): boolean {
    const session = this.currentCustomerSessionSignal();
    if (!session || !session.accessToken) return true;

    // 1. Check JWT exp claim first if decodable
    const claims = parseJwtClaims(session.accessToken);
    if (!claims) return true;

    const nowInSeconds = Math.floor(Date.now() / 1000);
    if (
      claims.exp === undefined ||
      claims.exp === null ||
      typeof claims.exp !== 'number' ||
      !Number.isFinite(claims.exp) ||
      claims.exp <= nowInSeconds
    ) {
      return true;
    }

    // 2. Check session timestamp + expiresIn
    if (session.authenticatedAt && session.expiresIn) {
      const expiryTime = session.authenticatedAt + session.expiresIn * 1000;
      return Date.now() >= expiryTime;
    }

    return false;
  }

  /**
   * Clear only the customer session from memory and browser storage.
   * Completely isolated: does NOT touch owner session or dinevia_owner_session.
   */
  clearCustomerSession(): void {
    this.currentCustomerSessionSignal.set(null);
    this.currentUserSignal.set(null);
    if (typeof window !== 'undefined') {
      try {
        sessionStorage.removeItem('dinevia_customer_session');
        sessionStorage.removeItem('dinevia_auth_user');
      } catch (e) {
        console.warn('Could not clear customer session from sessionStorage', e);
      }
    }
  }

  /**
   * Customer logout: Clears ONLY customer session, preserving owner session.
   */
  logout(): void {
    this.clearCustomerSession();
    console.info('[Dinevia Auth: Customer Logged Out]');
  }

  // --------------------------------------------------------------------------
  // 4. Restaurant Owner Session Methods (Unchanged & Isolated)
  // --------------------------------------------------------------------------

  setOwnerSession(data: {
    id: string | number;
    name: string;
    email: string;
    role: string;
    restaurant?: any;
    accessToken: string;
    tokenType: string;
    expiresIn: number;
  }): void {
    const session: OwnerAuthSession = {
      owner: {
        id: data.id,
        name: data.name,
        email: data.email,
        role: data.role,
        restaurant: data.restaurant
      },
      accessToken: data.accessToken,
      tokenType: data.tokenType,
      expiresIn: data.expiresIn,
      authenticatedAt: Date.now()
    };

    this.currentOwnerSessionSignal.set(session);
    this.persistOwnerSession(session);
  }

  getOwnerAccessToken(): string | null {
    return this.currentOwnerSessionSignal()?.accessToken ?? null;
  }

  isOwnerSessionExpired(): boolean {
    const session = this.currentOwnerSessionSignal();
    if (!session || !session.accessToken) return true;
    if (session.authenticatedAt && session.expiresIn) {
      const expiryTime = session.authenticatedAt + session.expiresIn * 1000;
      return Date.now() >= expiryTime;
    }
    return false;
  }

  clearOwnerSession(): void {
    this.currentOwnerSessionSignal.set(null);
    if (typeof window !== 'undefined') {
      try {
        sessionStorage.removeItem('dinevia_owner_session');
      } catch (e) {
        console.warn('Could not clear owner session from sessionStorage', e);
      }
    }
  }

  logoutOwner(): void {
    this.clearOwnerSession();
  }

  // --------------------------------------------------------------------------
  // 5. Mock Customer Auth (Preserved for Demo / Backward Compatibility)
  // --------------------------------------------------------------------------

  login(email: string, _password: string, _rememberMe: boolean = false): { success: boolean; user?: User; error?: string } {
    const trimmedEmail = email.trim().toLowerCase();

    let user: User;
    if (trimmedEmail === DEFAULT_MOCK_USER.email.toLowerCase()) {
      user = { ...DEFAULT_MOCK_USER };
    } else {
      const namePart = trimmedEmail.split('@')[0];
      const formattedName = namePart.charAt(0).toUpperCase() + namePart.slice(1);
      user = {
        id: `usr-${Math.floor(1000 + Math.random() * 9000)}`,
        fullName: formattedName,
        email: trimmedEmail,
        phone: '+1 (555) 019-8234',
        memberTier: 'Dinevia Connoisseur',
        memberSince: 'October 2026',
        preferredCity: 'New York',
        preferredSeating: 'Main Dining Room',
        dietaryPreferences: [],
        favoriteCuisines: ['French Haute', 'Italian'],
        reservationsCompleted: 1,
        isMockUser: true,
        role: 'Customer'
      };
    }

    this.currentUserSignal.set(user);
    this.persistUser(user);
    console.info('[Dinevia Mock Auth: Login Succeeded]', user.email);
    return { success: true, user };
  }

  signup(data: {
    fullName: string;
    email: string;
    phone: string;
    _password?: string;
  }): { success: boolean; user: User } {
    const newUser: User = {
      id: `usr-${Math.floor(1000 + Math.random() * 9000)}`,
      fullName: data.fullName.trim(),
      email: data.email.trim().toLowerCase(),
      phone: data.phone.trim(),
      memberTier: 'Dinevia Connoisseur Member',
      memberSince: new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
      preferredCity: 'New York',
      preferredSeating: "Chef's Counter",
      dietaryPreferences: [],
      favoriteCuisines: ['Italian', 'Modern American'],
      reservationsCompleted: 0,
      isMockUser: true,
      role: 'Customer'
    };

    this.currentUserSignal.set(newUser);
    this.persistUser(newUser);
    console.info('[Dinevia Mock Auth: Signup Completed]', newUser.email);
    return { success: true, user: newUser };
  }

  updateProfile(updates: ProfileUpdateDto): { success: boolean; user: User } {
    const current = this.currentUserSignal() || DEFAULT_MOCK_USER;
    const updated: User = {
      ...current,
      fullName: updates.fullName.trim(),
      email: updates.email.trim().toLowerCase(),
      phone: updates.phone.trim(),
      preferredCity: updates.preferredCity,
      preferredSeating: updates.preferredSeating,
      dietaryPreferences: updates.dietaryPreferences,
      favoriteCuisines: updates.favoriteCuisines
    };

    this.currentUserSignal.set(updated);
    this.persistUser(updated);
    console.info('[Dinevia Mock Auth: Profile Updated]', updated);
    return { success: true, user: updated };
  }

  requestPasswordReset(email: string): { success: boolean; message: string } {
    console.info('[Dinevia Mock Auth: Password Reset Requested]', email);
    return {
      success: true,
      message: `A simulated password reset link has been dispatched to ${email}. (Mock authentication simulation only)`
    };
  }

  // --------------------------------------------------------------------------
  // 6. Persistence Helpers
  // --------------------------------------------------------------------------

  private loadInitialCustomerSession(): CustomerAuthSession | null {
    if (typeof window !== 'undefined') {
      try {
        const stored = sessionStorage.getItem('dinevia_customer_session');
        if (stored) {
          const session: CustomerAuthSession = JSON.parse(stored);
          if (session?.accessToken) {
            const claims = parseJwtClaims(session.accessToken);
            if (!claims || claims.role !== 'Customer') {
              sessionStorage.removeItem('dinevia_customer_session');
              return null;
            }
            const nowInSeconds = Math.floor(Date.now() / 1000);
            if (
              claims.exp === undefined ||
              claims.exp === null ||
              typeof claims.exp !== 'number' ||
              !Number.isFinite(claims.exp) ||
              claims.exp <= nowInSeconds
            ) {
              sessionStorage.removeItem('dinevia_customer_session');
              return null;
            }
            return session;
          }
        }
      } catch (e) {
        console.warn('Could not read customer session from sessionStorage', e);
      }
    }
    return null;
  }

  private loadInitialOwnerSession(): OwnerAuthSession | null {
    if (typeof window !== 'undefined') {
      try {
        const stored = sessionStorage.getItem('dinevia_owner_session');
        if (stored) {
          return JSON.parse(stored);
        }
      } catch (e) {
        console.warn('Could not read owner session from sessionStorage', e);
      }
    }
    return null;
  }

  private loadInitialUser(): User | null {
    if (typeof window !== 'undefined') {
      try {
        // If customer session exists, initialize user representation from it
        const storedCustomerSession = sessionStorage.getItem('dinevia_customer_session');
        if (storedCustomerSession) {
          const session: CustomerAuthSession = JSON.parse(storedCustomerSession);
          const claims = parseJwtClaims(session?.accessToken);
          const nowInSeconds = Math.floor(Date.now() / 1000);
          if (
            claims &&
            claims.role === 'Customer' &&
            typeof claims.exp === 'number' &&
            Number.isFinite(claims.exp) &&
            claims.exp > nowInSeconds
          ) {
            const storedUser = sessionStorage.getItem('dinevia_auth_user');
            if (storedUser) {
              return JSON.parse(storedUser);
            }
            return {
              id: String(session.user.id),
              fullName: session.user.name,
              email: session.user.email,
              phone: '',
              memberTier: 'Dinevia Connoisseur Member',
              memberSince: 'October 2026',
              preferredCity: 'New York',
              preferredSeating: "Chef's Counter",
              dietaryPreferences: [],
              favoriteCuisines: ['Italian'],
              reservationsCompleted: 0,
              isMockUser: false,
              role: 'Customer'
            };
          }
        }

        const stored = sessionStorage.getItem('dinevia_auth_user');
        if (stored) {
          return JSON.parse(stored);
        }
      } catch (e) {
        console.warn('Could not read user session from sessionStorage', e);
      }
    }
    // Default to the luxury demo persona for seamless portfolio exploration
    return DEFAULT_MOCK_USER;
  }

  private persistCustomerSession(session: CustomerAuthSession): void {
    if (typeof window !== 'undefined') {
      try {
        sessionStorage.setItem('dinevia_customer_session', JSON.stringify(session));
      } catch (e) {
        console.warn('Could not persist customer session to sessionStorage', e);
      }
    }
  }

  private persistOwnerSession(session: OwnerAuthSession): void {
    if (typeof window !== 'undefined') {
      try {
        sessionStorage.setItem('dinevia_owner_session', JSON.stringify(session));
      } catch (e) {
        console.warn('Could not persist owner session to sessionStorage', e);
      }
    }
  }

  private persistUser(user: User): void {
    if (typeof window !== 'undefined') {
      try {
        sessionStorage.setItem('dinevia_auth_user', JSON.stringify(user));
      } catch (e) {
        console.warn('Could not persist auth user to sessionStorage', e);
      }
    }
  }
}
