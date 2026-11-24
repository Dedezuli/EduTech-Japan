import { redirect } from "next/navigation";
import { currentUser } from "@/lib/userAuth";
import { UserLoginForm } from "@/components/UserLoginForm";
import { ExamRules } from "@/components/ExamRules";

export const metadata = { title: "ログイン · eduTech CBT" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  if (await currentUser()) redirect(next || "/");
  return (
    <div className="min-h-dvh bg-gray-100">
      <header className="bg-black px-4 py-3 text-lg font-bold text-white sm:px-6">eduTech CBT</header>
      <div className="h-1.5 bg-brand-600" />
      <main className="mx-auto grid max-w-5xl gap-6 p-4 sm:p-6 lg:grid-cols-[1fr_380px] lg:items-start">
        <ExamRules />
        <div className="overflow-hidden rounded-lg bg-white shadow-md lg:sticky lg:top-6">
          <div className="bg-brand-600 px-5 py-3 font-bold text-white">ログイン · Login peserta</div>
          <div className="p-5">
            <UserLoginForm next={next} />
          </div>
        </div>
      </main>
    </div>
  );
}
