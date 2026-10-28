import { redirect } from "next/navigation";

/** Short link to the president's compose page (signed-in admins only). */
export default function MailShortcut() {
  redirect("/admin/mail");
}
