import { error, fail, redirect } from '@sveltejs/kit';
import { callApi } from '#lib/server/api.js';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) redirect(303, locals.sessionExpired ? '/login?expired=1' : '/login');
	if (locals.user.role !== 'ADMIN') error(403, 'Halaman ini hanya untuk Admin Polres');
	const [officers, sectors, agencies] = await Promise.all([
		callApi('GET', '/api/officers', { token: locals.token }),
		callApi('GET', '/api/police-sectors', { token: locals.token }),
		callApi('GET', '/api/agencies', { token: locals.token })
	]);
	if (officers.status === 401) redirect(303, '/login?expired=1');
	return {
		user: locals.user,
		officers: (officers.body?.officers ?? []) as any[],
		policeSectors: (sectors.body?.policeSectors ?? []) as { id: string; name: string }[],
		agencies: (agencies.body?.agencies ?? []) as { id: string; name: string }[]
	};
};

function formValues(form: FormData) {
	return {
		name: String(form.get('name') ?? ''),
		phoneNumber: String(form.get('phoneNumber') ?? ''),
		role: String(form.get('role') ?? ''),
		policeSectorId: String(form.get('policeSectorId') ?? '') || null,
		agencyId: String(form.get('agencyId') ?? '') || null
	};
}

async function send(locals: App.Locals, action: string, method: string, path: string, json: unknown, id: string | null = null) {
	if (!locals.user) redirect(303, '/login');
	const res = await callApi(method, path, { token: locals.token, json });
	if (res.status === 401) redirect(303, '/login?expired=1');
	if (res.status >= 400) {
		const e = res.body?.error;
		return fail(res.status, { action, id, message: e?.message ?? 'Tindakan gagal', fields: e?.fields ?? {}, values: json });
	}
	return { action, id, success: true, message: res.body.message, officer: res.body.officer, initialPassword: res.body.initialPassword ?? null };
}

export const actions: Actions = {
	// UC-03 langkah 2–5
	create: async ({ locals, request }) => send(locals, 'create', 'POST', '/api/officers', formValues(await request.formData())),
	// UC-03 alternate 2a
	update: async ({ locals, request }) => {
		const form = await request.formData();
		const id = String(form.get('id') ?? '');
		return send(locals, 'update', 'PATCH', `/api/officers/${id}`, formValues(form), id);
	},
	// UC-03 alternate 2b
	deactivate: async ({ locals, request }) => {
		const id = String((await request.formData()).get('id') ?? '');
		return send(locals, 'deactivate', 'POST', `/api/officers/${id}/deactivate`, {}, id);
	}
};
