/**
 * Layanan NASA FIRMS tiruan untuk pengujian (API dijalankan dengan FIRMS_BASE_URL ke sini).
 * Mode "ok": satu titik panas 800 m di utara pusat kotak pencarian, dan satu titik di sudut
 * kotak (di luar radius 5 km) yang tidak boleh dihitung. Mode "fail": jawaban 503.
 */
const R = 6_371_000;
let mode: "ok" | "fail" = "ok";
export const FIRMS_PORT = Number(process.env.FIRMS_PORT ?? 3199);
export const setFirmsMode = (m: "ok" | "fail") => (mode = m);
export let firmsRequests: string[] = [];

let server: ReturnType<typeof Bun.serve> | null = null;
export function startFirmsMock() {
  server ??= Bun.serve({
    port: FIRMS_PORT,
    fetch(req) {
      const url = new URL(req.url);
      firmsRequests.push(url.pathname);
      if (mode === "fail") return new Response("Service Unavailable", { status: 503 });
      // /api/area/csv/{key}/{source}/{w,s,e,n}/{days}
      const parts = url.pathname.split("/");
      const source = parts[5];
      const [w, s, e, n] = parts[6].split(",").map(Number);
      const header = "latitude,longitude,bright_ti4,scan,track,acq_date,acq_time,satellite,instrument,confidence,version";
      if (source !== "VIIRS_SNPP_NRT") return new Response(header + "\n");
      const cLat = (s + n) / 2;
      const cLng = (w + e) / 2;
      const nearLat = cLat + (800 / R) * (180 / Math.PI);
      const today = new Date().toISOString().slice(0, 10);
      const rows = [
        `${nearLat.toFixed(6)},${cLng.toFixed(6)},330.1,0.4,0.4,${today},0542,N,VIIRS,n,2.0NRT`,
        `${(n - 0.0005).toFixed(6)},${(e - 0.0005).toFixed(6)},310.0,0.4,0.4,${today},0542,N,VIIRS,l,2.0NRT`,
      ];
      return new Response(`${header}\n${rows.join("\n")}\n`);
    },
  });
}
export function stopFirmsMock() {
  server?.stop(true);
  server = null;
}
