export async function GET() {
  return Response.json({ status: "ok", aiConfigured: Boolean(process.env.GEMINI_API_KEY) }, { headers: { "Cache-Control": "no-store" } });
}
