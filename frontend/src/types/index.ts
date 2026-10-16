export interface FamilyMember {
  id: string;
  firstName: string;
  lastName: string;
  birthDate?: string | null;
  deathDate?: string | null;
  gender: string;
  relationship: string;
  notes?: string | null;
  photoUrl?: string | null;
  parentId?: string | null;
  children?: FamilyMember[];
  createdAt: string;
  updatedAt: string;
}

export interface FamilyTree {
  id: string;
  firstName: string;
  lastName: string;
  birthDate?: string | null;
  deathDate?: string | null;
  gender: string;
  relationship: string;
  notes?: string | null;
  photoUrl?: string | null;
  children: FamilyTree[];
}

export interface User {
  id: string;
  email: string;
  name?: string;
  createdAt: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface FamilyResponse {
  tree: FamilyTree[];
  members: FamilyMember[];
}

export interface InvitationResponse {
  invitationToken: string;
  email: string;
  name?: string;
}