/**
 * Profile type definitions.
 * A Profile stores a complete MessageStyleConfig for UI customization.
 */

import type { MessageStyleConfig } from './messageStyle';

export interface Profile {
  id: string;
  name: string;
  messageStyle: MessageStyleConfig;
  isDefault: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface ProfileMeta {
  id: string;
  name: string;
  isDefault: boolean;
  createdAt: number;
  updatedAt: number;
}

// Request types
export interface CreateProfileRequest {
  name: string;
  messageStyle?: MessageStyleConfig; // If not provided, uses defaults
  isDefault?: boolean;
}

export interface UpdateProfileRequest {
  name?: string;
  messageStyle?: MessageStyleConfig;
}
