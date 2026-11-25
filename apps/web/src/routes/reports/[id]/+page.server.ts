import { error, fail, redirect } from '@sveltejs/kit';
import { callApi } from '#lib/server/api.js';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, params }) => {
	if (!locals.user) redirect(303, locals.sessionExpired ? '/login?expired=1' : '/login');
	const res = await callApi('GET', `/api/reports/${params.id}`, { token: locals.token });
	if (res.status === 401) redirect(303, '/login?expired=1');
	if (res.status !== 200) error(res.status, res.body?.error?.message ?? 'Laporan tidak dapat dibuka');
	return { user: locals.user, report: res.body.report as any, hotspots: res.body.hotspots as any };
};

/** Meneruskan tindakan di Halaman Detail Laporan ke API dan mengembalikan pesan hasil/galat. */
async function act(
	locals: App.Locals,
	action: string,
	path: string,
	json: unknown,
	okMessage?: string
) {
	if (!locals.user) redirect(303, '/login');
	const res = await callApi('POST', path, { token: locals.token, json });
	if (res.status === 401) redirect(303, '/login?expired=1');
	if (res.status >= 400) {
		const e = res.body?.error;
		return fail(res.status, { action, message: e?.message ?? 'Tindakan gagal, coba lagi', fields: e?.fields ?? {}, values: json });
	}
	return { action, success: true, message: okMessage ?? res.body?.message ?? 'Berhasil', result: res.body };
}

export const actions: Actions = {
	// UC-07 langkah 2–6
	verify: async ({ locals, params }) => act(locals, 'verify', `/api/reports/${params.id}/verify`, {}),
	// UC-07 alternate 1a
	fieldCheck: async ({ locals, params, request }) => {
		const form = await request.formData();
		return act(locals, 'fieldCheck', `/api/reports/${params.id}/notes`, { note: String(form.get('note') ?? '') });
	}
};
