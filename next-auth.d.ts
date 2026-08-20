import type { MemberRole, SubscriptionStatus } from '@/types/domain'
import type { DefaultSession } from 'next-auth'
import type { JWT as DefaultJWT } from 'next-auth/jwt'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      orgId: string
      role: MemberRole
      subscriptionStatus: SubscriptionStatus
    } & DefaultSession['user']
  }
}

declare module 'next-auth/jwt' {
  interface JWT extends DefaultJWT {
    id?: string
    orgId?: string
    role?: string
    subscriptionStatus?: string
  }
}
