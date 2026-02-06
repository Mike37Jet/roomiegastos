export type Member = {
  id: string;
  name: string;
};

export type ExpenseItemDetail = {
  name: string;
  price: number; // User's share pre-tax
  tax: number; // User's share tax
  total: number; // User's share total
  originalPrice: number; // Full item price
  withTax: boolean;
  sharedWith: string[];
};

export type Expense = {
  id: string;
  title: string;
  amount: number;
  paidById: string;
  participantIds: string[];
  createdAt: number;
  items?: ExpenseItemDetail[]; // Optional detailed breakdown
  receiptId?: string; // Optional: ID if this expense belongs to a batch/receipt
  receiptUrl?: string; // Optional: URL of the uploaded receipt
  type?: 'expense' | 'payment'; // Default is 'expense'
};

export type Group = {
  id: string;
  name: string;
  currency: string;
  members: Member[];
  expenses: Expense[];
  adminId: string;
  inviteCode: string;
};

export type User = {
  id: string;
  name: string;
  email: string;
  premium: boolean;
};

export type GroupInvite = {
  id: string;
  groupId: string;
  groupName: string;
  adminId: string;
  requesterId: string;
  requesterName: string;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: number;
};

export type AppState = {
  user: User | null;
  groups: Group[];
  pendingInvites: GroupInvite[];
};
