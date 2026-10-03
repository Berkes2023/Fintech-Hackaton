import { buildLabel, parseLabelRequest } from "@/lib/api";

// Public, read-only, no personal data: any origin may call it.
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS });
}

export async function POST(req: Request) {
  const parsed = parseLabelRequest(await req.json().catch(() => null));
  if (!parsed.ok) return Response.json({ error: "bad_request", message: parsed.error }, { status: 400, headers: CORS });
  return Response.json(buildLabel(parsed.req, parsed.defaulted), { headers: CORS });
}
