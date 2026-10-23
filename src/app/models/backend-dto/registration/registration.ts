export type RegistrationAccountType = 'USER' | 'COACH';
export type RegistrationStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

/** Exact contract of backend dto.auth.RegistrationRequest (POST /api/auth/register). */
export interface RegistrationPayload {
  accountType: RegistrationAccountType;
  username: string;
  email: string;
  password: string;
  passwordConfirmation: string;
  age?: number | null;
  weight?: number | null;
  height?: number | null;
  gender?: 'MALE' | 'FEMALE' | null;
  goals?: string | null;
  phone?: string | null;
  specialization?: string | null;
}

/** Exact contract of backend dto.registration.RegistrationResponse. */
export interface RegistrationResult {
  status: 'PENDING';
}

/** Exact contract of backend dto.registration.RegistrationRequestDto. */
export interface RegistrationRequestDto {
  id: number;
  accountType: RegistrationAccountType;
  username: string;
  email: string;
  age: number | null;
  weight: number | null;
  height: number | null;
  gender: 'MALE' | 'FEMALE' | null;
  goals: string | null;
  phone: string | null;
  specialization: string | null;
  status: RegistrationStatus;
  rejectionReason: string | null;
  createdAt: string;
  decidedAt: string | null;
  decidedBy: string | null;
  createdUserId: number | null;
  createdCoachId: number | null;
  assignedCoachId: number | null;
  assignedCoachName: string | null;
}
