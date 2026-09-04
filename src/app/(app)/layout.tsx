import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { Sidebar } from '@/components/layout/Sidebar';
import { AppHeader } from '@/components/layout/AppHeader';
import { TrialBanner } from '@/components/billing/TrialBanner';

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session) redirect('/login');

  const trialEndsAt = (session.user as { trialEndsAt?: Date | string | null }).trialEndsAt
  const trialEndsAtDate =
    trialEndsAt instanceof Date
      ? trialEndsAt
      : trialEndsAt
        ? new Date(trialEndsAt)
        : null

  const subscriptionStatus =
    (session.user as { subscriptionStatus?: string }).subscriptionStatus ?? ''

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <div className="flex flex-col flex-1 overflow-hidden">
        <AppHeader session={session} />
        <TrialBanner trialEndsAt={trialEndsAtDate} status={subscriptionStatus} />
        <main className="flex-1 overflow-auto p-6 flex flex-col">{children}</main>
      </div>
    </div>
  );
}
