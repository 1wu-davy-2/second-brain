import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { currentUser } from "@/lib/auth";
import { getSidebarData, listRecentNotes } from "@/lib/notes/queries";

export const dynamic = "force-dynamic";

export default async function MainLayout({ children }: { children: React.ReactNode }) {
  const user = await currentUser();
  if (!user) redirect("/login");

  const [sidebar, recent] = await Promise.all([
    getSidebarData(user.id),
    listRecentNotes(user.id, 6),
  ]);

  return (
    <AppShell
      user={{ name: user.name ?? null, email: user.email ?? null, image: user.image ?? null }}
      counts={sidebar.counts}
      tags={sidebar.tags}
      recent={recent.map((note) => ({ id: note.id, title: note.title }))}
    >
      {children}
    </AppShell>
  );
}
