import {
    createUserWithEmailAndPassword,
    fetchSignInMethodsForEmail,
    onAuthStateChanged,
    sendEmailVerification,
    sendPasswordResetEmail,
    signInWithEmailAndPassword,
    signOut,
    updatePassword,
    updateProfile,
} from 'firebase/auth';
import React, { createContext, useContext, useEffect, useMemo, useReducer } from 'react';

import { calculateBalances } from './calc';
import { auth } from './firebase';
import { registerForPushNotificationsAsync } from './notifications';
import {
    acceptInvite,
    addExpense as addExpenseRemote,
    createGroup as createGroupRemote,
    deleteExpense as deleteExpenseRemote,
    deleteGroup,
    ensureUserProfile,
    leaveGroup,
    listenPendingInvites,
    listenUserGroups,
    listenUserProfile,
    rejectInvite,
    removeMemberFromGroup,
    requestJoinByCode,
    savePushToken,
    setPremium,
} from './rtdb';
import { AppState, Expense, Group, GroupInvite, Member, User } from './types';

type StoreState = {
  ready: boolean;
  data: AppState;
};

type StoreActions = {
  signUp: (params: { name: string; email: string; password: string }) => Promise<{
    ok: boolean;
    message?: string;
    needsVerification?: boolean;
  }>;
  signIn: (params: { email: string; password: string }) => Promise<{
    ok: boolean;
    message?: string;
    needsVerification?: boolean;
  }>;
  signOut: () => Promise<void>;
  createGroup: (params: { name: string; currency: string }) => Promise<Group>;
  addExpense: (groupId: string, expense: Omit<Expense, 'id' | 'createdAt'>) => Promise<void>;
  requestJoinByCode: (code: string) => Promise<{ ok: boolean; message?: string }>;
  acceptInvite: (inviteId: string) => Promise<void>;
  rejectInvite: (inviteId: string) => Promise<void>;
  togglePremium: (value: boolean) => Promise<void>;
  leaveGroup: (groupId: string) => Promise<void>;
  removeMember: (groupId: string, memberId: string) => Promise<void>;
  deleteGroup: (groupId: string) => Promise<void>;
  deleteExpense: (groupId: string, expenseId: string) => Promise<void>;
  changePassword: (params: { currentPassword: string; newPassword: string }) => Promise<{
    ok: boolean;
    message?: string;
  }>;
  sendPasswordResetEmail: (email: string) => Promise<{ ok: boolean; message?: string }>;
  revokePremium: () => Promise<void>;
};

type StoreContextValue = {
  state: AppState;
  ready: boolean;
  actions: StoreActions;
};

type Action =
  | { type: 'RESET' }
  | { type: 'SET_USER'; payload: User | null }
  | { type: 'SET_GROUPS'; payload: Group[] }
  | { type: 'SET_PENDING_INVITES'; payload: GroupInvite[] };

const defaultState: StoreState = {
  ready: false,
  data: {
    user: null,
    groups: [],
    pendingInvites: [],
  },
};

const StoreContext = createContext<StoreContextValue | null>(null);

const getAuthErrorMessage = (error: unknown, fallback: string) => {
  if (!error || typeof error !== 'object') {
    return fallback;
  }
  const code = 'code' in error ? String((error as { code?: string }).code) : '';
  switch (code) {
    case 'auth/email-already-in-use':
      return 'Ese correo ya esta registrado. Inicia sesion.';
    case 'auth/invalid-email':
      return 'El correo no es valido.';
    case 'auth/weak-password':
      return 'La contrasena es muy corta. Usa al menos 6 caracteres.';
    case 'auth/operation-not-allowed':
    case 'auth/admin-restricted-operation':
      return 'El registro por correo no esta habilitado en Firebase.';
    case 'auth/network-request-failed':
      return 'No hay conexion o la red bloquea Firebase.';
    case 'auth/too-many-requests':
      return 'Demasiados intentos. Espera un momento y vuelve a intentar.';
    case 'auth/app-not-authorized':
    case 'auth/invalid-api-key':
      return 'La app no esta autorizada con estas credenciales de Firebase.';
    case 'auth/user-disabled':
      return 'Este usuario esta deshabilitado.';
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'Credenciales invalidas. Revisa tu correo o contrasena.';
    case 'auth/missing-email':
      return 'Falta el correo.';
    case 'auth/missing-password':
      return 'Falta la contrasena.';
    default:
      return fallback;
  }
};

