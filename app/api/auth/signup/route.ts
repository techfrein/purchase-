import { NextResponse } from "next/server";
import { signup } from "@/lib/auth";

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as {
    username?: string;
    name?: string;
    password?: string;
    role?: string;
  };
  const result = await signup({
    username: body.username ?? "",
    name: body.name ?? "",
    password: body.password ?? "",
    role: body.role ?? "STAFF",
  });
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json({ ok: true }, { status: 201 });
}