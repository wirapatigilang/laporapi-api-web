declare global {
	namespace App {
		interface Locals {
			user: SessionUser | null;
			token: string | null;
			sessionExpired?: boolean;
		}
	}
	interface SessionUser {
		id: string;
		name: string;
		phoneNumber: string;
		email: string;
		role: 'REPORTER' | 'ADMIN' | 'SECTOR_OPERATOR' | 'AGENCY_OFFICER';
		policeSector: { id: string; name: string } | null;
		agency: { id: string; name: string } | null;
	}
}

export {};
