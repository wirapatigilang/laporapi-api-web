import { redirect } from '@sveltejs/kit';
import { callApi } from '#lib/server/api.js';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) redirect(303, locals.sessionExpired ? '/login?expired=1' : '/login');
	const res = await callApi('GET', '/api/notifications', { token: locals.token });
	if (res.status === 401) redirect(303, '/login?expired=1');
	return { user: locals.user, notifications: (res.body?.notifications ?? []) as any[] };
};

export const actions: Actions = {
	// UC-09 langkah 1: membuka Notifikasi lalu Halaman Detail Laporan.
	open: async ({ locals, request }) => {
		if (!locals.user) redirect(303, '/login');
		const id = String((await request.formData()).get('id') ?? '');
		const res = await callApi('POST', `/api/notifications/${id}/read`, { token: locals.token, json: {} });
		const reportId = res.body?.notification?.reportId;
		redirect(303, reportId ? `/reports/${reportId}` : '/notifications');
	}
};
