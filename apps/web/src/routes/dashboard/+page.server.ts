import { error, redirect } from '@sveltejs/kit';
import { callApi } from '#lib/server/api.js';
import type { PageServerLoad } from './$types';

const FILTER_KEYS = ['status', 'districtId', 'policeSectorId', 'from', 'to'] as const;

export const load: PageServerLoad = async ({ locals, url }) => {
	if (!locals.user) redirect(303, locals.sessionExpired ? '/login?expired=1' : '/login');
	const params = new URLSearchParams();
	const filter: Record<string, string> = {};
	for (const key of FILTER_KEYS) {
		const v = url.searchParams.get(key);
		if (v) {
			params.set(key, v);
			filter[key] = v;
		}
	}
	const [incidents, districts, sectors] = await Promise.all([
		callApi('GET', `/api/incidents?${params}`, { token: locals.token }),
		callApi('GET', '/api/districts', { token: locals.token }),
		callApi('GET', '/api/police-sectors', { token: locals.token })
	]);
	if (incidents.status === 401) redirect(303, '/login?expired=1');
	if (incidents.status === 422) {
		return { user: locals.user, filter, incidents: [], districts: districts.body?.districts ?? [], policeSectors: sectors.body?.policeSectors ?? [], filterError: Object.values(incidents.body.error.fields ?? {}).join(', ') };
	}
	if (incidents.status !== 200) error(incidents.status, incidents.body?.error?.message ?? 'Gagal memuat laporan');
	return {
		user: locals.user,
		filter,
		incidents: incidents.body.incidents as any[],
		districts: districts.body?.districts ?? [],
		policeSectors: sectors.body?.policeSectors ?? [],
		filterError: null as string | null
	};
};
