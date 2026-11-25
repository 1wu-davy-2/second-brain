import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { createNoteForUser } from "@/lib/notes/service";

export const dynamic = "force-dynamic";

export default async function NewNotePage({
  searchParams,
}: {
  searchParams: Promise<{ title?: string }>;
}) {
  const user = await currentUser();
  if (!user) redirect("/login");

  const params = await searchParams;
  const title = typeof params.title === "string" ? params.title.slice(0, 200) : "";
  const note = await createNoteForUser(user.id, { title });

  redirect(`/notes/${note.id}`);
}
