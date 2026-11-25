import { error, fail, redirect } from '@sveltejs/kit';
import { callApi } from '#lib/server/api.js';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, params }) => {
	if (!locals.user) redirect(303, locals.sessionExpired ? '/login?expired=1' : '/login');
	const res = await callApi('GET', `/api/reports/${params.id}`, { token: locals.token });
	if (res.status === 401) redirect(303, '/login?expired=1');
	if (res.status !== 200) error(res.status, res.body?.error?.message ?? 'Laporan tidak dapat dibuka');
	let rejectionReasons: { id: string; label: string; requiresNote: boolean }[] = [];
	if (locals.user.role === 'ADMIN' && res.body.report.status === 'RECEIVED') {
		const rr = await callApi('GET', '/api/rejection-reasons', { token: locals.token });
		if (rr.status === 200) rejectionReasons = rr.body.reasons;
	}
	let agencies: { id: string; name: string }[] = [];
	if (locals.user.role === 'ADMIN' && ['VERIFIED', 'ASSIGNED', 'IN_PROGRESS'].includes(res.body.report.status)) {
		const ag = await callApi('GET', '/api/agencies', { token: locals.token });
		if (ag.status === 200) agencies = ag.body.agencies;
	}
	return { user: locals.user, report: res.body.report as any, hotspots: res.body.hotspots as any, rejectionReasons, agencies };
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
	},
	// UC-10 langkah 3–6
	dispatch: async ({ locals, params, request }) => {
		const form = await request.formData();
		const agencyIds = form.getAll('agencyIds').map(String);
		return act(locals, 'dispatch', `/api/reports/${params.id}/dispatches`, { agencyIds, note: String(form.get('note') ?? '') });
	},
	// UC-11 langkah 2–5 dan 4a
	handling: async ({ locals, params, request }) => {
		const form = await request.formData();
		const kind = String(form.get('kind') ?? '');
		const note = String(form.get('note') ?? '');
		const json = kind === 'IN_PROGRESS' ? { nextStatus: 'IN_PROGRESS', note } : { activity: kind, note };
		return act(locals, 'handling', `/api/reports/${params.id}/status`, json);
	},
	// UC-12 langkah 3–5
	resolve: async ({ locals, params }) => act(locals, 'resolve', `/api/reports/${params.id}/resolve`, {}),
	// UC-09 langkah 2–4
	standby: async ({ locals, params, request }) => {
		const form = await request.formData();
		return act(locals, 'standby', `/api/reports/${params.id}/standby`, { note: String(form.get('note') ?? '') });
	},
	// UC-08 langkah 3–6
	reject: async ({ locals, params, request }) => {
		const form = await request.formData();
		const reasonId = String(form.get('reasonId') ?? '');
		return act(locals, 'reject', `/api/reports/${params.id}/reject`, {
			reasonId: reasonId || null,
			note: String(form.get('note') ?? '')
		});
	}
};
