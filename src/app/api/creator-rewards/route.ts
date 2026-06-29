import { getCreatorRewards } from "@/lib/pump";
import { getMarket } from "@/lib/price";

export const revalidate = 60;

export async function GET() {
  const { solPriceUsd } = await getMarket();
  return Response.json(await getCreatorRewards(solPriceUsd));
}
