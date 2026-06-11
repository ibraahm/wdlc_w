import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { apiGetProfile } from '@/lib/api';
import ProfileClient from './ProfileClient';

export default async function ProfilePage() {
  const session = await getSession();
  if (!session) redirect('/login');

  let profile;
  try {
    profile = await apiGetProfile(session.accessToken);
  } catch {
    profile = null;
  }

  return <ProfileClient profile={profile} status={session.agent.status} />;
}
