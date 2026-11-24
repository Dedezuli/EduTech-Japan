import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/auth";
import { LoginForm } from "@/components/admin/LoginForm";

export const metadata = { title: "Login Admin · eduTech CBT" };

export default async function LoginPage() {
  if (await isAdmin()) redirect("/admin");
  return (
    <div className="flex min-h-dvh items-center justify-center bg-gray-100 p-4">
      <div className="w-full max-w-sm overflow-hidden rounded-lg bg-white shadow-md">
        <div className="bg-black px-5 py-3 font-bold text-white">eduTech CBT · Admin</div>
        <div className="h-1.5 bg-brand-600" />
        <div className="p-5">
          <LoginForm />
        </div>
      </div>
    </div>
  );
}
