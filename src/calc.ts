import { Expense, Group } from './types';

export type MemberBalance = {
  memberId: string;
  net: number; // positive means member should receive, negative means owes
};

export type Settlement = {
  fromId: string;
  toId: string;
  amount: number;
};

export function calculateBalances(group: Group): MemberBalance[] {
  const totals: Record<string, number> = {};
  for (const member of group.members) {
    totals[member.id] = 0;
  }

  for (const expense of group.expenses) {
    applyExpense(totals, expense);
  }

  return Object.entries(totals).map(([memberId, net]) => ({
    memberId,
    net: roundMoney(net),
  }));
}

export function calculateSettlements(balances: MemberBalance[]): Settlement[] {
  const creditors = balances
    .filter((b) => b.net > 0)
    .map((b) => ({ ...b }));
  const debtors = balances
    .filter((b) => b.net < 0)
    .map((b) => ({ ...b, net: Math.abs(b.net) }));

  const settlements: Settlement[] = [];
  let i = 0;
  let j = 0;

  while (i < debtors.length && j < creditors.length) {
    const debtor = debtors[i];
    const creditor = creditors[j];
    const amount = Math.min(debtor.net, creditor.net);

    if (amount > 0) {
      settlements.push({
        fromId: debtor.memberId,
        toId: creditor.memberId,
        amount: roundMoney(amount),
      });
      debtor.net = roundMoney(debtor.net - amount);
      creditor.net = roundMoney(creditor.net - amount);
    }

    if (debtor.net <= 0.0001) i += 1;
    if (creditor.net <= 0.0001) j += 1;
  }

  return settlements;
}

function applyExpense(totals: Record<string, number>, expense: Expense) {
  const count = expense.participantIds.length || 1;
  const share = expense.amount / count;

  for (const participantId of expense.participantIds) {
    totals[participantId] = (totals[participantId] || 0) - share;
  }

  totals[expense.paidById] = (totals[expense.paidById] || 0) + expense.amount;
}

function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}
