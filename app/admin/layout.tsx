import RoleGuard from "@/components/layout/role-guard";
import Navbar from "@/components/layout/navbar";
import Sidebar from "@/components/layout/sidebar";

export const dynamic = "force-dynamic";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <RoleGuard allowedRoles={["admin"]}>
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex">
          <Sidebar role="admin" />
          <main className="flex-1 p-6 lg:p-8">
            <div className="max-w-7xl mx-auto">{children}</div>
          </main>
        </div>
      </div>
    </RoleGuard>
  );
}
