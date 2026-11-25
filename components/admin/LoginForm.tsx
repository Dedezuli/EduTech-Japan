"use client";

import { useActionState } from "react";
import { login, type FormState } from "@/app/admin/actions";
import { Errors, Field, btnPrimary, inputCls } from "./ui";

export function LoginForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(login, { errors: [] });
  return (
    <form action={action} className="space-y-4">
      <Field label="Password admin" hint="Diatur lewat ADMIN_PASSWORD di environment server">
        <input name="password" type="password" required autoFocus className={inputCls} />
      </Field>
      <Errors errors={state.errors} />
      <button disabled={pending} className={`${btnPrimary} w-full`}>
        {pending ? "Masuk…" : "Masuk"}
      </button>
    </form>
  );
}
