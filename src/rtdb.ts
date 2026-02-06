import type { User as FirebaseUser } from 'firebase/auth';
import {
    FieldPath,
    collection,
    doc,
    getDoc,
    getDocs,
    limit,
    onSnapshot,
    orderBy,
    query,
    setDoc,
    updateDoc,
    where,
    writeBatch,
} from 'firebase/firestore';

import { db } from './firebase';
import type { Expense, Group, GroupInvite, Member, User } from './types';
import { createInviteCode } from './utils';

type FSGroup = {
  name: string;
  currency: string;
  adminId: string;
  inviteCode: string;
  memberIds: Record<string, boolean>;
  members: Record<string, Member>;
  createdAt: number;
  updatedAt: number;
};

type FSInvite = {
  groupId: string;
  groupName: string;
  adminId: string;
  requesterId: string;
  requesterName: string;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: number;
  updatedAt: number;
};

function toGroupBase(id: string, data: FSGroup): Group {
  const members = data.members 
    ? Object.values(data.members).filter((m): m is Member => m !== null && m !== undefined) 
    : [];
  return {
    id,
    name: data.name,
    currency: data.currency,
    members,
    expenses: [],
    adminId: data.adminId,
    inviteCode: data.inviteCode,
  };
}

export async function ensureUserProfile(firebaseUser: FirebaseUser) {
  const userRef = doc(db, 'users', firebaseUser.uid);
  const snapshot = await getDoc(userRef);
  const payload: User = {
    id: firebaseUser.uid,
    name: firebaseUser.displayName || 'Roomie',
    email: firebaseUser.email || 'sin-email',
    premium: false,
  };
  if (!snapshot.exists()) {
    await setDoc(userRef, { ...payload, pushTokens: {} });
  } else {
    await updateDoc(userRef, { name: payload.name, email: payload.email });
  }
}

export function listenUserProfile(userId: string, onChange: (user: User) => void) {
  const userRef = doc(db, 'users', userId);
  return onSnapshot(userRef, (snapshot) => {
    if (!snapshot.exists()) return;
    const data = snapshot.data() as User;
    onChange({ ...data, id: userId });
  });
}

export function listenUserGroups(userId: string, onChange: (groups: Group[]) => void) {
  const groupsQuery = query(
    collection(db, 'groups'),
    where(new FieldPath('memberIds', userId), '==', true)
  );
  const groupEntries = new Map<
    string,
    {
      base: Group;
      expenses: Expense[];
      unsubscribeExpenses: () => void;
    }
  >();

  const emit = () => {
    onChange(
      Array.from(groupEntries.values()).map((entry) => ({
        ...entry.base,
        expenses: entry.expenses,
      }))
    );
  };

  const unsubscribeGroups = onSnapshot(groupsQuery, (snapshot) => {
    const activeIds = new Set<string>();

    snapshot.forEach((docSnap) => {
      activeIds.add(docSnap.id);
      const data = docSnap.data() as FSGroup;
      const baseGroup = toGroupBase(docSnap.id, data);
      const existing = groupEntries.get(docSnap.id);

      if (existing) {
        existing.base = baseGroup;
        return;
      }

      const expensesQuery = query(
        collection(db, 'groups', docSnap.id, 'expenses'),
        orderBy('createdAt', 'desc')
      );
      const entry = {
        base: baseGroup,
        expenses: [] as Expense[],
        unsubscribeExpenses: () => {},
      };
      entry.unsubscribeExpenses = onSnapshot(expensesQuery, (expenseSnap) => {
        entry.expenses = expenseSnap.docs.map((expenseDoc) => {
          const expense = expenseDoc.data() as Expense;
          return { ...expense, id: expense.id || expenseDoc.id };
        });
        emit();
      });
      groupEntries.set(docSnap.id, entry);
    });

    groupEntries.forEach((entry, groupId) => {
      if (!activeIds.has(groupId)) {
        entry.unsubscribeExpenses();
        groupEntries.delete(groupId);
      }
    });

    emit();
  });

  return () => {
    unsubscribeGroups();
    groupEntries.forEach((entry) => entry.unsubscribeExpenses());
    groupEntries.clear();
  };
}

