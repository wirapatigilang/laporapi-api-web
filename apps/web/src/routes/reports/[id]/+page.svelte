<script lang="ts">
	import AppHeader from '#lib/components/AppHeader.svelte';
	import LeafletMap, { type MapPoint } from '#lib/components/LeafletMap.svelte';
	import StatusBadge from '#lib/components/StatusBadge.svelte';
	import { formatCoord, formatDateTime, formatMeters } from '#lib/status.js';
	import { enhance } from '$app/forms';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	const r = $derived(data.report);
	const h = $derived(data.hotspots);
	const role = $derived(data.user.role);
	const isAdmin = $derived(role === 'ADMIN');
	const canDecide = $derived(isAdmin && r.status === 'RECEIVED');
	const isOperator = $derived(role === 'SECTOR_OPERATOR');
	const standbyBlocked = $derived(r.status === 'REJECTED' ? 'Laporan sudah ditolak' : r.status === 'RESOLVED' ? 'Penanganan sudah selesai' : null);
	const canDispatch = $derived(isAdmin && ['VERIFIED', 'ASSIGNED', 'IN_PROGRESS'].includes(r.status));

	let confirming = $state<null | 'verify' | 'reject' | 'dispatch'>(null);
	let showPhone = $state(false);
	let showFieldCheck = $state(false);
	let busy = $state(false);

	/** Setelah tindakan: tutup dialog dan muat ulang data halaman. */
	const submitting = () => {
		busy = true;
		return async ({ result, update }: { result: { type: string }; update: (o?: { reset?: boolean }) => Promise<void> }) => {
			busy = false;
			// Dialog tetap terbuka bila isian ditolak (422) agar pesan tampil di dalamnya.
			if (!(result.type === 'failure' && (confirming === 'reject' || confirming === 'dispatch') && (result as any).status === 422)) confirming = null;
			await update({ reset: false });
		};
	};

	const points: MapPoint[] = $derived.by(() => {
		const list: MapPoint[] = [
			{ id: 'report', latitude: r.latitude, longitude: r.longitude, status: r.status, label: `Lokasi laporan (${r.locationSource === 'PHOTO' ? 'koordinat foto' : 'GPS perangkat'})` }
		];
		if (r.photoCoordinate && r.locationSource === 'DEVICE')
			list.push({ id: 'photo', latitude: r.photoCoordinate.latitude, longitude: r.photoCoordinate.longitude, color: '#212529', kind: 'photo', label: 'Koordinat foto (EXIF)' });
		for (const [i, hs] of (h?.hotspots ?? []).entries())
			list.push({ id: `hs-${i}`, latitude: hs.latitude, longitude: hs.longitude, color: '#fab005', kind: 'hotspot', label: `Titik panas ${formatMeters(hs.distanceMeters)}` });
		return list;
	});
	const lines = $derived(
		r.photoCoordinate && r.locationSource === 'DEVICE'
			? ([[[r.latitude, r.longitude], [r.photoCoordinate.latitude, r.photoCoordinate.longitude]]] as [[number, number], [number, number]][])
			: []
	);
</script>

<svelte:head><title>{r.reportNumber} · Lapor Api</title></svelte:head>

<AppHeader user={data.user} />

