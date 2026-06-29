"use client";
import { useEffect, useState } from "react";
import { fetchSnapshot } from "@/lib/snapshot-client";
import { EMPTY_SNAPSHOT, type AirdropSnapshot } from "@/lib/airdrop-snapshot";
import { AirdropStats } from "./AirdropStats";
import { AirdropFeed } from "./AirdropFeed";
import { RecipientLookup } from "./RecipientLookup";
import { DataStamp } from "./DataStamp";

export function AirdropWebView() {
  const [snap, setSnap] = useState<AirdropSnapshot>(EMPTY_SNAPSHOT);
  useEffect(() => { fetchSnapshot().then(setSnap); }, []);
  return (
    <div className="mt-5 space-y-5">
      <AirdropStats snap={snap} />
      {/* AirdropGraph slot — Task 10 inserts <AirdropGraph snap={snap} /> here */}
      <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        <AirdropFeed snap={snap} />
        <RecipientLookup snap={snap} />
      </div>
      <DataStamp snap={snap} />
    </div>
  );
}
