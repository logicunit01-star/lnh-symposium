"use client";
import { useState } from "react";
import { Send } from "lucide-react";
import { useSubmit } from "@/components/ui/useForm";
import { Field, Alert } from "@/components/ui/Field";

export function ContactForm() {
  const { submit, loading, error, fields } = useSubmit("/api/contact");
  const [done, setDone] = useState(false);
  if (done) return <Alert kind="success">Thank you — your message has been sent. The secretariat will get back to you shortly.</Alert>;
  return (
    <form className="grid gap-5 sm:grid-cols-2" onSubmit={async (e) => {
      e.preventDefault();
      const r = await submit(Object.fromEntries(new FormData(e.currentTarget)));
      if (r) setDone(true);
    }}>
      <h2 className="h-display text-3xl text-white sm:col-span-2">Send an enquiry</h2>
      {error && <Alert className="sm:col-span-2">{error}</Alert>}
      <Field label="Name" name="name" required error={fields.name}><input id="name" name="name" className="input" required /></Field>
      <Field label="Email" name="email" required error={fields.email}><input id="email" name="email" type="email" className="input" required /></Field>
      <Field label="Phone" name="phone" error={fields.phone}><input id="phone" name="phone" className="input" placeholder="03xx-xxxxxxx" /></Field>
      <Field label="Subject" name="subject" required error={fields.subject}><input id="subject" name="subject" className="input" required /></Field>
      <Field label="Message" name="message" required error={fields.message} className="sm:col-span-2"><textarea id="message" name="message" rows={6} className="input" required /></Field>
      <input name="website" className="hidden" tabIndex={-1} autoComplete="off" aria-hidden />
      <div className="sm:col-span-2"><button className="btn-primary" disabled={loading}>{loading ? "Sending…" : <>Send message <Send className="h-4 w-4" /></>}</button></div>
    </form>
  );
}
