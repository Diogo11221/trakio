import { Redirect } from 'expo-router';

/** No auth yet — every launch starts at onboarding. */
export default function Index() {
  return <Redirect href="/welcome" />;
}
