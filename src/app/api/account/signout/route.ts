import { NextResponse } from "next/server";
import { USER_COOKIE } from "@/lib/account";
import { appUrl } from "@/lib/utils";

export async function POST() {
  const res = NextResponse.redirect(`${appUrl()}/`, 303);
  res.cookies.delete(USER_COOKIE);
  return res;
}
