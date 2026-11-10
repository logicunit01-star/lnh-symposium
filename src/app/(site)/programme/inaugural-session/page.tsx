import { GuestProgrammePage } from "@/components/site/GuestProgrammePage";

export const metadata = { title: "Inaugural session" };
export const dynamic = "force-dynamic";
export default function Inaugural({ searchParams }: { searchParams: { preview?: string } }) { return <GuestProgrammePage k="INAUGURAL" preview={!!searchParams.preview} />; }
