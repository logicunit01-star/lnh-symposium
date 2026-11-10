import { redirect } from "next/navigation";

// The webinar / panel discussion page became "Pre-symposium activities" (Sadaf, 10 Nov); old links keep working.
export default function Webinar() { redirect("/programme/pre-symposium-activities"); }
