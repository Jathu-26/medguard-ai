import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

async function proxyRequest(
  req: NextRequest,
  context: { params: { path: string[] } } | { params: Promise<{ path: string[] }> }
) {
  let targetPath = "";
  try {
    const rawParams = context && "params" in context ? context.params : null;
    const resolved = rawParams
      ? typeof (rawParams as any).then === "function"
        ? await rawParams
        : rawParams
      : null;
    if (resolved && Array.isArray(resolved.path)) {
      targetPath = resolved.path.join("/");
    }
  } catch {
    targetPath = "";
  }

  const searchParams = req.nextUrl.searchParams.toString();
  const queryString = searchParams ? `?${searchParams}` : "";

  const candidateHosts = [
    process.env.INTERNAL_API_URL || "http://127.0.0.1:8000",
    "http://127.0.0.1:8000",
    "http://localhost:8000",
    "http://0.0.0.0:8000",
  ];

  const headers = new Headers();
  const contentType = req.headers.get("content-type");
  if (contentType) {
    headers.set("content-type", contentType);
  }
  const auth = req.headers.get("authorization");
  if (auth) {
    headers.set("authorization", auth);
  }
  const accept = req.headers.get("accept");
  if (accept) {
    headers.set("accept", accept);
  }

  let body: BodyInit | undefined = undefined;
  if (req.method !== "GET" && req.method !== "HEAD") {
    const raw = await req.arrayBuffer();
    if (raw && raw.byteLength > 0) {
      body = raw;
    }
  }

  let lastError: any = null;

  for (const host of candidateHosts) {
    try {
      const targetUrl = `${host}/api/${targetPath}${queryString}`;
      const response = await fetch(targetUrl, {
        method: req.method,
        headers,
        body,
        cache: "no-store",
        redirect: "manual",
      });

      const responseHeaders = new Headers();
      response.headers.forEach((val, key) => {
        if (!["transfer-encoding", "content-encoding", "connection"].includes(key.toLowerCase())) {
          responseHeaders.set(key, val);
        }
      });

      const responseBuffer = await response.arrayBuffer();
      return new NextResponse(responseBuffer, {
        status: response.status,
        statusText: response.statusText,
        headers: responseHeaders,
      });
    } catch (err) {
      lastError = err;
    }
  }

  return NextResponse.json(
    {
      error: "FastAPI Backend Connection Refused",
      details: lastError?.message || String(lastError),
      path: targetPath,
    },
    { status: 503 }
  );
}

export async function GET(req: NextRequest, context: any) {
  return proxyRequest(req, context);
}

export async function POST(req: NextRequest, context: any) {
  return proxyRequest(req, context);
}

export async function PUT(req: NextRequest, context: any) {
  return proxyRequest(req, context);
}

export async function DELETE(req: NextRequest, context: any) {
  return proxyRequest(req, context);
}

export async function PATCH(req: NextRequest, context: any) {
  return proxyRequest(req, context);
}
