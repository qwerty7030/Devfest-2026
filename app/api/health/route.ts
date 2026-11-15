import { model } from '@/lib/fitcheck/gemini';

export async function GET() {
  return Response.json({ status: "ok", aiConfigured: Boolean(process.env.GEMINI_API_KEY),
    model: model(), revision: process.env.NEXT_PUBLIC_APP_REVISION ?? 'local',
  }, { headers: { "Cache-Control": "no-store" } });
}
