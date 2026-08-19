import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { and, desc, eq, gt, inArray, sql } from "drizzle-orm";
import NextAuth from "next-auth";
import Google from "next-auth/providers/google";

import { getDb } from "@/db";
import { accounts, authenticators, sessions, users, verificationTokens } from "@/db/schema";
import type { UserRole, UserStatus } from "@/lib/auth/permissions";
import { requireAuthEnv } from "@/lib/env";

export const { handlers, auth, signIn, signOut } = NextAuth(() => {
  // This lazy boundary is reached by real auth/session requests, not by module
  // evaluation during `next build`. No development secret is ever substituted.
  const env = requireAuthEnv();
  const database = getDb();
  const adapter = DrizzleAdapter(database, {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
    authenticatorsTable: authenticators,
  });

  // The database enforces case-insensitive email uniqueness. Match that same
  // identity rule when Auth.js looks up a pre-provisioned account.
  adapter.getUserByEmail = async (email) => {
    const [user] = await database
      .select()
      .from(users)
      .where(sql`lower(${users.email}) = lower(${email})`)
      .limit(1);
    if (!user) return null;
    return { ...user, email: user.email ?? email };
  };

  const maxActiveSessionsPerUser = 2;

  return {
    adapter,
    secret: env.AUTH_SECRET,
    // Database sessions let us enforce device limits and revoke the oldest sessions
    // when a user exceeds the maximum active session count.
    // This keeps middleware authorization fast while preventing unlimited concurrent logins.
    providers: [
      Google({
        clientId: env.AUTH_GOOGLE_ID,
        clientSecret: env.AUTH_GOOGLE_SECRET,
        // Google verifies the email claim. This permits a pre-provisioned
        // staff user to attach Google without introducing another login method.
        allowDangerousEmailAccountLinking: true,
        authorization: {
          params: {
            prompt: "select_account",
          },
        },
      }),
    ],
    pages: {
      signIn: "/login",
      error: "/login",
    },
    session: {
      strategy: "database",
      maxAge: 24 * 60 * 60,
    },
    callbacks: {
      async signIn({ account, profile, user }) {
        if (account?.provider !== "google") return false;

        if (profile?.email_verified !== true) return false;

        // Existing linked users include application fields from the adapter.
        // Deny disabled identities before issuing a new session.
        if (user.status && user.status !== "ACTIVE") return false;
        if (user.googleId && user.googleId !== account.providerAccountId) return false;

        // A staff account may be provisioned by email before its first login.
        // Check that record before Auth.js performs trusted Google email linking.
        if (!user.status && user.email) {
          const [provisionedUser] = await database
            .select({ googleId: users.googleId, status: users.status })
            .from(users)
            .where(sql`lower(${users.email}) = lower(${user.email})`)
            .limit(1);

          if (provisionedUser?.status && provisionedUser.status !== "ACTIVE") return false;
          if (provisionedUser?.googleId && provisionedUser.googleId !== account.providerAccountId) return false;
        }

        if (!user.id) return false;
        const now = new Date();
        const [currentUser] = await database
          .update(users)
          .set({
            googleId: account.providerAccountId,
            lastLoginAt: now,
            updatedAt: now,
          })
          .where(and(eq(users.id, user.id), eq(users.status, "ACTIVE")))
          .returning({ id: users.id, role: users.role, status: users.status });

        // Fail closed if the user was removed or disabled between callback and DB write.
        if (!currentUser) return false;

        return true;
      },
      async session({ session, user }) {
        const appSession = session as typeof session & {
          user: {
            id: string;
            role: UserRole;
            status: UserStatus;
          };
        };
        appSession.user.id = user.id;
        appSession.user.role = (user.role as UserRole) ?? "READER";
        // Missing legacy authorization claims fail closed at protected routes.
        appSession.user.status = (user.status as UserStatus) ?? "SUSPENDED";
        return appSession;
      },
    },
    events: {
      async signIn({ user, session }) {
        if (!user?.id || !session?.sessionToken) return;

        const now = new Date();
        const activeSessions = await database
          .select({ sessionToken: sessions.sessionToken, expires: sessions.expires })
          .from(sessions)
          .where(and(eq(sessions.userId, user.id), gt(sessions.expires, now)))
          .orderBy(desc(sessions.expires));

        const keep = new Set<string>([session.sessionToken]);
        for (const activeSession of activeSessions) {
          if (keep.size >= maxActiveSessionsPerUser) break;
          keep.add(activeSession.sessionToken);
        }

        const toDelete = activeSessions
          .map((activeSession) => activeSession.sessionToken)
          .filter((sessionToken) => !keep.has(sessionToken));

        if (toDelete.length === 0) return;

        await database.delete(sessions).where(inArray(sessions.sessionToken, toDelete));
      },
    },
  };
});
