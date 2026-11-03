import { PageHero } from "@/components/ui/PageHero";
import { GuestForm } from "../GuestForm";

export const metadata = { title: "Volunteers registration" };

export default function VolunteerRegistration() {
  return (
    <>
      <PageHero eyebrow="Volunteers registration form" title={<>Join as a <span className="text-grad">volunteer</span></>}
        sub="Volunteer at the 9th LNH Symposium. Approved by the Chairperson, Facilitation Committee." />
      <div className="container-x max-w-4xl"><GuestForm kind="VOLUNTEER" departments={[]} /></div>
    </>
  );
}
