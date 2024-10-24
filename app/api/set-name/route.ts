import { NextApiRequest, NextApiResponse } from "next";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  let body = req.body;

  body.domain = "agentkit.id";

  const apiKey = process.env.NAMESTONE_API_KEY;

  if (!apiKey) {
    res.status(400).json({ error: "API key not found" });
    return;
  }

  console.log(body);

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
      res.status(200).json({ message: "Name set successfully" });
    } else {
      res.status(405).json({ error: "Method not allowed" });
    }
  } catch (error) {
    res.status(500).json({ error: "An error occurred" });
  }
}
