import { NextApiRequest, NextApiResponse } from "next";
import Cors from "micro-cors";
import { createSiweMessage, generateSiweNonce } from "viem/siwe";
import { isAddress } from "viem";

// Define allowed HTTP methods
type AllowedMethods = "GET" | "HEAD" | "POST" | "OPTIONS";

// Configure CORS
const cors = Cors({
  allowMethods: ["GET", "HEAD", "POST", "OPTIONS"] as AllowedMethods[],
  origin: "*",
});

// Define error response type
interface ErrorResponse {
  error: string;
}

const handler = async (
  req: NextApiRequest,
  res: NextApiResponse<string | ErrorResponse>
): Promise<void> => {
  const { method } = req;
  let address: string = req.query.address as string;

  if (method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    res.status(405).end(`Method ${method} Not Allowed`);
    return;
  }

  if (!address) {
    return res.status(400).json({ error: "Missing address" });
  }

  // check if address is valid using viem
  if (!isAddress(address)) {
    return res.status(400).json({ error: "Invalid wallet address" });
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
  // Upload image ID to Cloudflare KV using the bulk endpoint
  const kvResponse = await fetch(kvUrl, {
    method: "PUT",
    headers: kvHeaders,
    body: JSON.stringify(kvPair),
  });

  if (!kvResponse.ok) {
    const errorText = await kvResponse.text();
    console.error("Failed to upload siwe message to Cloudflare KV:", errorText);
    return res.status(400).json({ error: "Failed to store siwe message" });
  }

  const kvResult = await kvResponse.json();
  if (!kvResult.success) {
    console.error("Cloudflare KV operation was not successful:", kvResult);
    return res.status(400).json({ error: "Failed to store siwe message" });
  }

  // Set the Content-Type header to text/plain
  res.setHeader("Content-Type", "text/plain");
  // Return the message as plain text
  res.status(200).send(message);
};

export default cors(handler);
