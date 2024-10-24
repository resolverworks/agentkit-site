import { NextRequest, NextResponse } from "next/server";
import { createSiweMessage, generateSiweNonce } from "viem/siwe";
import { isAddress } from "viem";

// Helper function to handle CORS
function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, HEAD, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };
}

// Handle OPTIONS request for CORS preflight
export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders() });
}

export async function GET(request: NextRequest) {
  // Add CORS headers to all responses
  const headers = corsHeaders();

  // Get address from URL parameters
  const { searchParams } = new URL(request.url);
  const address = searchParams.get("address");

  if (!address) {
    return NextResponse.json(
      { error: "Missing address" },
      {
        status: 400,
        headers,
      }
    );
  }

  // Check if address is valid using viem
  if (!isAddress(address)) {
    return NextResponse.json(
      { error: "Invalid wallet address" },
      {
        status: 400,
        headers,
      }
    );
  }

  const nonce = generateSiweNonce();
  const message = createSiweMessage({
    domain: "agentkit.id",
    address,
    statement: "Sign this message to access protected endpoints.",
    uri: "https://agentkit.id/api/siwe-message",
    version: "1",
    chainId: 1,
    nonce: nonce,
  });

  // Save siwe to kv
  // Prepare the key-value pair for Cloudflare KV
  const kvKey = `siwe-${address}`;
  const kvPair = [
    {
      key: kvKey,
      value: message,
      // You can add expiration or metadata here if needed
    },
  ];

  const kvHeaders = {
    Authorization: `Bearer ${process.env.CLOUDFLARE_API_TOKEN}`,
    "Content-Type": "application/json",
  };

  const kvUrl = `https://api.cloudflare.com/client/v4/accounts/${process.env.CLOUDFLARE_ACCOUNT_ID}/storage/kv/namespaces/${process.env.CLOUDFLARE_KV_NAMESPACE_ID}/bulk`;

  console.log(kvHeaders);
  console.log(kvPair);
  console.log(kvUrl);

  try {
    // Upload message to Cloudflare KV using the bulk endpoint
    const kvResponse = await fetch(kvUrl, {
      method: "PUT",
      headers: kvHeaders,
      body: JSON.stringify(kvPair),
    });

    if (!kvResponse.ok) {
      const errorText = await kvResponse.text();
      console.error(
        "Failed to upload siwe message to Cloudflare KV:",
        errorText
      );
      return NextResponse.json(
        { error: "Failed to store siwe message" },
        {
          status: 400,
          headers,
        }
      );
    }

    const kvResult = await kvResponse.json();
    if (!kvResult.success) {
      console.error("Cloudflare KV operation was not successful:", kvResult);
      return NextResponse.json(
        { error: "Failed to store siwe message" },
        {
          status: 400,
          headers,
        }
      );
    }

    // Return the message as plain text
    return new NextResponse(message, {
      status: 200,
      headers: {
        ...headers,
        "Content-Type": "text/plain",
      },
    });
  } catch (error) {
    console.error("Error storing SIWE message:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      {
        status: 500,
        headers,
      }
    );
  }
}
