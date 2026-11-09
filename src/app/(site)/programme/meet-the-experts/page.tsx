import { GuestProgrammePage } from "@/components/site/GuestProgrammePage";

export const metadata = { title: "Meet the Experts" };
export const dynamic = "force-dynamic";
export default function Experts({ searchParams }: { searchParams: { preview?: string } }) { return <GuestProgrammePage k="EXPERTS" preview={!!searchParams.preview} />; }
