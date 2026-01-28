import { Redirect } from 'expo-router';

import { useStore } from '@/src/store';

export default function Index() {
  const { state, ready } = useStore();

  if (!ready) return null;

  return <Redirect href={state.user ? '/(app)' : '/(auth)'} />;
}
