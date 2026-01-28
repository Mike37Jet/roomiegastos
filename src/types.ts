export type Member = {
  id: string;
  name: string;
};

export type Expense = {
  id: string;
  title: string;
  amount: number;
  paidById: string;
  participantIds: string[];
  createdAt: number;
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
