import { NextRequest, NextResponse } from "next/server";

// Helper function for CORS headers
function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };
}

// Handle OPTIONS request for CORS preflight
export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders() });
}

export async function GET(request: NextRequest) {
  const headers = corsHeaders();

  const apiKey = process.env.NAMESTONE_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "API key not found" },
      {
        status: 400,
        headers,
      }
    );
  }

  // Get address parameter from the URL
  const { searchParams } = new URL(request.url);
  const address = searchParams.get("address");

  // Build the query string with fixed domain and text_records
  const queryParams = new URLSearchParams({
    domain: "agentkit.eth",
    text_records: "1",
    ...(address && { address }),
  });

  try {
    const response = await fetch(
      `https://namestone.xyz/api/public_v1/get-names?${queryParams.toString()}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: apiKey,
        },
      }
    );

    if (response.ok) {
      const data = await response.json();
      return NextResponse.json(data, { headers });
    } else {
      const errorText = await response.text();
      console.error("Namestone API error:", errorText);
      return NextResponse.json(
        { error: "Failed to fetch names" },
        { status: response.status, headers }
      );
    }
  } catch (error) {
    console.error("Error fetching names:", error);
    return NextResponse.json(
      { error: "An error occurred" },
      { status: 500, headers }
    );
  }
}
