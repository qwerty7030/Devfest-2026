"use client";

// Dev harness for the detection + AI pipeline. Not the real UI: the UI
// teammate owns app/page.tsx. Open /debug, or /debug?mock=1 for the fake hook.

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { useFitCheckLive as useReal } from "@/lib/fitcheck/useFitCheckLive";
import { useFitCheckLive as useMock } from "@/lib/fitcheck/useFitCheckLive.mock";
import type { FitCheckLive } from "@/lib/fitcheck/types";

const STATE_COLOR: Record<string, string> = {
  EMPTY: "bg-zinc-600",
  ENTERED: "bg-amber-500",
  LIVE: "bg-red-600",
  LEFT: "bg-sky-600",
};

function Harness({ live, label }: { live: FitCheckLive; label: string }) {
  const { videoRef, state, comments, viewerCount, lastResult, error, forceEnter, reset } = live;
  return (
    <main className="min-h-screen bg-black text-white p-4 flex flex-col gap-4 lg:flex-row">
      <div className="relative w-full max-w-md aspect-[9/16] bg-zinc-900 rounded-xl overflow-hidden mx-auto lg:mx-0">
        <video ref={videoRef} autoPlay playsInline muted className="absolute inset-0 w-full h-full object-cover -scale-x-100" />
        <div className="absolute top-3 left-3 flex gap-2 items-center text-sm">
          <span className={`px-2 py-0.5 rounded font-bold ${STATE_COLOR[state]}`}>{state}</span>
          <span className="px-2 py-0.5 rounded bg-black/50">👁 {viewerCount.toLocaleString()}</span>
        </div>
        <ul className="absolute bottom-3 left-3 right-3 flex flex-col gap-1 text-sm">
          {comments.slice(-8).map((c) => (
            <li key={c.id} className="bg-black/40 rounded px-2 py-1">
              <span className="font-semibold mr-2">{c.username}</span>
              {c.text}
              <span className={`ml-2 text-xs ${c.source === "ai" ? "text-emerald-400" : "text-zinc-400"}`}>
                {c.source}·{c.tone}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <section className="flex-1 flex flex-col gap-3 text-sm max-w-xl">
        <h1 className="text-lg font-bold">oko pipeline: {label}</h1>
        {error && <p className="text-red-400">{error}</p>}
        <div className="flex gap-2">
          <button onClick={forceEnter} className="px-3 py-1.5 rounded bg-red-600">Force enter (Space)</button>
          <button onClick={reset} className="px-3 py-1.5 rounded bg-zinc-700">Reset (Esc)</button>
        </div>
        <p>
          Last result:{" "}
          {lastResult ? <b>{lastResult.rating}/10, {lastResult.vibe}</b> : <span className="text-zinc-500">none yet</span>}
        </p>
        <p className="text-zinc-400">
          Green tag = written by Gemini, grey = canned filler. Watch the server terminal for latency logs.
        </p>
      </section>
    </main>
  );
}

function Real() {
  return <Harness live={useReal()} label="real (MediaPipe + Gemini)" />;
}
function Mock() {
  return <Harness live={useMock()} label="mock" />;
}

function Picker() {
  const mock = useSearchParams().get("mock") === "1";
  return mock ? <Mock /> : <Real />;
}

export default function DebugPage() {
  return (
    <Suspense>
      <Picker />
    </Suspense>
  );
}
