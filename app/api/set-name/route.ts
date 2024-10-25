import { NextRequest, NextResponse } from "next/server";
import { createPublicClient, http } from "viem";
import { mainnet } from "viem/chains";
import { parseSiweMessage, createSiweMessage, SiweMessage } from "viem/siwe";

const providerUrl =
  "https://eth-mainnet.g.alchemy.com/v2/" +
  process.env.NEXT_PUBLIC_ALCHEMY_API_KEY;
const client = createPublicClient({
  chain: mainnet,
  transport: http(providerUrl || ""),
});

// Helper function to handle CORS headers
function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };
}

// Handle OPTIONS request for CORS preflight
export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders() });
}

export async function POST(req: NextRequest) {
  // Add CORS headers to all responses
  const headers = corsHeaders();

  let body;
  try {
    body = await req.json();
  } catch (e) {
    return NextResponse.json(
      { error: "Invalid JSON" },
      {
        status: 400,
        headers,
      }
    );
  }

  let signature = body.signature;
  let address = body.address;
  let name = body.name;
  if (!signature || !address || !name) {
    return NextResponse.json(
      { error: "Missing parameters" },
      {
        status: 400,
        headers,
      }
    );
  }
  body.domain = "agentkit.id";

  // check signature
  // get signature from k-v store
  const kvKey = `siwe-${address}`;
  let kvSiweMessage = "";
  const url = `https://api.cloudflare.com/client/v4/accounts/${process.env.CLOUDFLARE_ACCOUNT_ID}/storage/kv/namespaces/${process.env.CLOUDFLARE_KV_NAMESPACE_ID}/values/${kvKey}`;
  console.log("URL:", url);
  const kvResponse = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${process.env.CLOUDFLARE_API_TOKEN}`,
      "Content-Type": "application/json",
    },
  });
  if (kvResponse.ok) {
    kvSiweMessage = await kvResponse.text();
  } else {
    // return error from cloudflare if signature not found
    const error = await kvResponse.json();
    console.log(error);
    return NextResponse.json(
      { error: "Signature not found" },
      {
        status: 400,
        headers,
      }
    );
  }
  if (!kvSiweMessage) {
    return NextResponse.json(
      { error: "Signature not found" },
      {
        status: 400,
        headers,
      }
    );
  }

  // verify signature
  const preparedMessage = createSiweMessage(
    parseSiweMessage(kvSiweMessage) as SiweMessage
  );
  console.log("Prepared message:", preparedMessage);
  const valid = await client.verifySiweMessage({
    address: address,
    message: preparedMessage,
    signature,
  });
  if (!valid) {
    return NextResponse.json(
      { error: "Invalid signature" },
      {
        status: 400,
        headers,
      }
    );
  }

  body.domain = "agentkit.eth";
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

  // check if name is owned by someone else
  const nameCheck = await fetch(
    `https://namestone.xyz/api/public_v1/gsearch-names?domain=agentkit.eth&name=${body.name}&exact_match=1`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: apiKey,
      },
    }
  );
  if (!nameCheck.ok) {
    const errorMsg = await nameCheck.json();
    return NextResponse.json(
      { error: errorMsg },
      {
        status: 405,
        headers,
      }
    );
  }
  const nameCheckData = await nameCheck.json();
  if (
    nameCheckData.length > 0 &&
    nameCheckData[0].address.toLowerCase() !== body.address.toLowerCase()
  ) {
    return NextResponse.json(
      { error: "Name taken by another wallet" },
      {
        status: 405,
        headers,
      }
    );
  }

  // Set name
  try {
    const response = await fetch(
      "https://namestone.xyz/api/public_v1/set-name",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: apiKey,
        },
        body: JSON.stringify(body),
      }
    );

    if (response.ok) {
      return NextResponse.json(
        { message: "Name set successfully" },
        {
          headers,
        }
      );
    } else {
      const errorMsg = await response.json();
      return NextResponse.json(
        { error: errorMsg },
        {
          status: 405,
          headers,
        }
      );
    }
  } catch (error) {
    return NextResponse.json(
      { error: "An error occurred" },
      {
        status: 500,
        headers,
      }
    );
  }
}
