export type UserRole = 'ADMIN' | 'LIBRARIAN' | 'MEMBER';
export type MembershipType = 'STUDENT' | 'FACULTY' | 'PUBLIC';
export type CopyStatus = 'AVAILABLE' | 'LOANED' | 'LOST' | 'DAMAGED';
export type ReservationStatus = 'PENDING' | 'READY' | 'EXPIRED' | 'CANCELLED' | 'FULFILLED';

export interface User {
  id: string;
  membershipId: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  emailId: string;
  role: UserRole;
  membershipType: MembershipType;
  branchId: string | null;
  isActive: boolean;
  createdAt: string;
}

export interface Branch {
  id: string;
  name: string;
  address: string;
  phone: string;
  email: string;
  createdAt: string;
}

export interface Book {
  id: string;
  isbn: string;
  bookName: string;
  author: string;
  publication: string;
  language: string;
  location: string;
  description: string;
  coverImageUrl: string;
  categoryId: string | null;
  categoryName?: string;
  createdAt: string;
  availableCopies?: number;
  totalCopies?: number;
}

export interface BookCopy {
  id: string;
  bookId: string;
  branchId: string;
  branchName?: string;
  barcode: string;
  status: CopyStatus;
  createdAt: string;
}

export interface BookIssue {
  id: string;
  userId: string;
  userName?: string;
  copyId: string;
  bookName?: string;
  barcode?: string;
  issueDate: string;
  dueDate: string;
  returnDate: string | null;
  renewed: boolean;
}

export interface BookReservation {
  id: string;
  userId: string;
  bookId: string;
  branchId: string;
  status: ReservationStatus;
  queuePosition: number;
  reservedAt: string;
  notifiedAt: string | null;
  expiresAt: string | null;
}

export interface ApiResponse<T> {
  success: boolean;
  message: string | null;
  code: number;
  data: T;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  id: string;
  firstName: string | null;
  lastName: string | null;
  role: string | null;
  email: string | null;
}

export interface DashboardStats {
  totalBooks: number;
  totalCopies: number;
  activeLoans: number;
  overdueBooks: number;
  totalUsers: number;
  activeReservations: number;
  totalBranches: number;
}
