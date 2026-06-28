import { tokenPanel } from "@/lib/dashboard-state";

export async function GET() {
  return Response.json(tokenPanel);
}
