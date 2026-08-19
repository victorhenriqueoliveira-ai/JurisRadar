/**
 * Layout do grupo de rotas (onboarding).
 * Layout mínimo: sem sidebar, sem header — apenas o conteúdo do wizard.
 */
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Bem-vindo ao JurisRadar',
};

export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body className="bg-background text-foreground antialiased">
        {children}
      </body>
    </html>
  );
}
