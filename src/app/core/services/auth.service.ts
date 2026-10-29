import { Injectable, signal, computed } from '@angular/core';
import { User, ProfileUpdateDto } from '../models/user.model';

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
  isMockUser: true
};

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly currentUserSignal = signal<User | null>(this.loadInitialUser());

  readonly currentUser = this.currentUserSignal.asReadonly();
  readonly isAuthenticated = computed<boolean>(() => !!this.currentUserSignal());

  private loadInitialUser(): User | null {
    if (typeof window !== 'undefined') {
      try {
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

  /**
   * Mock authentication login
   * Note: Passwords are treated in-memory only and never stored in browser storage.
   */
  login(email: string, _password: string, _rememberMe: boolean = false): { success: boolean; user?: User; error?: string } {
    const trimmedEmail = email.trim().toLowerCase();

    // Support logging in as the default user or creating a mock profile matching the entered email
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
        isMockUser: true
      };
    }

    this.currentUserSignal.set(user);
    this.persistUser(user);
    console.info('[Dinevia Mock Auth: Login Succeeded]', user.email);
    return { success: true, user };
  }

  /**
   * Mock account registration
   */
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
      isMockUser: true
    };

    this.currentUserSignal.set(newUser);
    this.persistUser(newUser);
    console.info('[Dinevia Mock Auth: Signup Completed]', newUser.email);
    return { success: true, user: newUser };
  }

  /**
   * Update Customer Profile in session
   */
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

  /**
   * Mock password reset request
   */
  requestPasswordReset(email: string): { success: boolean; message: string } {
    console.info('[Dinevia Mock Auth: Password Reset Requested]', email);
    return {
      success: true,
      message: `A simulated password reset link has been dispatched to ${email}. (Mock authentication simulation only)`
    };
  }

  /**
   * Clear session and log out
   */
  logout(): void {
    this.currentUserSignal.set(null);
    if (typeof window !== 'undefined') {
      try {
        sessionStorage.removeItem('dinevia_auth_user');
      } catch (e) {
        console.warn('Could not clear auth user from sessionStorage', e);
      }
    }
    console.info('[Dinevia Mock Auth: Logged Out]');
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
