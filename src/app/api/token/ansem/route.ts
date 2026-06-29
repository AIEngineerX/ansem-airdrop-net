import { getMarket } from "@/lib/price";

export const revalidate = 60;

export async function GET() {
  const { ansem } = await getMarket();
  return Response.json(ansem);
}
