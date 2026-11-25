import { Zap } from "lucide-react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { currentUser, devLoginEnabled, oauthProviders } from "@/lib/auth";
import { devSignInAction, oauthSignInAction } from "@/lib/auth-actions";
import { PasswordLoginForm } from "@/components/auth/password-login-form";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "登录" };

export default async function LoginPage() {
  const user = await currentUser();
  if (user) redirect("/notes");

  const hasOauth = oauthProviders.length > 0;

  const configIssues: string[] = [];
  if (!process.env.AUTH_SECRET) {
    configIssues.push(
      "AUTH_SECRET 未设置：Auth.js 会直接拒绝所有登录请求（表现为 Server error）",
    );
  }
  if (process.env.VERCEL && !process.env.DATABASE_URL) {
    configIssues.push(
      "DATABASE_URL 未设置：Vercel 的只读文件系统无法使用本地 PGlite",
    );
  }

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-6 py-16">
      <div className="w-full max-w-[360px]">
        <div className="mb-8 flex flex-col items-center text-center">
          <span className="mb-5 flex size-8 items-center justify-center rounded-[6px] bg-primary text-signal shadow-paper">
            <Zap className="size-4" fill="currentColor" strokeWidth={0} />
          </span>
          <h1 className="font-reading text-[34px] font-semibold leading-none tracking-[-0.03em] text-foreground">
            第二大脑
          </h1>
          <p className="mt-2.5 text-[12.5px] leading-relaxed text-muted-foreground">
            记录、检索、关联。你的私人知识库。
          </p>
        </div>

        <div className="mb-7 grid grid-cols-3 border-y border-border py-3 text-center">
          {[
            { no: "01", label: "记录" },
            { no: "02", label: "检索" },
            { no: "03", label: "关联" },
          ].map((item, index) => (
            <div
              key={item.no}
              className={
                index > 0
                  ? "border-l border-border"
                  : ""
              }
            >
              <p className="font-mono text-[10px] tracking-widest text-signal">{item.no}</p>
              <p className="mt-0.5 font-reading text-[14px] font-semibold">{item.label}</p>
            </div>
          ))}
        </div>

        {configIssues.length > 0 ? (
          <div className="mb-4 rounded-[var(--radius-md)] border border-danger/40 bg-danger/5 p-3">
            <p className="text-[12px] font-semibold text-danger">部署配置未完成</p>
            <ul className="mt-1.5 space-y-1">
              {configIssues.map((issue) => (
                <li
                  key={issue}
                  className="flex gap-1.5 text-[11.5px] leading-relaxed text-muted-foreground"
                >
                  <span className="text-danger">·</span>
                  {issue}
                </li>
              ))}
            </ul>
            <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground/80">
              Vercel → Settings → Environment Variables 添加后需要 Redeploy 才会生效。
            </p>
          </div>
        ) : null}

        <PasswordLoginForm />

        <div className="space-y-2.5 pt-4">
          {oauthProviders.length > 0 ? (
            <div className="flex items-center gap-3 pb-1">
              <span className="h-px flex-1 bg-border" />
              <span className="text-[11px] tracking-wide text-muted-foreground">或使用第三方账号</span>
              <span className="h-px flex-1 bg-border" />
            </div>
          ) : null}

          {oauthProviders.some((p) => p.id === "github") ? (
            <form action={oauthSignInAction.bind(null, "github")}>
              <Button type="submit" size="lg" variant="outline" className="w-full">
                <GitHubMark />
                使用 GitHub 继续
              </Button>
            </form>
          ) : null}

          {oauthProviders.some((p) => p.id === "google") ? (
            <form action={oauthSignInAction.bind(null, "google")}>
              <Button type="submit" size="lg" variant="outline" className="w-full">
                <GoogleMark />
                使用 Google 继续
              </Button>
            </form>
          ) : null}

          {devLoginEnabled ? (
            <>
              {hasOauth ? (
                <div className="flex items-center gap-3 py-1">
                  <span className="h-px flex-1 bg-border" />
                  <span className="text-[11px] tracking-wide text-muted-foreground">或</span>
                  <span className="h-px flex-1 bg-border" />
                </div>
              ) : null}
              <form action={devSignInAction}>
                <Button type="submit" size="lg" variant="outline" className="w-full">
                  本地快捷登录
                </Button>
              </form>
              <p className="pt-1 text-center text-[11.5px] leading-relaxed text-muted-foreground">
                未配置 OAuth 凭证时使用，仅开发环境可用
              </p>
            </>
          ) : null}

          {!hasOauth && !devLoginEnabled ? (
            <p className="text-center text-[11px] leading-relaxed text-muted-foreground/70">
              第三方登录未配置。用上面的账号密码登录即可；
              需要 GitHub / Google 登录时再补 OAuth 变量。
            </p>
          ) : null}
        </div>

        <p className="mt-12 text-center text-[10.5px] text-muted-foreground/60">
          Next.js · Neon Postgres · Vercel
        </p>
      </div>
    </div>
  );
}

function GitHubMark() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden className="size-4 fill-current">
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82a7.4 7.4 0 0 1 2-.27c.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z" />
    </svg>
  );
}

function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="size-4">
      <path
        fill="#4285F4"
        d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.7-2.4 3.5v2.9h3.8c2.2-2 3.6-5 3.6-8.6Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.2 0 5.9-1.1 7.9-2.9l-3.8-2.9c-1.1.7-2.4 1.1-4.1 1.1-3.1 0-5.8-2.1-6.7-4.9H1.4v3C3.4 21.4 7.4 24 12 24Z"
      />
      <path fill="#FBBC05" d="M5.3 14.4a7.2 7.2 0 0 1 0-4.6v-3H1.4a12 12 0 0 0 0 10.6l3.9-3Z" />
      <path
        fill="#EA4335"
        d="M12 4.8c1.8 0 3.3.6 4.6 1.8l3.4-3.4C17.9 1.2 15.2 0 12 0 7.4 0 3.4 2.6 1.4 6.8l3.9 3C6.2 6.9 8.9 4.8 12 4.8Z"
      />
    </svg>
  );
}
