import { error, redirect } from '@sveltejs/kit';
import { callApi } from '#lib/server/api.js';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, params }) => {
	if (!locals.user) redirect(303, locals.sessionExpired ? '/login?expired=1' : '/login');
	const res = await callApi('GET', `/api/reports/${params.id}`, { token: locals.token });
	if (res.status === 401) redirect(303, '/login?expired=1');
	if (res.status !== 200) error(res.status, res.body?.error?.message ?? 'Laporan tidak dapat dibuka');
	return { user: locals.user, report: res.body.report as any, hotspots: res.body.hotspots as any };
};
