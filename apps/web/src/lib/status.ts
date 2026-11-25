export const STATUS_ORDER = ['RECEIVED', 'VERIFIED', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'REJECTED'] as const;
export type ReportStatus = (typeof STATUS_ORDER)[number];

export const STATUS_LABELS: Record<ReportStatus, string> = {
	RECEIVED: 'Laporan Diterima',
	VERIFIED: 'Laporan Diverifikasi',
	REJECTED: 'Laporan Ditolak',
	ASSIGNED: 'Petugas Ditugaskan',
	IN_PROGRESS: 'Penanganan Berlangsung',
	RESOLVED: 'Penanganan Selesai'
};

/** Warna penanda peta dan lencana status. */
export const STATUS_COLORS: Record<ReportStatus, string> = {
	RECEIVED: '#e5341a',
	VERIFIED: '#f08c00',
	ASSIGNED: '#1c7ed6',
	IN_PROGRESS: '#7048e8',
	RESOLVED: '#2f9e44',
	REJECTED: '#868e96'
};

const dateTime = new Intl.DateTimeFormat('id-ID', {
	timeZone: 'Asia/Jakarta',
	day: 'numeric',
	month: 'short',
	year: 'numeric',
	hour: '2-digit',
	minute: '2-digit',
	hour12: false
});

export function formatDateTime(value: string | Date | null | undefined): string {
	if (!value) return '–';
	return dateTime.format(new Date(value)).replace(/\./g, ':').replace(/(\d{2}):(\d{2})$/, '$1.$2') + ' WIB';
}

export function formatMeters(m: number | null | undefined): string {
	if (m === null || m === undefined) return '–';
	if (m >= 1000) return `${(m / 1000).toLocaleString('id-ID', { maximumFractionDigits: 2 })} km`;
	return `${m.toLocaleString('id-ID', { maximumFractionDigits: 1 })} m`;
}

export const formatCoord = (c: { latitude: number; longitude: number } | null | undefined) =>
	c ? `${c.latitude.toFixed(6)}, ${c.longitude.toFixed(6)}` : '–';
