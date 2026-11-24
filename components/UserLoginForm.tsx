"use client";

import { useActionState } from "react";
import { userLogin, type LoginState } from "@/app/actions";
import { Errors, Field, btnPrimary, inputCls } from "./admin/ui";

export function UserLoginForm({ next }: { next?: string }) {
  const [state, action, pending] = useActionState<LoginState, FormData>(userLogin, {});
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="next" value={next ?? ""} />
      <Field label="ユーザー名 (Username)">
        <input name="username" defaultValue={state.username} key={state.username ?? ""} autoComplete="username" required autoFocus={!state.username} className={inputCls} />
      </Field>
      <Field label="パスワード (Password)">
        <input name="password" type="password" autoComplete="current-password" required autoFocus={!!state.username} className={inputCls} />
      </Field>
      <label className="flex items-start gap-2 text-sm">
        <input type="checkbox" name="agree" required className="mt-0.5 h-4 w-4 accent-brand-600" />
        <span>
          受験上の注意を読み、同意します。
          <span className="block text-gray-500">Saya sudah membaca dan menyetujui ketentuan ujian.</span>
        </span>
      </label>
      <Errors errors={state.error ? [state.error] : []} />
      <button disabled={pending} className={`${btnPrimary} w-full py-3 text-base`}>
        {pending ? "…" : "ログイン"}
      </button>
    </form>
  );
}
