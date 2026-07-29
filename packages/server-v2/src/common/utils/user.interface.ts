export interface IUser {
  id: string;
  email?: string;
  phone?: string;
  nickname: string;
  avatarUrl?: string;
  role: UserRole;
  membershipLevel: MembershipLevel;
  isGuest: boolean;
  isVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export enum UserRole {
  GUEST = 'guest',
  USER = 'user',
  VIP = 'vip',
  ADMIN = 'admin',
  SUPER_ADMIN = 'super_admin',
}

export enum MembershipLevel {
  FREE = 'free',
  BASIC = 'basic',
  PRO = 'pro',
  ENTERPRISE = 'enterprise',
}
