import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const urls = [
    process.env.INTERNAL_API_URL ? `${process.env.INTERNAL_API_URL}/health` : null,
    "http://127.0.0.1:8000/health",
    "http://localhost:8000/health",
    "http://0.0.0.0:8000/health",
  ].filter(Boolean) as string[];

  for (const url of urls) {
    try {
      const res = await fetch(url, { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        return NextResponse.json(data);
      }
    } catch {
      // try next url
    }
  }

  return NextResponse.json(
    { status: "offline", error: "FastAPI backend unreachable" },
    { status: 503 }
  );
}
