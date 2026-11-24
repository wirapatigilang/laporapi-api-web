import { fail, redirect } from '@sveltejs/kit';
import { callApi, SESSION_COOKIE } from '#lib/server/api.js';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = ({ locals, url }) => {
	if (locals.user) redirect(303, '/dashboard');
	const expired = locals.sessionExpired || url.searchParams.get('expired') === '1';
	return { notice: expired ? 'Sesi berakhir, silakan masuk kembali' : null };
};

export const actions: Actions = {
	default: async ({ request, cookies }) => {
		const form = await request.formData();
		const phoneNumber = String(form.get('phoneNumber') ?? '');
		const password = String(form.get('password') ?? '');
		// Langkah 1: Halaman Masuk selalu mengirim penanda kanal "web".
		const res = await callApi('POST', '/api/auth/login', {
			json: { phoneNumber, password, channel: 'web' }
		});
		if (res.status !== 200) {
			const error = res.body?.error;
			return fail(res.status, {
				phoneNumber,
				message: error?.message ?? 'Tidak dapat masuk, coba lagi',
				fields: error?.fields ?? {}
			});
		}
		cookies.set(SESSION_COOKIE, res.body.token, {
			path: '/',
			httpOnly: true,
			sameSite: 'lax',
			secure: false,
			expires: new Date(res.body.expiresAt)
		});
		// Langkah 5: Admin Polres, Operator Polsek, dan Petugas Instansi ke Dasbor Laporan.
		redirect(303, '/dashboard');
	}
};
