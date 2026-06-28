import { transfers } from "@/lib/dashboard-state";

export async function GET() {
  return Response.json({ transfers });
}
