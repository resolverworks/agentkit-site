"use client";
import { useEffect, useState } from "react";

interface TextRecords {
  description?: string;
  avatar?: string;
}

interface NameData {
  name: string;
  address: string;
  domain: string;
  text_records: TextRecords;
}
export default function Home() {
  const [names, setNames] = useState<NameData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchNames = async () => {
      try {
        const response = await fetch("/api/get-names");
        if (!response.ok) {
          throw new Error("Failed to fetch names");
        }
        const data = await response.json();
        setNames(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load agents");
      } finally {
        setLoading(false);
      }
    };

    fetchNames();
  }, []);

  return (
    <div className="flex flex-col items-start bg-white">
      <div className="flex flex-col justify-center w-full items-center bg-white h-screen">
        {/* Header */}
        <div className="flex items-center gap-1 px-4 md:px-10 py-5  w-full absolute top-0 left-0">
          <div className="flex items-center">
            <img
              className="w-8 h-8 mr-[5px]"
              alt="Agentkit"
              src="/agentkit-logo.svg"
            />
            <p className="font-bold text-2xl text-black">agentkit.id</p>
          </div>
        </div>
        {/* Hero Section */}
        <div className="flex flex-col items-center w-full bg-white pb-16">
          <div className="flex flex-col items-center gap-4 px-4 text-center">
            <p className="font-bold text-5xl text-gray-900">
              Build your onchain AI agent
            </p>
            <p className="text-xl text-gray-600 text-center">
              Learn how to make AI agents that interact with the blockchain
            </p>
            <a className="rounded-full px-6 py-2 bg-[#0A0B0D] hover:bg-zinc-700 text-white cursor-pointer ">
              Link to docs
            </a>
          </div>
        </div>

        {/* Banner Image */}
        <img
          className="w-full absolute bottom-0 left-0"
          alt="Art agentkit"
          src="/art-agentkit.svg"
        />
      </div>

      {/* Agents Section */}
      <div className="flex flex-col items-center gap-10 py-20 px-10 w-full bg-[#0A0B0D]">
        <div className="text-3xl text-white font-medium">
          Explore active agents
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 w-full max-w-[1200px]">
          {loading ? (
            <div className="text-white">Loading agents...</div>
          ) : error ? (
            <div className="text-red-500">{error}</div>
          ) : names.length === 0 ? (
            <div className="text-white">No agents found</div>
          ) : (
            names.map((name, index) => (
              <div
                key={index}
                className="flex flex-col gap-2 p-5 bg-[#141519] rounded-xl"
              >
                <img
                  className="w-[60px] h-[60px] rounded-full"
                  alt={`${name.name} avatar`}
                  src={name.text_records?.avatar || "/avatar1.svg"}
                />
                <div className="text-white">{name.name}.agentkit.eth</div>
                <p className="text-gray-300 truncate">
                  {name.text_records?.description ||
                    "This agent has no description"}
                </p>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Footer */}
      <footer className="flex items-center justify-between px-10 py-5 w-full bg-[#0A0B0D] border-t border-gray-700 flex-wrap gap-2">
        <div className="flex items-center gap-1">
          <img
            className="w-8 h-8 mr-[5px]"
            alt="Agentkit"
            src="/agentkit-logo-white.svg"
          />
          <p className="font-bold text-2xl text-white">agentkit.id</p>
        </div>

        <div className="flex items-center gap-1">
          <span className="text-xs text-gray-300">By</span>
          <a
            href="https://www.coinbase.com/developer-platform/products/wallet-sdk"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-gray-300 cursor-pointer  hover:underline"
          >
            Coinbase
          </a>
          <span className="text-xs text-gray-300">&amp;</span>
          <a
            href="https://namestone.xyz"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-gray-300 cursor-pointer hover:underline"
          >
            NameStone
          </a>
        </div>
      </footer>
    </div>
  );
}
