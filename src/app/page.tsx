import { getMarket } from "@/lib/price";
import { getCreatorRewards } from "@/lib/pump";
import { CreatorRewardsView } from "@/components/CreatorRewardsView";
import { Tabs } from "@/components/Tabs";

export const revalidate = 60;

export default async function Home() {
  const { ansem, solPriceUsd } = await getMarket();
  const rewards = await getCreatorRewards(solPriceUsd);
  return (
    <main className="flex min-h-screen flex-col">
      <Tabs
        ansemPriceUsd={ansem.priceUsd}
        creatorRewards={<CreatorRewardsView rewards={rewards} ansem={ansem} solPriceUsd={solPriceUsd} />}
      />
    </main>
  );
}
