import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

/** Meneruskan siaran SSE dari API ke peramban; token tetap di cookie server (UC-06 2a). */
export const GET: RequestHandler = async ({ locals, request }) => {
	if (!locals.token) error(401, 'Silakan masuk terlebih dahulu');
	const upstream = await fetch(`${process.env.API_URL ?? 'http://localhost:3000'}/api/stream`, {
		headers: { Authorization: `Bearer ${locals.token}`, Accept: 'text/event-stream' },
		signal: request.signal
	});
	if (!upstream.ok || !upstream.body) error(upstream.status, 'Siaran tidak tersedia');
	return new Response(upstream.body, {
		headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' }
	});
};
