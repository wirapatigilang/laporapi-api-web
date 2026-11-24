

export const SESSION_COOKIE = 'lapor_session';
const baseUrl = () => process.env.API_URL ?? 'http://localhost:3000';

export interface ApiResult<T = any> {
	status: number;
	body: T;
}

/** Memanggil layanan API dari server SvelteKit (token tidak pernah sampai ke peramban). */
export async function callApi<T = any>(
	method: string,
	path: string,
	options: { token?: string | null; json?: unknown; form?: FormData } = {}
): Promise<ApiResult<T>> {
	const headers: Record<string, string> = {};
	if (options.token) headers.Authorization = `Bearer ${options.token}`;
	let body: BodyInit | undefined;
	if (options.json !== undefined) {
		headers['Content-Type'] = 'application/json';
		body = JSON.stringify(options.json);
	} else if (options.form) body = options.form;
	const res = await fetch(baseUrl() + path, { method, headers, body });
	const text = await res.text();
	let parsed: any = null;
	try {
		parsed = text ? JSON.parse(text) : null;
	} catch {
		parsed = text;
	}
	return { status: res.status, body: parsed };
}
