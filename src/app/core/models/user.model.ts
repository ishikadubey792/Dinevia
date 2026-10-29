export interface User {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  memberTier: string;
  memberSince: string;
  preferredCity: string;
  preferredSeating: string;
  dietaryPreferences: string[];
  favoriteCuisines: string[];
  reservationsCompleted: number;
  avatarUrl?: string;
  isMockUser: boolean;
}

export interface ProfileUpdateDto {
  fullName: string;
  email: string;
  phone: string;
  preferredCity: string;
  preferredSeating: string;
  dietaryPreferences: string[];
  favoriteCuisines: string[];
}
