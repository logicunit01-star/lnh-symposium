import { redirect } from "next/navigation";

/** Older links (confirmation PDFs) point here; ticket look-up now lives on one page. */
export default function Status() {
  redirect("/my-registrations");
}