<main class="content">
	<a class="back" href="/dashboard">← Dasbor Laporan</a>
	<div class="head">
		<h1 data-testid="report-number">{r.reportNumber}</h1>
		<span data-testid="report-status"><StatusBadge status={r.status} /></span>
		{#if r.sectorStandby}<span class="tag standby" data-testid="standby-flag" title={`${r.sectorStandby.by ?? ''} · ${formatDateTime(r.sectorStandby.at)}`}>Polsek sudah siaga</span>{/if}
		{#if r.isDuplicate}<span class="note" data-testid="duplicate-of">Tergabung dengan laporan <a href={`/reports/${r.primaryReport.id}`}>{r.primaryReport.reportNumber}</a></span>{/if}
	</div>

	{#if form?.message && !(confirming && form.action === confirming)}
		<p class={form.success ? 'result ok' : 'result err'} role={form.success ? 'status' : 'alert'} data-testid="action-result" data-action={form.action}>{form.message}</p>
	{/if}

	{#if isAdmin}
		<section class="card actions" data-testid="admin-actions" aria-label="Tindakan Admin Polres">
			<div class="buttons">
				<button type="button" class="primary" data-testid="verify-button" disabled={!canDecide || busy} onclick={() => (confirming = 'verify')}>Verifikasi</button>
				<button type="button" class="danger" data-testid="reject-button" disabled={!canDecide || busy} onclick={() => (confirming = 'reject')}>Tolak</button>
				<button type="button" class="ghost" data-testid="contact-button" onclick={() => (showPhone = !showPhone)}>Hubungi Warga</button>
				<button type="button" class="ghost" data-testid="field-check-button" disabled={!canDecide} onclick={() => (showFieldCheck = !showFieldCheck)}>Minta cek lapangan</button>
				<button type="button" class="primary" data-testid="dispatch-button" disabled={!canDispatch || busy} onclick={() => (confirming = 'dispatch')}>Teruskan ke Instansi</button>
			</div>
			{#if showPhone}
				<p class="contact" data-testid="contact-info">Hubungi {r.reporter.name}:
					<a href={`tel:${r.reporter.phoneNumber}`} data-testid="contact-phone">{r.reporter.phoneNumber}</a></p>
			{/if}
			{#if showFieldCheck && canDecide}
				<form method="POST" action="?/fieldCheck" use:enhance={() => { const done = submitting(); return async (o) => { await done(o); if (o.result.type === 'success') showFieldCheck = false; }; }} data-testid="field-check-form" class="stack">
					<label for="fc-note">Catatan untuk Operator Polsek</label>
					<textarea id="fc-note" name="note" rows="3" maxlength="500" placeholder="Contoh: mohon pastikan asap di lokasi berasal dari lahan terbakar"></textarea>
					{#if form?.action === 'fieldCheck' && form?.fields?.note}<small class="field-error" data-testid="note-error">{form.fields.note}</small>{/if}
					<div><button type="submit" class="primary" disabled={busy}>Kirim permintaan</button></div>
				</form>
			{/if}
		</section>
	{/if}

	{#if isOperator}
		<section class="card actions" data-testid="operator-actions" aria-label="Tindakan Operator Polsek">
			<form method="POST" action="?/standby" use:enhance={submitting} class="stack">
				<label for="standby-note">Catatan penyiagaan <small class="muted">(opsional, mis. jumlah personel)</small></label>
				<textarea id="standby-note" name="note" rows="2" maxlength="500" disabled={!!standbyBlocked}></textarea>
				<div class="buttons">
					<button type="submit" class="primary" data-testid="standby-button" disabled={!!standbyBlocked || busy}>Siagakan Personel</button>
					{#if standbyBlocked}<span class="blocked" data-testid="standby-blocked">{standbyBlocked}</span>{/if}
				</div>
			</form>
		</section>
	{/if}

	{#if confirming === 'reject'}
		{@const fields = form?.action === 'reject' ? (form?.fields ?? {}) : {}}
		{@const values = form?.action === 'reject' ? ((form as any)?.values ?? {}) : {}}
		<div class="backdrop" role="presentation">
			<div class="dialog" role="dialog" aria-modal="true" aria-labelledby="reject-title" data-testid="reject-dialog">
				<h2 id="reject-title">Tolak laporan {r.reportNumber}</h2>
				<form method="POST" action="?/reject" use:enhance={submitting} class="stack">
					<fieldset class="reasons">
						<legend>Alasan penolakan</legend>
						{#each data.rejectionReasons as reason}
							<label class="radio"><input type="radio" name="reasonId" value={reason.id} checked={values.reasonId === reason.id} data-testid="reason-option" />{reason.label}</label>
						{/each}
					</fieldset>
					{#if fields.reasonId}<small class="field-error" data-testid="reason-error">{fields.reasonId}</small>{/if}
					<label for="reject-note">Catatan tambahan <small class="muted">(wajib untuk alasan Lainnya)</small></label>
					<textarea id="reject-note" name="note" rows="3" maxlength="500">{values.note ?? ''}</textarea>
					{#if fields.note}<small class="field-error" data-testid="reject-note-error">{fields.note}</small>{/if}
					{#if r.duplicates.length}<p class="small muted">{r.duplicates.length} laporan ganda ikut ditolak dengan alasan yang sama.</p>{/if}
					<div class="buttons end">
						<button type="button" class="ghost" data-testid="reject-cancel" onclick={() => (confirming = null)}>Batal</button>
						<button type="submit" class="primary" data-testid="reject-submit" disabled={busy}>Kirim Penolakan</button>
					</div>
				</form>
			</div>
		</div>
	{/if}

	{#if confirming === 'dispatch'}
		{@const fields = form?.action === 'dispatch' ? (form?.fields ?? {}) : {}}
		{@const sent = new Set((r.dispatches ?? []).map((d: any) => d.agency.id))}
		<div class="backdrop" role="presentation">
			<div class="dialog" role="dialog" aria-modal="true" aria-labelledby="dispatch-title" data-testid="dispatch-dialog">
				<h2 id="dispatch-title">Teruskan laporan {r.reportNumber} ke Instansi</h2>
				<form method="POST" action="?/dispatch" use:enhance={submitting} class="stack">
					<fieldset class="reasons">
						<legend>Instansi penerima</legend>
						{#each data.agencies as a}
							<label class="radio">
								<input type="checkbox" name="agencyIds" value={a.id} data-testid="agency-option" />{a.name}
								{#if sent.has(a.id)}<small class="muted" data-testid="already-dispatched">(sudah diteruskan)</small>{/if}
							</label>
						{/each}
					</fieldset>
					{#if fields.agencyIds}<small class="field-error" data-testid="agency-error">{fields.agencyIds}</small>{/if}
					<label for="dispatch-note">Catatan <small class="muted">(opsional)</small></label>
					<textarea id="dispatch-note" name="note" rows="2" maxlength="500"></textarea>
					{#if r.status !== 'VERIFIED'}<p class="small muted">Status tetap {r.statusLabel}; penambahan instansi dicatat sebagai kegiatan.</p>{/if}
					<div class="buttons end">
						<button type="button" class="ghost" data-testid="dispatch-cancel" onclick={() => (confirming = null)}>Batal</button>
						<button type="submit" class="primary" data-testid="dispatch-submit" disabled={busy}>Teruskan</button>
					</div>
				</form>
			</div>
		</div>
	{/if}

	{#if confirming === 'verify'}
		<div class="backdrop" role="presentation">
			<div class="dialog" role="dialog" aria-modal="true" aria-labelledby="verify-title" data-testid="confirm-dialog">
				<h2 id="verify-title">Verifikasi laporan {r.reportNumber}?</h2>
				<p>Status laporan{r.duplicates.length ? ` dan ${r.duplicates.length} laporan ganda` : ''} menjadi Laporan Diverifikasi. Warga dan Operator Polsek akan menerima notifikasi.</p>
				<form method="POST" action="?/verify" use:enhance={submitting} class="buttons end">
					<button type="button" class="ghost" onclick={() => (confirming = null)}>Batal</button>
					<button type="submit" class="primary" data-testid="confirm-yes" disabled={busy}>Ya, verifikasi</button>
				</form>
			</div>
		</div>
	{/if}

	<div class="grid">
		<section class="card">
			<img class="photo" src={`/reports/${r.id}/photo`} alt={`Foto laporan ${r.reportNumber}`} data-testid="report-photo" />
			<dl class="facts" data-testid="report-facts">
				<dt>Waktu lapor</dt><dd data-testid="reported-at">{formatDateTime(r.reportedAt)}</dd>
				<dt>Diterima sistem</dt><dd>{formatDateTime(r.receivedAt)}</dd>
				<dt>Kecamatan</dt><dd data-testid="district">{r.district.name}</dd>
				<dt>Polsek wilayah</dt><dd>{r.policeSector?.name ?? r.policeSectorNote}</dd>
				<dt>Koordinat laporan</dt><dd data-testid="coordinate">{formatCoord(r)} <small>({r.locationSource === 'PHOTO' ? 'koordinat foto' : 'GPS perangkat'})</small></dd>
				<dt>Akurasi GPS</dt><dd data-testid="gps-accuracy">{r.gpsAccuracy === null ? '–' : `± ${formatMeters(r.gpsAccuracy)}`}</dd>
				<dt>Koordinat foto (EXIF)</dt>
				<dd data-testid="photo-coordinate">
					{#if r.photoCoordinate}{formatCoord(r.photoCoordinate)}{:else}{r.photoCoordinateNote}{/if}
					{#if r.hasLocationMismatch}
						<span class="flag" data-testid="mismatch-flag">{r.locationMismatchNote}: {formatMeters(r.locationMismatchMeters)}</span>
					{:else if r.locationMismatchMeters !== null}
						<small>(selisih {formatMeters(r.locationMismatchMeters)})</small>
					{/if}
				</dd>
				<dt>Keterangan</dt><dd data-testid="description">{r.description ?? '–'}</dd>
				{#if r.rejection}
					<dt>Alasan penolakan</dt><dd data-testid="rejection-reason">{r.rejection.reason}{r.rejection.note ? `: ${r.rejection.note}` : ''}</dd>
				{/if}
			</dl>
		</section>

		<section class="side">
			<div>
				<LeafletMap {points} {lines} height="300px" testid="detail-map" fitPadding={30} />
				<ul class="legend">
					<li><span style="background:#e5341a"></span>Lokasi laporan (warna sesuai status)</li>
					{#if r.photoCoordinate && r.locationSource === 'DEVICE'}<li><span style="background:#212529"></span>Koordinat foto (EXIF)</li>{/if}
					{#if h?.count}<li><span style="background:#fab005"></span>Titik panas FIRMS</li>{/if}
				</ul>
			</div>

			<div class="card" data-testid="hotspot-hint">
				<h2>Petunjuk titik panas NASA FIRMS</h2>
				{#if !h}
					<p>–</p>
				{:else if !h.available}
					<p class="muted" data-testid="hotspot-unavailable">{h.note}</p>
				{:else if h.count === 0}
					<p data-testid="hotspot-summary">Tidak ada titik panas dalam radius {h.radiusKm} km ({h.dayRange} hari terakhir).</p>
				{:else}
					<p data-testid="hotspot-summary">
						<strong data-testid="hotspot-count">{h.count}</strong> titik panas dalam radius {h.radiusKm} km ({h.dayRange} hari terakhir).
						Terdekat <strong data-testid="hotspot-nearest">{formatMeters(h.nearestMeters)}</strong>.
					</p>
				{/if}
				<p class="muted small">Hanya petunjuk untuk pertimbangan Admin Polres, bukan penentu keputusan.</p>
			</div>

			{#if r.dispatches?.length}
				<div class="card" data-testid="dispatches">
					<h2>Instansi penerima {#if r.isOverdue}<span class="tag overdue" data-testid="detail-overdue">belum direspons</span>{/if}</h2>
					<ul class="plain">
						{#each r.dispatches as d}
							<li data-testid="dispatch-item" data-state={d.state}>
								<strong>{d.agency.name}</strong>
								<span class="tag" class:waiting={d.state === 'WAITING'} class:confirmed={d.state === 'CONFIRMED'} data-testid="dispatch-state">{d.stateLabel}</span>
								<small class="muted">diteruskan {formatDateTime(d.dispatchedAt)}{d.confirmedAt ? ` · dikonfirmasi ${formatDateTime(d.confirmedAt)}${d.confirmedBy ? ` oleh ${d.confirmedBy}` : ''}` : ''}</small>
							</li>
						{/each}
					</ul>
				</div>
			{/if}

			<div class="card" data-testid="reporter">
				<h2>Warga pelapor</h2>
				<p><span data-testid="reporter-name">{r.reporter.name}</span>
					{#if r.reporter.phoneNumber}· <a href={`tel:${r.reporter.phoneNumber}`} data-testid="reporter-phone">{r.reporter.phoneNumber}</a>{/if}</p>
			</div>
		</section>
	</div>

	<div class="grid">
		<section class="card" data-testid="duplicates">
			<h2>Laporan ganda ({r.duplicates.length})</h2>
			{#if r.duplicates.length === 0}
				<p class="muted">Tidak ada laporan ganda.</p>
			{:else}
				<ul>
					{#each r.duplicates as d}
						<li data-testid="duplicate-item"><a href={`/reports/${d.id}`}>{d.reportNumber}</a> · {d.reporterName} · {formatDateTime(d.reportedAt)}</li>
					{/each}
				</ul>
			{/if}
		</section>
		<section class="card" data-testid="history">
			<h2>Riwayat Status</h2>
			<ol class="timeline">
				{#each r.history as e}
					<li data-testid="history-item" data-type={e.type} data-activity={e.activity ?? ''}>
						<strong>{e.type === 'STATUS' ? e.statusLabel : (e.activityLabel ?? 'Kegiatan')}</strong>
						<span class="muted">{formatDateTime(e.createdAt)}{e.actorName ? ` · ${e.actorName}` : ''}</span>
						{#if e.note}<p class="small">{e.note}</p>{/if}
					</li>
				{/each}
			</ol>
		</section>
	</div>
</main>

<style>
	.content { padding: 20px; max-width: 1180px; margin: 0 auto; }
	.back { color: #b4442a; font-size: 14px; text-decoration: none; }
	.head { display: flex; align-items: center; flex-wrap: wrap; gap: 12px; margin: 8px 0 16px; }
	h1 { margin: 0; font-size: 26px; }
	h2 { font-size: 15px; margin: 0 0 8px; }
	.note { font-size: 14px; color: #5b524d; }
	.grid { display: grid; grid-template-columns: minmax(0, 1.2fr) minmax(0, 1fr); gap: 16px; margin-bottom: 16px; align-items: start; }
	@media (max-width: 900px) { .grid { grid-template-columns: 1fr; } }
	.side { display: grid; gap: 16px; }
	.card { background: #fff; border: 1px solid #f0dcd2; border-radius: 12px; padding: 16px; }
	.photo { width: 100%; max-height: 360px; object-fit: contain; background: #f8f1ed; border-radius: 8px; }
	.facts { display: grid; grid-template-columns: max-content 1fr; gap: 6px 16px; font-size: 14px; margin: 12px 0 0; }
	dt { color: #7a6f69; }
	dd { margin: 0; }
	.flag { display: inline-block; margin-left: 6px; background: #fff3bf; color: #8a5a00; font-weight: 600; font-size: 12px; padding: 2px 6px; border-radius: 6px; }
	.muted { color: #8a807a; }
	.small { font-size: 12px; margin: 4px 0 0; }
	ul { margin: 0; padding-left: 18px; font-size: 14px; }
	.timeline { list-style: none; margin: 0; padding: 0; display: grid; gap: 10px; font-size: 14px; }
	.timeline li { border-left: 3px solid #ffd8c7; padding-left: 10px; display: grid; }
	.timeline li[data-type='ACTIVITY'] { border-left-color: #c5d8f0; }
	a { color: #b4442a; }
	.legend { list-style: none; display: flex; flex-wrap: wrap; gap: 12px; padding: 0; margin: 6px 0 0; font-size: 12px; color: #5b524d; }
	.legend span { display: inline-block; width: 10px; height: 10px; border-radius: 50%; margin-right: 4px; }
	.actions { margin-bottom: 16px; display: grid; gap: 12px; }
	.buttons { display: flex; flex-wrap: wrap; gap: 8px; }
	.buttons.end { justify-content: flex-end; }
	button { font: inherit; font-size: 14px; font-weight: 600; border-radius: 8px; padding: 8px 14px; cursor: pointer; border: 1px solid transparent; }
	button.primary { color: #fff; background: linear-gradient(90deg, #ff7a45, #e81a12); }
	button.ghost { background: #fff; color: #b4442a; border-color: #f0c4b2; }
	button.danger { background: #fff; color: #c92a2a; border-color: #ffc9c9; }
	button:disabled { opacity: 0.45; cursor: not-allowed; }
	.stack { display: grid; gap: 6px; font-size: 14px; }
	textarea { font: inherit; font-size: 14px; padding: 8px; border: 1px solid #dccfc8; border-radius: 8px; background: #fffdfc; }
	.field-error { color: #c92a2a; }
	.tag { display: inline-block; font-size: 12px; font-weight: 700; padding: 2px 8px; border-radius: 6px; }
	.tag.standby { background: #d3f9d8; color: #2b8a3e; }
	.tag.waiting { background: #fff3bf; color: #8a5a00; }
	.tag.confirmed { background: #d3f9d8; color: #2b8a3e; }
	.tag.overdue { background: #ffe3e3; color: #c92a2a; margin-left: 6px; }
	.plain { list-style: none; padding: 0; display: grid; gap: 8px; }
	.plain li { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; }
	.blocked { align-self: center; color: #c92a2a; font-size: 14px; font-weight: 600; }
	.reasons { border: 0; padding: 0; margin: 0; display: grid; gap: 6px; }
	.reasons legend { font-weight: 600; margin-bottom: 4px; }
	.radio { display: flex; gap: 8px; align-items: center; }
	.contact { margin: 0; font-size: 14px; }
	.result { border-radius: 8px; padding: 8px 12px; font-size: 14px; }
	.result.ok { background: #ebfbee; color: #2b8a3e; }
	.result.err { background: #fdecea; color: #a1180f; }
	.backdrop { position: fixed; inset: 0; background: rgba(33, 24, 20, 0.45); display: grid; place-items: center; z-index: 2000; padding: 16px; }
	.dialog { background: #fff; border-radius: 12px; padding: 20px; max-width: 440px; width: 100%; box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2); }
	.dialog p { font-size: 14px; color: #5b524d; }
</style>
