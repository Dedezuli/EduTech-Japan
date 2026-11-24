"use client";

import { startTransition, useActionState, useEffect, useRef, useState } from "react";
import { addUser, setUserPassword, type FormState } from "@/app/admin/actions";
import { Errors, Field, btnGhost, btnPrimary, inputCls, keepValues } from "./ui";

function randomPassword() {
  const chars = "abcdefghjkmnpqrstuvwxyz23456789";
  const buf = new Uint32Array(8);
  crypto.getRandomValues(buf);
  return Array.from(buf, (n) => chars[n % chars.length]).join("");
}

export function AddUserForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(addUser, { errors: [] });
  const [initial] = useState(state);
  const [password, setPassword] = useState("");
  const [created, setCreated] = useState<{ username: string; password: string } | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const last = useRef<{ username: string; password: string } | null>(null);

  useEffect(() => {
    if (state === initial || state.errors.length) return;
    setCreated(last.current);
    formRef.current?.reset();
    setPassword("");
  }, [state, initial]);

  return (
    <form
      ref={formRef}
      onSubmit={keepValues((fd) => {
        last.current = { username: String(fd.get("username")).trim().toLowerCase(), password: String(fd.get("password")) };
        setCreated(null);
        action(fd);
      }, startTransition)}
      className="space-y-4"
    >
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Nama lengkap">
          <input name="name" required className={inputCls} />
        </Field>
        <Field label="Username" hint="Huruf kecil, angka, . _ -">
          <input name="username" required autoComplete="off" className={inputCls} />
        </Field>
        <Field label="Password" hint="Minimal 6 karakter">
          <div className="flex gap-2">
            <input
              name="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              className={inputCls}
            />
            <button type="button" onClick={() => setPassword(randomPassword())} className={btnGhost} title="Buat password acak">
              Acak
            </button>
          </div>
        </Field>
      </div>
      <Errors errors={state.errors} />
      {created && (
        <div className="rounded-md border border-brand-100 bg-brand-50 px-4 py-3 text-sm text-brand-800">
          ✓ Peserta dibuat. Berikan data login ini ke peserta: <b>{created.username}</b> / <b>{created.password}</b>
        </div>
      )}
      <button disabled={pending} className={btnPrimary}>
        {pending ? "Menyimpan…" : "+ Tambah peserta"}
      </button>
    </form>
  );
}

export function ResetPasswordForm({ id }: { id: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(setUserPassword, { errors: [] });
  const [initial] = useState(state);
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [done, setDone] = useState<string | null>(null);

  useEffect(() => {
    if (state === initial || state.errors.length) return;
    setDone(password);
    setOpen(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, initial]);

  if (!open)
    return (
      <span className="inline-flex items-center gap-2">
        <button
          type="button"
          onClick={() => {
            setPassword(randomPassword());
            setDone(null);
            setOpen(true);
          }}
          className="rounded px-2 py-1 text-sm text-brand-700 hover:bg-brand-50"
        >
          Reset password
        </button>
        {done && <span className="text-xs text-brand-800">baru: <b>{done}</b></span>}
      </span>
    );

  return (
    <form action={action} className="inline-flex items-center gap-1">
      <input type="hidden" name="id" value={id} />
      <input
        name="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="w-28 rounded border border-gray-300 px-2 py-1 text-sm"
        aria-label="Password baru"
      />
      <button disabled={pending} className="rounded bg-brand-600 px-2 py-1 text-sm text-white">
        Simpan
      </button>
      <button type="button" onClick={() => setOpen(false)} className="px-1 text-sm text-gray-500">
        ✕
      </button>
      {state.errors[0] && <span className="text-xs text-red-600">{state.errors[0]}</span>}
    </form>
  );
}
