import { NextResponse } from "next/server";
import { apiUser } from "@/lib/auth";
import { runPriceCheck } from "@/lib/pricecheck/engine";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await apiUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  try {
    const result = await runPriceCheck(Number(id), user.id);
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Price check failed." },
      { status: 400 }
    );
  }
}
