import type { Metadata } from "next";
import { Factory } from "lucide-react";

import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Sign in — Llantino Ops" };

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex flex-col items-center gap-2 text-center">
          <div className="flex size-11 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Factory className="size-5" />
          </div>
          <div>
            <h1 className="text-lg font-semibold">Llantino Ops</h1>
            <p className="text-sm text-muted-foreground">
              Sign in to sales, production &amp; ops
            </p>
          </div>
        </div>

        <div className="rounded-lg border border-border bg-card p-6 shadow-xs">
          <LoginForm />
        </div>
      </div>
    </div>
  );
}
