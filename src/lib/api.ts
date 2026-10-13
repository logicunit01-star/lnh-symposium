import { NextResponse } from "next/server";
import { ZodError } from "zod";

export const ok = (data: unknown, status = 200) => NextResponse.json(data, { status });
export const fail = (message: string, status = 400, fields?: Record<string, string>) => NextResponse.json({ error: message, fields }, { status });
export function zodFail(e: ZodError) {
  const fields: Record<string, string> = {};
  for (const i of e.issues) fields[i.path.join(".")] ??= i.message;
  return fail("Please correct the highlighted fields.", 422, fields);
}
