import { SpecialSessionPage } from "@/components/site/SpecialSessionPage";

export const metadata = { title: "Plenary Session", description: "The plenary session of the 9th LNH Symposium: keynote speaker, panelists and moderator." };
export const dynamic = "force-dynamic";
export default function Plenary() { return <SpecialSessionPage kind="PLENARY" />; }
