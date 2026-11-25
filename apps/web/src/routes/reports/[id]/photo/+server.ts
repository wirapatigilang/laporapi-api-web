import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

/** Foto Laporan lewat server web (token di cookie httpOnly). */
export const GET: RequestHandler = async ({ locals, params }) => {
	if (!locals.token) error(401, 'Silakan masuk terlebih dahulu');
	const res = await fetch(`${process.env.API_URL ?? 'http://localhost:3000'}/api/reports/${params.id}/photo`, {
		headers: { Authorization: `Bearer ${locals.token}` }
	});
	if (!res.ok) error(res.status, 'Foto tidak tersedia');
	return new Response(res.body, {
		headers: { 'Content-Type': res.headers.get('Content-Type') ?? 'image/jpeg', 'Cache-Control': 'private, max-age=3600' }
	});
};
