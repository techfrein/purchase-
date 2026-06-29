import { NextResponse } from "next/server";
import { apiUser } from "@/lib/auth";
import { compareOptions } from "@/lib/gemini";

export async function POST(req: Request) {
  const user = await apiUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as {
    heading?: string;
    options?: Array<{ title?: string; source?: string; price?: number; description?: string }>;
  };

  const heading = (body.heading || "").trim();
  const options = (body.options ?? [])
    .filter((o) => o && o.title && typeof o.price === "number")
    .map((o) => ({
      title: String(o!.title),
      source: String(o!.source ?? ""),
      price: Number(o!.price),
      description: o!.description ? String(o!.description) : undefined,
    }));

  if (!heading || options.length < 2) {
    return NextResponse.json({ error: "Need a heading and at least 2 options to compare." }, { status: 400 });
  }

  try {
    const comparison = await compareOptions(heading, options);
    return NextResponse.json({ comparison });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Comparison failed" }, { status: 500 });
  }
}
