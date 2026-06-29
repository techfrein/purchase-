import { NextResponse } from "next/server";
import { apiUser } from "@/lib/auth";
import { fetchUsersForSelect } from "@/lib/requests";

export async function GET() {
  const user = await apiUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const users = await fetchUsersForSelect();
  return NextResponse.json({ users });
}
