import { currentUser } from "@/lib/auth";
import { Sidebar } from "@/components/admin/Sidebar";

export const dynamic = "force-dynamic";
export const metadata = { title: "Admin", robots: { index: false } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await currentUser();
  if (!user) return <div className="admin min-h-screen">{children}</div>; // login page
  return (
    <div className="admin min-h-screen">
      <Sidebar user={user} />
      <div className="lg:pl-64"><div className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-8">{children}</div></div>
    </div>
  );
}
