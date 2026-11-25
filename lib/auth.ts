import { eq, sql } from "drizzle-orm";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import GitHub from "next-auth/providers/github";
import Google from "next-auth/providers/google";
import type { Provider } from "next-auth/providers";
import { verifyPassword } from "@/lib/auth/password";
import { getDb } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { seedWorkspace } from "@/lib/seed";

/**
 * 本地零配置：没有 AUTH_SECRET 时用一个开发专用密钥，生产缺失则直接报错（不静默降级）。
 */
if (!process.env.AUTH_SECRET && process.env.NODE_ENV !== "production") {
  process.env.AUTH_SECRET = "dev-only-secret-please-set-AUTH_SECRET";
}

export const devLoginEnabled =
  process.env.NODE_ENV !== "production" || process.env.AUTH_DEV_LOGIN === "true";

const DEV_EMAIL = process.env.AUTH_DEV_EMAIL ?? "dev@secondbrain.local";

const providers: Provider[] = [];
const oauthProviders: { id: "github" | "google"; name: string }[] = [];

if (process.env.AUTH_GITHUB_ID && process.env.AUTH_GITHUB_SECRET) {
  providers.push(
    GitHub({
      clientId: process.env.AUTH_GITHUB_ID,
      clientSecret: process.env.AUTH_GITHUB_SECRET,
      allowDangerousEmailAccountLinking: true,
    }),
  );
  oauthProviders.push({ id: "github", name: "GitHub" });
}

if (process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET) {
  providers.push(
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
      allowDangerousEmailAccountLinking: true,
    }),
  );
  oauthProviders.push({ id: "google", name: "Google" });
}

// 账号密码登录：不依赖任何第三方，生产环境的主要入口
providers.push(
  Credentials({
    id: "password",
    name: "账号密码",
    credentials: {
      identifier: { label: "账号", type: "text" },
      password: { label: "密码", type: "password" },
    },
    async authorize(raw) {
      const identifier = String(raw?.identifier ?? "").trim().toLowerCase();
      const password = String(raw?.password ?? "");
      if (!identifier || !password) return null;

      const db = await getDb();
      const [record] = await db
        .select()
        .from(users)
        .where(
          sql`lower(coalesce(${users.username}, '')) = ${identifier} or lower(coalesce(${users.email}, '')) = ${identifier}`,
        )
        .limit(1);

      if (!record || !verifyPassword(password, record.passwordHash)) return null;

      return {
        id: record.id,
        name: record.name,
        email: record.email,
        image: record.image,
      };
    },
  }),
);

// 无 OAuth 凭证时也能进系统：本地快捷登录（生产环境默认关闭）
providers.push(
  Credentials({
    id: "dev",
    name: "本地快捷登录",
    credentials: {},
    async authorize() {
      if (!devLoginEnabled) return null;
      return {
        id: DEV_EMAIL,
        email: DEV_EMAIL,
        name: process.env.AUTH_DEV_NAME ?? "魏工",
      };
    },
  }),
);

export { oauthProviders };

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  session: { strategy: "jwt", maxAge: 60 * 60 * 24 * 30 },
  pages: { signIn: "/login" },
  providers,
  callbacks: {
    async jwt({ token, user }) {
      // 只在首次登录时落库，后续请求不再打数据库
      if (user && !token.uid) {
        const email = user.email ?? `${user.id}@local`;
        const db = await getDb();
        const existing = await db.select().from(users).where(eq(users.email, email)).limit(1);
        let record = existing[0];
        if (!record) {
          const inserted = await db
            .insert(users)
            .values({
              email,
              name: user.name ?? null,
              image: user.image ?? null,
              emailVerified: new Date(),
            })
            .returning();
          record = inserted[0];
          await seedWorkspace(record.id);
        }
        token.uid = record.id;
        token.name = record.name ?? token.name;
        token.picture = record.image ?? token.picture;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.uid) {
        session.user.id = token.uid as string;
      }
      return session;
    },
  },
});

/** 服务端取当前用户，未登录返回 null */
export async function currentUser() {
  const session = await auth();
  if (!session?.user?.id) return null;
  return session.user;
}

/** 需要登录的场景：直接抛错，交给上层处理 */
export async function requireUserId(): Promise<string> {
  const user = await currentUser();
  if (!user) throw new Error("UNAUTHORIZED");
  return user.id;
}
