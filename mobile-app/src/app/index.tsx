import { Redirect } from 'expo-router';
import { View } from 'react-native';

import { homeFor, useAuth } from '@/state/auth';
import { colors } from '@/theme/tokens';

/** Launch: resume the saved test session, otherwise start at onboarding. */
export default function Index() {
  const { state } = useAuth();
  if (state.status === 'loading') return <View style={{ flex: 1, backgroundColor: colors.bg }} />;
  if (state.status === 'signedOut') return <Redirect href="/welcome" />;
  return <Redirect href={homeFor(state.account)} />;
}
