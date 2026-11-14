import { redirect } from "next/navigation";
import { GuestProgrammePage } from "@/components/site/GuestProgrammePage";

export const metadata = { title: "Meet the Experts" };
export const dynamic = "force-dynamic";
// Meet the Experts is now part of "Meet the Experts & Speakers" (homepage changes 11.11.2026); staff preview stays here.
export default function Experts({ searchParams }: { searchParams: { preview?: string } }) {
  if (!searchParams.preview) redirect("/speakers#experts");
  return <GuestProgrammePage k="EXPERTS" preview />;
}
