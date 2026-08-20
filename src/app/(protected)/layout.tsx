import SidebarLayout from '@/components/layout/SidebarLayout';

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <SidebarLayout>{children}</SidebarLayout>;
}
