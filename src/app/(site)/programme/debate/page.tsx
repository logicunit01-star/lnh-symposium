import { SpecialSessionPage } from "@/components/site/SpecialSessionPage";

export const metadata = { title: "Debate Session", description: "The debate session of the 9th LNH Symposium: keynote speaker, panelists and moderator." };
export const dynamic = "force-dynamic";
export default function Debate() { return <SpecialSessionPage kind="DEBATE" />; }
