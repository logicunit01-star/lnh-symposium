import { NextResponse } from "next/server";
import { COOKIE } from "@/lib/auth-edge";
import { appUrl } from "@/lib/utils";

export async function POST() {
  const res = NextResponse.redirect(`${appUrl()}/admin/login`, 303);
  res.cookies.delete(COOKIE);
  return res;
}
