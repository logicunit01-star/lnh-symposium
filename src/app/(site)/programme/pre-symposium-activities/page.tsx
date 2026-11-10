import { GuestProgrammePage } from "@/components/site/GuestProgrammePage";

export const metadata = { title: "Pre-symposium activities" };
export const dynamic = "force-dynamic";
export default function Activities({ searchParams }: { searchParams: { preview?: string } }) { return <GuestProgrammePage k="WEBINAR" preview={!!searchParams.preview} />; }
