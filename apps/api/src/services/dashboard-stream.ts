/**
 * DashboardStream: siaran Server-Sent Events ke Dasbor Laporan (UC-06 2a, UC-09 langkah 4).
 * Setiap pelanggan hanya menerima peristiwa yang masuk cakupannya.
 */
import type { Viewer } from "./access";

export interface StreamEvent {
  event: "report-created" | "incident-updated";
  incidentId: string;
  reportId: string;
  policeSectorId: string | null;
  agencyIds?: string[];
}

interface Subscriber {
  viewer: Viewer;
  send: (chunk: string) => void;
}

const subscribers = new Set<Subscriber>();
const encoder = new TextEncoder();

function inScope(viewer: Viewer, e: StreamEvent): boolean {
  if (viewer.role === "ADMIN") return true;
  if (viewer.role === "SECTOR_OPERATOR") return !!e.policeSectorId && e.policeSectorId === viewer.policeSectorId;
  if (viewer.role === "AGENCY_OFFICER") return !!viewer.agencyId && (e.agencyIds ?? []).includes(viewer.agencyId);
  return false;
}

export const DashboardStream = {
  /** Membuka aliran SSE untuk satu pengguna. */
  open(viewer: Viewer): Response {
    let sub: Subscriber | null = null;
    let heartbeat: ReturnType<typeof setInterval> | null = null;
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        const send = (chunk: string) => {
          try {
            controller.enqueue(encoder.encode(chunk));
          } catch {
            cleanup();
          }
        };
        sub = { viewer, send };
        subscribers.add(sub);
        send(`retry: 3000\n: terhubung\n\n`);
        heartbeat = setInterval(() => send(`: denyut\n\n`), 15000);
      },
      cancel() {
        cleanup();
      },
    });
    function cleanup() {
      if (sub) subscribers.delete(sub);
      if (heartbeat) clearInterval(heartbeat);
      sub = null;
    }
    return new Response(stream, {
      headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive" },
    });
  },

  broadcast(e: StreamEvent) {
    const data = JSON.stringify({ incidentId: e.incidentId, reportId: e.reportId });
    for (const s of subscribers) if (inScope(s.viewer, e)) s.send(`event: ${e.event}\ndata: ${data}\n\n`);
  },
};
