"use client";

import { Loader2 } from "lucide-react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function PasswordLoginForm() {
  const router = useRouter();
  const [identifier, setIdentifier] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState(false);

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (pending) return;
    setError(null);
    setPending(true);
    try {
      const result = await signIn("password", {
        identifier,
        password,
        redirect: false,
      });
      if (!result || result.error) {
        setError(
          result?.error === "Configuration"
            ? "服务端异常：打开 /api/health 查看原因（常见为数据库未迁移或 AUTH_SECRET 缺失）"
            : "账号或密码不正确",
        );
        return;
      }
      router.push("/notes");
      router.refresh();
    } catch {
      setError("登录失败，请稍后重试");
    } finally {
      setPending(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="space-y-1.5">
        <label htmlFor="identifier" className="paper-label block">
          账号
        </label>
        <Input
          id="identifier"
          name="identifier"
          autoComplete="username"
          value={identifier}
          onChange={(event) => setIdentifier(event.target.value)}
          placeholder="用户名或邮箱"
          className="h-10 bg-card"
          required
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="password" className="paper-label block">
          密码
        </label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="••••••••"
          className="h-10 bg-card"
          required
        />
      </div>

      {error ? <p className="text-[11.5px] text-danger">{error}</p> : null}

      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? <Loader2 className="size-3.5 animate-spin" /> : null}
        {pending ? "登录中…" : "登录"}
      </Button>
    </form>
  );
}
