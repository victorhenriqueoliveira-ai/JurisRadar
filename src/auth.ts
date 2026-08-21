import NextAuth, { type NextAuthConfig } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { compare } from 'bcryptjs';
import { db } from '@/db';
import { users, orgMembers, subscriptions } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { verifyTotp } from '@/lib/auth/totp';

export const authConfig: NextAuthConfig = {
  providers: [
    Credentials({
      name: 'Credentials',
      credentials: {
        email: { label: 'E-mail', type: 'email' },
        password: { label: 'Senha', type: 'password' },
        totpCode: { label: 'Código 2FA', type: 'text' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const email = credentials.email as string;
        const password = credentials.password as string;
        const totpCode = credentials.totpCode as string | undefined;

        // Busca usuário pelo e-mail
        const result = await db
          .select()
          .from(users)
          .where(eq(users.email, email))
          .limit(1);

        const user = result[0];
        if (!user) {
          return null;
        }

        // Verifica senha com bcrypt
        const senhaCorreta = await compare(password, user.passwordHash);
        if (!senhaCorreta) {
          return null;
        }

        // Verifica 2FA se o usuário tiver TOTP configurado
        if (user.totpSecret) {
          if (!totpCode) {
            // Sinaliza que 2FA é necessário via erro especial
            throw new Error('TOTP_REQUIRED');
          }
          const totpValido = await verifyTotp(user.totpSecret, totpCode);
          if (!totpValido) {
            throw new Error('TOTP_INVALID');
          }
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name ?? undefined,
          systemRole: user.systemRole ?? 'user',
        };
      },
    }),
  ],
  session: {
    strategy: 'jwt',
  },
  pages: {
    signIn: '/login',
  },
  callbacks: {
    async jwt({ token, user }) {
      // Quando o usuário faz login, busca org e subscription
      if (user?.id) {
        token.id = user.id;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        token.systemRole = (user as any).systemRole ?? 'user';

        try {
          // Busca membro de organização
          const memberResult = await db
            .select({
              orgId: orgMembers.orgId,
              role: orgMembers.role,
            })
            .from(orgMembers)
            .where(eq(orgMembers.userId, user.id))
            .limit(1);

          const member = memberResult[0];

          if (member) {
            token.orgId = member.orgId;
            token.role = member.role;

            // Busca status da subscription da org
            const subResult = await db
              .select({ status: subscriptions.status })
              .from(subscriptions)
              .where(eq(subscriptions.orgId, member.orgId))
              .limit(1);

            const sub = subResult[0];
            token.subscriptionStatus = sub?.status ?? 'trialing';
          }
        } catch {
          // Em caso de erro, não bloqueia o login — orgId ficará ausente
          // e o middleware redirecionará para /onboarding
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (token?.id) {
        session.user.id = token.id as string;
      }
      if (token?.orgId) {
        session.user.orgId = token.orgId as string;
      }
      if (token?.role) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        session.user.role = token.role as any;
      }
      if (token?.subscriptionStatus) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        session.user.subscriptionStatus = token.subscriptionStatus as any;
      }
      if (token?.systemRole) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        session.user.systemRole = token.systemRole as any;
      }
      return session;
    },
  },
};

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);
