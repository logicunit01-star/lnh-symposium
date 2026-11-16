"use client";
import { useEffect } from "react";

/**
 * Issues email 16 Nov 2026 (item 12): errors show at the field straight away.
 * - When a person leaves a field that is required (Field "required", or the HTML required attribute) and empty, or
 *   whose value the browser finds invalid (email, pattern, length), the field turns red and a bold red message
 *   appears under it. It clears as soon as the value is fixed.
 * - Server errors already render under their field (.err); useSubmit scrolls to the first one (see useForm).
 */
const MSG_ID = "fg-msg";
function fieldOf(el: Element) { return el.closest("[data-field]") as HTMLElement | null; }
function check(el: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement) {
  if (el.disabled || el.type === "hidden" || el.type === "checkbox" || el.type === "radio" || el.type === "search") return;
  const wrap = fieldOf(el);
  const requiredEmpty = (el.required || wrap?.dataset.required === "1") && !String(el.value ?? "").trim();
  const bad = requiredEmpty ? "This field is required." : !el.checkValidity() ? el.validationMessage || "Please check this field." : "";
  const host = wrap ?? el.parentElement;
  if (!host) return;
  let msg = host.querySelector(`:scope > .${MSG_ID}`) as HTMLElement | null;
  const serverErr = host.querySelector(":scope > .err:not(.fg-msg)");
  if (bad && !serverErr) {
    el.setAttribute("aria-invalid", "true");
    if (!msg) { msg = document.createElement("p"); msg.className = `err ${MSG_ID}`; msg.setAttribute("role", "alert"); host.appendChild(msg); }
    msg.textContent = bad;
  } else {
    if (!serverErr) el.removeAttribute("aria-invalid");
    msg?.remove();
  }
}
const isField = (t: EventTarget | null): t is HTMLInputElement => !!t && t instanceof HTMLElement && /^(INPUT|SELECT|TEXTAREA)$/.test(t.tagName) && !!t.closest("form");

export function FormGuard() {
  useEffect(() => {
    const onBlur = (e: FocusEvent) => { if (isField(e.target)) check(e.target); };
    const onInput = (e: Event) => { if (isField(e.target) && e.target.getAttribute("aria-invalid") === "true") check(e.target); };
    document.addEventListener("focusout", onBlur);
    document.addEventListener("input", onInput);
    document.addEventListener("change", onInput);
    return () => { document.removeEventListener("focusout", onBlur); document.removeEventListener("input", onInput); document.removeEventListener("change", onInput); };
  }, []);
  return null;
}

/** After a submit with field errors: bring the first one into view and put the cursor in it. */
export function focusFirstError() {
  requestAnimationFrame(() => {
    const err = document.querySelector(".site .err, form .err") as HTMLElement | null;
    if (!err) return;
    const host = err.parentElement;
    const input = host?.querySelector("input, select, textarea") as HTMLElement | null;
    (input ?? err).scrollIntoView({ behavior: "smooth", block: "center" });
    input?.focus({ preventScroll: true });
  });
}
