import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = ({ locals }) => {
	if (!locals.user) redirect(303, locals.sessionExpired ? '/login?expired=1' : '/login');
	return { user: locals.user };
};
