import { NextResponse } from "next/server";
import { login } from "@/lib/auth";

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { username?: string; password?: string };
  if (!body.username || !body.password) {
    return NextResponse.json({ error: "Username and password are required." }, { status: 400 });
  }
  const result = await login(body.username, body.password);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json({ user: result.user });
}
