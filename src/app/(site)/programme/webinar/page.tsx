import { GuestProgrammePage } from "@/components/site/GuestProgrammePage";

export const metadata = { title: "Pre-Symposium Webinar / Panel Discussion" };
export const dynamic = "force-dynamic";
export default function Webinar({ searchParams }: { searchParams: { preview?: string } }) { return <GuestProgrammePage k="WEBINAR" preview={!!searchParams.preview} />; }
