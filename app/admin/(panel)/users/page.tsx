import Link from "next/link";
import { listUsers } from "@/lib/db";
import { Card } from "@/components/admin/ui";
import { ConfirmButton } from "@/components/admin/ConfirmButton";
import { AddUserForm, ResetPasswordForm } from "@/components/admin/UserForms";
import { removeUser, toggleUserActive } from "../../actions";

export default async function UsersPage() {
  const users = (await listUsers()).sort((a, b) => a.username.localeCompare(b.username));
  return (
    <>
      <h1 className="text-2xl font-bold">Peserta ujian</h1>
      <Card title="Tambah peserta">
        <AddUserForm />
      </Card>
      <Card title={`Daftar peserta (${users.length})`}>
        {users.length === 0 ? (
          <p className="text-gray-500">Belum ada peserta.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-gray-200 text-gray-500">
                <tr>
                  <th className="py-2 pr-4 font-medium">Nama</th>
                  <th className="py-2 pr-4 font-medium">Username</th>
                  <th className="py-2 pr-4 font-medium">Status</th>
                  <th className="py-2 text-right font-medium">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-b border-gray-100 last:border-0">
                    <td className="py-3 pr-4 font-medium">{u.name}</td>
                    <td className="py-3 pr-4 font-mono">{u.username}</td>
                    <td className="py-3 pr-4">
                      {u.active ? (
                        <span className="rounded bg-brand-50 px-2 py-0.5 text-brand-800">Aktif</span>
                      ) : (
                        <span className="rounded bg-gray-100 px-2 py-0.5 text-gray-500">Nonaktif</span>
                      )}
                    </td>
                    <td className="py-3">
                      <div className="flex flex-wrap items-center justify-end gap-1">
                        <Link
                          href={`/admin/users/${u.id}/progress`}
                          className="rounded px-2 py-1 text-sm text-brand-700 hover:bg-brand-50"
                        >
                          Perkembangan
                        </Link>
                        <ResetPasswordForm id={u.id} />
                        <form action={toggleUserActive}>
                          <input type="hidden" name="id" value={u.id} />
                          <input type="hidden" name="active" value={u.active ? "0" : "1"} />
                          <button className="rounded px-2 py-1 text-sm text-gray-700 hover:bg-gray-100">
                            {u.active ? "Nonaktifkan" : "Aktifkan"}
                          </button>
                        </form>
                        <form action={removeUser}>
                          <input type="hidden" name="id" value={u.id} />
                          <ConfirmButton
                            message={`Hapus peserta ${u.username}? Riwayat ujiannya ikut terhapus.`}
                            className="rounded px-2 py-1 text-sm text-red-600 hover:bg-red-50"
                          >
                            Hapus
                          </ConfirmButton>
                        </form>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  );
}
