import { NextRequest, NextResponse } from "next/server";

// Force dynamic execution for all API proxy requests
export const dynamic = "force-dynamic";
export const revalidate = 0;

function getBackendBase(): string {
  // 1. Explicit BACKEND_URL from environment variable
  const envBackend = process.env.BACKEND_URL?.trim();
  if (envBackend) {
    return envBackend.replace(/\/$/, "");
  }

  // 2. In development, target the local Express backend on port 5000 (or custom BACKEND_PORT)
  if (process.env.NODE_ENV !== "production") {
    const port = process.env.BACKEND_PORT || "5000";
    return `http://127.0.0.1:${port}`;
  }

  // 3. In production, default to the deployed Render backend
  return "https://izhadesigns-backend.onrender.com";
}

async function handleProxy(req: NextRequest): Promise<NextResponse> {
  const backendBase = getBackendBase();
  // Strip leading '/api' from the pathname
  const apiPath = req.nextUrl.pathname.replace(/^\/api\/?/, "");
  const search = req.nextUrl.search || "";
  const targetUrl = `${backendBase}/api/${apiPath}${search}`;

  // Filter and forward request headers
  const forwardHeaders = new Headers();
  req.headers.forEach((value, key) => {
    const lower = key.toLowerCase();
    if (
      lower !== "host" &&
      lower !== "connection" &&
      lower !== "content-length" &&
      lower !== "transfer-encoding"
    ) {
      forwardHeaders.set(key, value);
    }
  });

  // Extract body for mutating methods
  let body: BodyInit | undefined = undefined;
  if (req.method !== "GET" && req.method !== "HEAD") {
    try {
      const buffer = await req.arrayBuffer();
      if (buffer.byteLength > 0) {
        body = Buffer.from(buffer);
      }
    } catch {
      body = undefined;
    }
  }

  try {
    const backendRes = await fetch(targetUrl, {
      method: req.method,
      headers: forwardHeaders,
      body,
      cache: "no-store",
      redirect: "manual",
    });

    // Prepare response headers
    const responseHeaders = new Headers();
    backendRes.headers.forEach((value, key) => {
      const lower = key.toLowerCase();
      if (
        lower !== "content-encoding" &&
        lower !== "transfer-encoding" &&
        lower !== "connection"
      ) {
        responseHeaders.set(key, value);
      }
    });

    // Return backend response stream/buffer
    const responseBuffer = await backendRes.arrayBuffer();
    return new NextResponse(responseBuffer, {
      status: backendRes.status,
      statusText: backendRes.statusText,
      headers: responseHeaders,
    });
  } catch (err: any) {
    const isConnRefused =
      err?.cause?.code === "ECONNREFUSED" ||
      err?.code === "ECONNREFUSED" ||
      err?.message?.includes("ECONNREFUSED") ||
      err?.message?.includes("fetch failed");

    console.error(
      `[Next.js API Proxy] Failed to proxy ${req.method} ${req.nextUrl.pathname} -> ${targetUrl}:`,
      err?.message || err
    );

    return NextResponse.json(
      {
        success: false,
        error: isConnRefused
          ? "Backend server is offline or unreachable"
          : "Backend proxy communication error",
        message: err?.message || "Unable to reach backend service",
        target: targetUrl,
        hint: isConnRefused
          ? `Make sure your Express backend is running (e.g. cd izza-backend && npm start). Expected at ${backendBase}.`
          : undefined,
        timestamp: new Date().toISOString(),
      },
      {
        status: 503,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-store",
        },
      }
    );
  }
}

export const GET = handleProxy;
export const POST = handleProxy;
export const PUT = handleProxy;
export const DELETE = handleProxy;
export const PATCH = handleProxy;
export const HEAD = handleProxy;
export const OPTIONS = handleProxy;
