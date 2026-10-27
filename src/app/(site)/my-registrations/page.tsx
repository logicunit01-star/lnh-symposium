import { PageHero } from "@/components/ui/PageHero";
import { LookupFlow } from "./LookupFlow";

export const metadata = { title: "My registrations" };

export default function MyRegistrations() {
  return (
    <>
      <PageHero eyebrow="Find your bookings" title={<>My <span className="text-grad">registrations</span></>} sub="Enter the mobile number you registered with. We send a one-time code, then show every registration made with that number, with its QR pass." />
      <div className="container-x max-w-3xl"><LookupFlow /></div>
    </>
  );
}