export function listenPendingInvites(
  adminId: string,
  onChange: (invites: GroupInvite[]) => void
) {
  const invitesQuery = query(collection(db, 'groupInvites'), where('adminId', '==', adminId));
  return onSnapshot(invitesQuery, (snapshot) => {
    const invites = snapshot.docs
      .map((docSnap) => ({ id: docSnap.id, ...(docSnap.data() as FSInvite) }))
      .filter((invite) => invite.status === 'pending')
      .map((invite) => ({
        id: invite.id,
        groupId: invite.groupId,
        groupName: invite.groupName,
        adminId: invite.adminId,
        requesterId: invite.requesterId,
        requesterName: invite.requesterName,
        status: invite.status,
        createdAt: invite.createdAt,
      }));
    onChange(invites);
  });
}

export async function createGroup(params: {
  name: string;
  currency: string;
  owner: Member;
}): Promise<Group> {
  const now = Date.now();
  const inviteCode = createInviteCode();
  const payload: FSGroup = {
    name: params.name,
    currency: params.currency,
    adminId: params.owner.id,
    inviteCode,
    memberIds: { [params.owner.id]: true },
    members: { [params.owner.id]: params.owner },
    createdAt: now,
    updatedAt: now,
  };
  const groupRef = doc(collection(db, 'groups'));
  console.log('createGroup: firestore write start', {
    groupId: groupRef.id,
    ownerId: params.owner.id,
  });
  await setDoc(groupRef, payload);
  console.log('createGroup: firestore write done', { groupId: groupRef.id });
  return toGroupBase(groupRef.id, payload);
}

export async function addExpense(groupId: string, expense: Omit<Expense, 'id' | 'createdAt'>) {
  const now = Date.now();
  const expenseRef = doc(collection(db, 'groups', groupId, 'expenses'));
  const payload: Expense = {
    ...expense,
    id: expenseRef.id,
    createdAt: now,
  };
  await setDoc(expenseRef, payload);
  await updateDoc(doc(db, 'groups', groupId), { updatedAt: now });
}

export async function requestJoinByCode(params: {
  code: string;
  user: Member;
}): Promise<{ ok: boolean; message?: string }> {
  const trimmed = params.code.trim().toUpperCase();
  if (!trimmed) {
    return { ok: false, message: 'Ingresa un codigo valido.' };
  }
  const groupsQuery = query(
    collection(db, 'groups'),
    where('inviteCode', '==', trimmed),
    limit(1)
  );
  const snapshot = await getDocs(groupsQuery);
  if (snapshot.empty) {
    return { ok: false, message: 'No encontramos un grupo con ese codigo.' };
  }
  const groupDoc = snapshot.docs[0];
  const groupData = groupDoc.data() as FSGroup;
  if (groupData.memberIds?.[params.user.id]) {
    return { ok: false, message: 'Ya perteneces a ese grupo.' };
  }
  const inviteId = `${groupDoc.id}_${params.user.id}`;
  const inviteRef = doc(db, 'groupInvites', inviteId);
  const existing = await getDoc(inviteRef);
  if (existing.exists()) {
    const data = existing.data() as FSInvite;
    if (data.status === 'pending') {
      return { ok: false, message: 'Tu solicitud ya esta pendiente.' };
    }
  }
  const now = Date.now();
  const finalInviteRef = existing.exists()
    ? doc(db, 'groupInvites', `${groupDoc.id}_${params.user.id}_${now}`)
    : inviteRef;
  const payload: FSInvite = {
    groupId: groupDoc.id,
    groupName: groupData.name,
    adminId: groupData.adminId,
    requesterId: params.user.id,
    requesterName: params.user.name,
    status: 'pending',
    createdAt: now,
    updatedAt: now,
  };
  await setDoc(finalInviteRef, payload);
  return { ok: true };
}

export async function acceptInvite(params: { inviteId: string; adminId: string }) {
  const inviteRef = doc(db, 'groupInvites', params.inviteId);
  const inviteSnap = await getDoc(inviteRef);
  if (!inviteSnap.exists()) {
    throw new Error('Solicitud no encontrada');
  }
  const invite = inviteSnap.data() as FSInvite;
  if (invite.adminId !== params.adminId) {
    throw new Error('No autorizado');
  }
  const now = Date.now();
  const groupRef = doc(db, 'groups', invite.groupId);
  const batch = writeBatch(db);
  batch.update(
    groupRef,
    new FieldPath('memberIds', invite.requesterId),
    true,
    new FieldPath('members', invite.requesterId),
    {
      id: invite.requesterId,
      name: invite.requesterName,
    },
    'updatedAt',
    now
  );
  batch.update(inviteRef, { status: 'accepted', updatedAt: now });
  await batch.commit();
}

