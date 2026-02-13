export enum UserRole {
  HOMEOWNER = 'homeowner',
  CONTRACTOR = 'contractor',
}

export type User = {
  id: string;
  email: string;
  password_hash: string;
  name: string;
  role: UserRole;
  created_at: Date;
  updated_at: Date;
};
