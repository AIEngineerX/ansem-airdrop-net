"use client";
import type { AirdropSnapshot } from "@/lib/airdrop-snapshot";
import { AirdropStats } from "./AirdropStats";
import { AirdropGraph } from "./AirdropGraph";
import { AirdropFeed } from "./AirdropFeed";
import { RecipientLookup } from "./RecipientLookup";
import { DataStamp } from "./DataStamp";

export function AirdropWebView({ snap, loading }: { snap: AirdropSnapshot; loading: boolean }) {
  return (
    <div className="mt-5 space-y-5">
      <AirdropStats snap={snap} />
      <AirdropGraph snap={snap} loading={loading} />
      <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        <AirdropFeed snap={snap} />
        <RecipientLookup snap={snap} />
      </div>
      <DataStamp snap={snap} loading={loading} />
    </div>
  );
}