export async function rejectInvite(params: { inviteId: string; adminId: string }) {
  const inviteRef = doc(db, 'groupInvites', params.inviteId);
  const inviteSnap = await getDoc(inviteRef);
  if (!inviteSnap.exists()) {
    throw new Error('Solicitud no encontrada');
  }
  const invite = inviteSnap.data() as FSInvite;
  if (invite.adminId !== params.adminId) {
    throw new Error('No autorizado');
  }
  const now = Date.now();
  await updateDoc(inviteRef, { status: 'rejected', updatedAt: now });
}

export async function savePushToken(params: { userId: string; token: string }) {
  const tokenRef = doc(db, 'users', params.userId, 'pushTokens', params.token);
  await setDoc(tokenRef, { enabled: true });
}

export async function setPremium(userId: string, value: boolean) {
  await updateDoc(doc(db, 'users', userId), { premium: value });
}

export async function leaveGroup(params: { groupId: string; userId: string }) {
  const groupRef = doc(db, 'groups', params.groupId);
  const groupSnap = await getDoc(groupRef);
  if (!groupSnap.exists()) {
    throw new Error('Grupo no encontrado');
  }
  const groupData = groupSnap.data() as FSGroup;
  if (groupData.adminId === params.userId) {
    throw new Error('El admin no puede abandonar el grupo. Transfiere el rol de admin primero.');
  }
  const now = Date.now();
  const batch = writeBatch(db);
  batch.update(
    groupRef,
    new FieldPath('memberIds', params.userId),
    false,
    new FieldPath('members', params.userId),
    null,
    'updatedAt',
    now
  );
  await batch.commit();
}

export async function removeMemberFromGroup(params: {
  groupId: string;
  memberId: string;
  adminId: string;
}) {
  const groupRef = doc(db, 'groups', params.groupId);
  const groupSnap = await getDoc(groupRef);
  if (!groupSnap.exists()) {
    throw new Error('Grupo no encontrado');
  }
  const groupData = groupSnap.data() as FSGroup;
  if (groupData.adminId !== params.adminId) {
    throw new Error('Solo el admin puede remover miembros');
  }
  if (groupData.adminId === params.memberId) {
    throw new Error('No puedes removerte a ti mismo como admin');
  }
  const now = Date.now();
  const batch = writeBatch(db);
  batch.update(
    groupRef,
    new FieldPath('memberIds', params.memberId),
    false,
    new FieldPath('members', params.memberId),
    null,
    'updatedAt',
    now
  );
  await batch.commit();
}

export async function deleteGroup(params: { groupId: string; adminId: string }) {
  const groupRef = doc(db, 'groups', params.groupId);
  const groupSnap = await getDoc(groupRef);
  if (!groupSnap.exists()) {
    throw new Error('Grupo no encontrado');
  }
  const groupData = groupSnap.data() as FSGroup;
  if (groupData.adminId !== params.adminId) {
    throw new Error('Solo el admin puede eliminar el grupo');
  }
  
  // Eliminar todos los gastos del grupo (subcolección)
  const expensesQuery = query(collection(db, 'groups', params.groupId, 'expenses'));
  const expensesSnap = await getDocs(expensesQuery);
  
  const batch = writeBatch(db);
  
  // Eliminar cada gasto
  expensesSnap.docs.forEach((expenseDoc) => {
    batch.delete(expenseDoc.ref);
  });
  
  // Eliminar invitaciones pendientes del grupo
  const invitesQuery = query(
    collection(db, 'groupInvites'),
    where('groupId', '==', params.groupId)
  );
  const invitesSnap = await getDocs(invitesQuery);
  invitesSnap.docs.forEach((inviteDoc) => {
    batch.delete(inviteDoc.ref);
  });
  
  // Eliminar el grupo
  batch.delete(groupRef);
  
  await batch.commit();
}
