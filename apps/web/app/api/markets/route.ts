import { NextResponse } from "next/server";

export async function GET() {
  // Create abort controller for timeout (10 seconds - increased for backend hardening)
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
    const response = await fetch("http://localhost:4000/markets", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      signal: controller.signal,
      cache: "no-store",
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return NextResponse.json(
        { error: `Backend API returned status ${response.status}` },
        { status: 502 }
      );
    }

    const data = await response.json();

    // Handle new response format with markets and errors arrays
    if (data && typeof data === "object" && Array.isArray(data.markets)) {
      // Return just the markets array for backward compatibility
      return NextResponse.json(data.markets, { 
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
        },
      });
    }

    // Fallback for old format (array directly)
    if (Array.isArray(data)) {
      return NextResponse.json(data, { 
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
        },
      });
    }

    return NextResponse.json(
      { error: "Invalid response format: expected an array or object with markets array" },
      { status: 502 }
    );
  } catch (error) {
    clearTimeout(timeoutId);
    console.error("Error proxying to markets API:", error);
    
    // Return proper JSON on timeout (504) instead of throwing
    if (error instanceof Error && (error.name === "AbortError" || error.message.includes("timeout") || error.message.includes("aborted"))) {
      return NextResponse.json(
        { error: "Request timeout: Backend API did not respond in time" },
        { status: 504 }
      );
    }
    
    // Other errors return 502
    const errorMessage = error instanceof Error 
      ? (error.message.includes("ECONNREFUSED") || error.message.includes("fetch failed")
          ? "Cannot connect to backend API. Make sure it's running on port 4000."
          : "Failed to fetch market data from backend")
      : "Failed to fetch market data from backend";

    return NextResponse.json(
      { error: errorMessage },
      { status: 502 }
    );
  }
}
