// app/admin/(protected)/layout.tsx
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export default async function AdminProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Fetch the session securely on the server
  const session = await auth.api.getSession({
    headers: await headers(), 
  });

  // If there is no session, or the user is a PASSENGER,
  // bounce them specifically to the admin login page.
  if (!session || session.user.role === "PASSENGER") {
    redirect("/admin/login"); 
  }

  // If they pass the check, render the nested admin pages
  return <>{children}</>;
}