function reducer(state: StoreState, action: Action): StoreState {
  switch (action.type) {
    case 'RESET':
      return { ...defaultState, ready: true };
    case 'SET_USER':
      return {
        ...state,
        ready: true,
        data: { ...state.data, user: action.payload },
      };
    case 'SET_GROUPS':
      return {
        ...state,
        data: { ...state.data, groups: action.payload },
      };
    case 'SET_PENDING_INVITES':
      return {
        ...state,
        data: { ...state.data, pendingInvites: action.payload },
      };
    default:
      return state;
  }
}

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, defaultState);

  useEffect(() => {
    let unsubscribeGroups: (() => void) | null = null;
    let unsubscribeInvites: (() => void) | null = null;
    let unsubscribeProfile: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, (firebaseUser) => {
      unsubscribeGroups?.();
      unsubscribeInvites?.();
      unsubscribeProfile?.();

      if (!firebaseUser) {
        dispatch({ type: 'RESET' });
        return;
      }

      const baseUser: User = {
        id: firebaseUser.uid,
        name: firebaseUser.displayName || 'Roomie',
        email: firebaseUser.email || 'sin-email',
        premium: false,
      };
      dispatch({ type: 'SET_USER', payload: baseUser });

      void (async () => {
        await ensureUserProfile(firebaseUser);
        unsubscribeProfile = listenUserProfile(firebaseUser.uid, (user) => {
          dispatch({ type: 'SET_USER', payload: user });
        });
        unsubscribeGroups = listenUserGroups(firebaseUser.uid, (groups) => {
          dispatch({ type: 'SET_GROUPS', payload: groups });
        });
        unsubscribeInvites = listenPendingInvites(firebaseUser.uid, (invites) => {
          dispatch({ type: 'SET_PENDING_INVITES', payload: invites });
        });

        const token = await registerForPushNotificationsAsync();
        if (token) {
          await savePushToken({ userId: firebaseUser.uid, token });
        }
      })();
    });

    return () => {
      unsubscribeAuth();
      unsubscribeGroups?.();
      unsubscribeInvites?.();
      unsubscribeProfile?.();
    };
  }, []);

  const actions = useMemo<StoreActions>(() => {
    return {
      signUp: async ({ name, email, password }) => {
        try {
          const trimmedEmail = email.trim().toLowerCase();
          const methods = await fetchSignInMethodsForEmail(auth, trimmedEmail);
          if (methods.length > 0) {
            return {
              ok: false,
              message: 'Ese correo ya esta registrado. Inicia sesion.',
            };
          }
          const result = await createUserWithEmailAndPassword(auth, trimmedEmail, password);
          await updateProfile(result.user, { displayName: name.trim() });
          await sendEmailVerification(result.user);
          await signOut(auth);
          return {
            ok: true,
            needsVerification: true,
            message: 'Te enviamos un correo de verificacion. Revisa tu bandeja.',
          };
        } catch (error) {
          console.warn('signUp failed', error);
          return {
            ok: false,
            message: getAuthErrorMessage(
              error,
              'No se pudo crear la cuenta. Revisa los datos.',
            ),
          };
        }
      },
      signIn: async ({ email, password }) => {
        try {
          const trimmedEmail = email.trim().toLowerCase();
          const result = await signInWithEmailAndPassword(auth, trimmedEmail, password);
          await result.user.reload();
          if (!result.user.emailVerified) {
            await sendEmailVerification(result.user);
            await signOut(auth);
            return {
              ok: false,
              needsVerification: true,
              message: 'Tu correo no esta verificado. Te reenviamos el correo.',
            };
          }
          return { ok: true };
        } catch (error) {
          console.warn('signIn failed', error);
          return {
            ok: false,
            message: getAuthErrorMessage(
              error,
              'Credenciales invalidas. Revisa tu correo o contrasena.',
            ),
          };
        }
      },
      signOut: async () => {
        await signOut(auth);
      },
      createGroup: async ({ name, currency }) => {
        if (!state.data.user) {
          throw new Error('Necesitas iniciar sesion');
        }
        const owner: Member = {
          id: state.data.user.id,
          name: state.data.user.name,
        };
        try {
          console.log('createGroup: store start', {
            ownerId: owner.id,
            name,
            currency,
          });
          return await createGroupRemote({ name, currency, owner });
        } catch (error) {
          console.error('createGroup failed', error);
          throw error;
        }
      },
      addExpense: async (groupId, expense) => {
        await addExpenseRemote(groupId, expense);
      },
      requestJoinByCode: async (code) => {
        if (!state.data.user) {
          return { ok: false, message: 'Necesitas iniciar sesion.' };
        }
        return requestJoinByCode({
          code,
          user: { id: state.data.user.id, name: state.data.user.name },
        });
      },
      acceptInvite: async (inviteId) => {
        if (!state.data.user) return;
        await acceptInvite({ inviteId, adminId: state.data.user.id });
      },
      rejectInvite: async (inviteId) => {
        if (!state.data.user) return;
        await rejectInvite({ inviteId, adminId: state.data.user.id });
      },
      togglePremium: async (value) => {
        if (!state.data.user) return;
        await setPremium(state.data.user.id, value);
      },
      leaveGroup: async (groupId) => {
        if (!state.data.user) throw new Error('Necesitas iniciar sesion');
        await leaveGroup({ groupId, userId: state.data.user.id });
      },
      removeMember: async (groupId, memberId) => {
        if (!state.data.user) throw new Error('Necesitas iniciar sesion');
        await removeMemberFromGroup({ groupId, memberId, adminId: state.data.user.id });
      },
      deleteGroup: async (groupId) => {
        if (!state.data.user) throw new Error('Necesitas iniciar sesion');
        await deleteGroup({ groupId, adminId: state.data.user.id });
      },
      deleteExpense: async (groupId, expenseId) => {
        if (!state.data.user) return;
        await deleteExpenseRemote({ groupId, expenseId });
      },
      changePassword: async ({ currentPassword, newPassword }) => {
        try {
          const user = auth.currentUser;
          if (!user || !user.email) {
            return { ok: false, message: 'No hay usuario autenticado' };
          }
          // Re-autenticar primero con la contraseña actual
          await signInWithEmailAndPassword(auth, user.email, currentPassword);
          // Cambiar a la nueva contraseña
          await updatePassword(user, newPassword);
          return { ok: true, message: 'Contraseña actualizada exitosamente' };
        } catch (error) {
          console.warn('changePassword failed', error);
          const code = error && typeof error === 'object' && 'code' in error ? String(error.code) : '';
          if (code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
            return { ok: false, message: 'La contraseña actual es incorrecta' };
          }
          if (code === 'auth/weak-password') {
            return { ok: false, message: 'La nueva contraseña es muy débil. Usa al menos 6 caracteres' };
          }
          return {
            ok: false,
            message: 'No se pudo cambiar la contraseña. Intenta de nuevo',
          };
        }
      },
      sendPasswordResetEmail: async (email) => {
        try {
          await sendPasswordResetEmail(auth, email.trim().toLowerCase());
          return {
            ok: true,
            message: 'Te enviamos un correo para restablecer tu contraseña',
          };
        } catch (error) {
          console.warn('sendPasswordResetEmail failed', error);
          return {
            ok: false,
            message: 'No se pudo enviar el correo. Verifica tu email',
          };
        }
      },
      revokePremium: async () => {
        if (!state.data.user) return;
        await setPremium(state.data.user.id, false);
      },
    };
  }, [state.data.user]);

  const value: StoreContextValue = {
    state: state.data,
    ready: state.ready,
    actions,
  };

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used inside StoreProvider');
  return ctx;
}

export function useGroupBalances(group: Group) {
  return calculateBalances(group);
}
