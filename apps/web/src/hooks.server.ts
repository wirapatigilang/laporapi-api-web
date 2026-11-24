import type { Handle } from '@sveltejs/kit/hooks';
import { callApi, SESSION_COOKIE } from '#lib/server/api.js';

/** Membaca cookie sesi dan memeriksa token ke API (UC-02 "kapan saja"). */
export const handle: Handle = async ({ event, resolve }) => {
	event.locals.user = null;
	event.locals.token = null;
	const token = event.cookies.get(SESSION_COOKIE);
	if (token) {
		const me = await callApi('GET', '/api/auth/me', { token });
		if (me.status === 200) {
			event.locals.user = me.body.user;
			event.locals.token = token;
		} else {
			event.cookies.delete(SESSION_COOKIE, { path: '/' });
			if (me.body?.error?.code === 'TOKEN_EXPIRED') event.locals.sessionExpired = true;
		}
	}
	return resolve(event);
};
