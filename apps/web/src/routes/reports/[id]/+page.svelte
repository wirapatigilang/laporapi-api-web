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
	// Masukan dosen 25 Nov 2026: Admin Polres boleh menolak selama Laporan belum berstatus akhir.
	const isFinal = $derived(r.status === 'REJECTED' || r.status === 'RESOLVED');
	const canReject = $derived(isAdmin && !isFinal);
	// Masukan dosen 25 Nov 2026: Penanganan Selesai dinyatakan Admin Polres.
	const canResolve = $derived(isAdmin && r.status === 'IN_PROGRESS');
	const isOperator = $derived(role === 'SECTOR_OPERATOR');
	const standbyBlocked = $derived(r.status === 'REJECTED' ? 'Laporan sudah ditolak' : r.status === 'RESOLVED' ? 'Penanganan sudah selesai' : null);
	const isOfficer = $derived(role === 'AGENCY_OFFICER');
	const handlingOpen = $derived(r.status === 'ASSIGNED' || r.status === 'IN_PROGRESS');
	const departBlocked = $derived(r.status === 'REJECTED' || r.status === 'RESOLVED');
	const confirmedCount = $derived((r.dispatches ?? []).filter((d: { state: string }) => d.state === 'CONFIRMED').length);
	const canDispatch = $derived(isAdmin && ['VERIFIED', 'ASSIGNED', 'IN_PROGRESS'].includes(r.status));

	let confirming = $state<null | 'verify' | 'reject' | 'dispatch' | 'resolve' | 'start'>(null);
	const dupNote = $derived(r.duplicates.length ? ` dan ${r.duplicates.length} laporan ganda` : '');

	// Dialog Teruskan ke Instansi: pilih semua dan hitungan pilihan.
	const sentIds = $derived(new Set<string>((r.dispatches ?? []).map((d: any) => d.agency.id)));
	const available = $derived(data.agencies.filter((a: any) => !sentIds.has(a.id)));
	let selected = $state<string[]>([]);
	const allSelected = $derived(available.length > 0 && available.every((a: any) => selected.includes(a.id)));
	const toggleAll = () => (selected = allSelected ? [] : available.map((a: any) => a.id));
	const openDispatch = () => {
		selected = [];
		confirming = 'dispatch';
	};
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
	const AGENCY_TYPE_LABELS: Record<string, string> = {
		BPBD: 'Penanggulangan bencana',
		ENVIRONMENT_AGENCY: 'Lingkungan hidup',
		MANGGALA_AGNI: 'Pengendalian karhutla',
		FIRE_DEPARTMENT: 'Pemadam kebakaran',
		MILITARY: 'TNI'
	};
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
			<div class="action-bar">
				<div class="group" role="group" aria-labelledby="grp-flow">
					<span class="group-label" id="grp-flow">Alur penanganan</span>
					<div class="buttons">
						<button type="button" class="primary" data-testid="verify-button" disabled={!canDecide || busy} title={canDecide ? undefined : 'Hanya untuk laporan berstatus Laporan Diterima'} onclick={() => (confirming = 'verify')}>Verifikasi</button>
						<button type="button" class="primary" data-testid="dispatch-button" disabled={!canDispatch || busy} title={canDispatch ? undefined : 'Laporan harus diverifikasi lebih dahulu'} onclick={openDispatch}>Teruskan ke Instansi</button>
						<button type="button" class="primary" data-testid="resolve-button" disabled={!canResolve || busy} title={canResolve ? undefined : 'Hanya saat Penanganan Berlangsung'} onclick={() => (confirming = 'resolve')}>Nyatakan Selesai</button>
					</div>
				</div>
				<div class="group" role="group" aria-labelledby="grp-contact">
					<span class="group-label" id="grp-contact">Komunikasi</span>
					<div class="buttons">
						<button type="button" class="ghost" data-testid="contact-button" aria-pressed={showPhone} onclick={() => (showPhone = !showPhone)}>Hubungi Warga</button>
						<button type="button" class="ghost" data-testid="field-check-button" disabled={!canDecide} aria-pressed={showFieldCheck} title={canDecide ? undefined : 'Hanya untuk laporan berstatus Laporan Diterima'} onclick={() => (showFieldCheck = !showFieldCheck)}>Minta Cek Lapangan</button>
					</div>
				</div>
				<div class="group danger-zone" role="group" aria-labelledby="grp-danger">
					<span class="group-label" id="grp-danger">Pembatalan</span>
					<div class="buttons">
						<!-- Label UI "Batalkan"; status API tetap REJECTED (Laporan Ditolak). -->
						<button type="button" class="danger" data-testid="reject-button" disabled={!canReject || busy} title={canReject ? 'Status menjadi Laporan Ditolak' : 'Laporan sudah berstatus akhir'} onclick={() => (confirming = 'reject')}>Batalkan Laporan</button>
					</div>
				</div>
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
					<button type="submit" class="ghost" formaction="?/handling" name="kind" value="DEPARTED" data-testid="sector-depart-button" disabled={departBlocked || busy}>Catat Keberangkatan Personel</button>
					{#if standbyBlocked}<span class="blocked" data-testid="standby-blocked">{standbyBlocked}</span>{/if}
				</div>
			</form>
		</section>
	{/if}

	{#if isOfficer}
		<section class="card actions" data-testid="officer-actions" aria-label="Tindakan Petugas Instansi">
			<form method="POST" action="?/handling" use:enhance={submitting} class="stack">
				<label for="handling-note">Catatan <small class="muted">(opsional)</small></label>
				<textarea id="handling-note" name="note" rows="2" maxlength="500" disabled={!handlingOpen}></textarea>
				<div class="buttons">
					<button type="submit" name="kind" value="CONFIRMED" class="primary" data-testid="confirm-dispatch-button"
						disabled={!handlingOpen || !r.myDispatch || r.myDispatch.confirmed || busy}>{r.myDispatch?.confirmed ? 'Tugas sudah dikonfirmasi' : 'Konfirmasi Terima Tugas'}</button>
					<button type="submit" name="kind" value="DEPARTED" class="ghost" data-testid="depart-button" disabled={!handlingOpen || busy}>Catat Keberangkatan</button>
					<button type="button" class="primary" data-testid="start-button" disabled={r.status !== 'ASSIGNED' || !r.myDispatch || busy} onclick={() => (confirming = 'start')}>Mulai Penanganan</button>
				</div>
			</form>
		</section>
	{/if}

	{#snippet transition(next: 'VERIFIED' | 'REJECTED' | 'ASSIGNED' | 'IN_PROGRESS' | 'RESOLVED')}
		<div class="transition" data-testid="status-transition" aria-label="Perubahan status">
			<div><small>Status sekarang</small><StatusBadge status={r.status} /></div>
			<span class="arrow" aria-hidden="true">→</span>
			<div><small>Status baru</small><StatusBadge status={next} /></div>
		</div>
	{/snippet}

	{#if confirming === 'reject'}
		{@const fields = form?.action === 'reject' ? (form?.fields ?? {}) : {}}
		{@const values = form?.action === 'reject' ? ((form as any)?.values ?? {}) : {}}
		<div class="backdrop" role="presentation">
			<div class="dialog" role="dialog" aria-modal="true" aria-labelledby="reject-title" data-testid="reject-dialog">
				<p class="eyebrow danger-text">Ubah status</p>
				<h2 id="reject-title">Batalkan laporan {r.reportNumber}?</h2>
				{@render transition('REJECTED')}
				<form method="POST" action="?/reject" use:enhance={submitting} class="stack">
					<fieldset class="reasons">
						<legend>Alasan pembatalan</legend>
						{#each data.rejectionReasons as reason}
							<label class="radio"><input type="radio" name="reasonId" value={reason.id} checked={values.reasonId === reason.id} data-testid="reason-option" />{reason.label}</label>
						{/each}
					</fieldset>
					{#if fields.reasonId}<small class="field-error" data-testid="reason-error">{fields.reasonId}</small>{/if}
					<label for="reject-note">Catatan tambahan <small class="muted">(wajib untuk alasan Lainnya)</small></label>
					<textarea id="reject-note" name="note" rows="3" maxlength="500">{values.note ?? ''}</textarea>
					{#if fields.note}<small class="field-error" data-testid="reject-note-error">{fields.note}</small>{/if}
					<ul class="effects">
						<li>Laporan{dupNote} berstatus <strong>Laporan Ditolak</strong> dan tiket kejadian ditutup. Status ini tidak dapat diubah lagi.</li>
						<li>Warga menerima notifikasi beserta alasan penolakan.</li>
						{#if r.status !== 'RECEIVED'}<li>Operator Polsek{r.dispatches?.length ? ' dan instansi penerima' : ''} diberi tahu agar penanganan dihentikan.</li>{/if}
					</ul>
					<div class="buttons end">
						<button type="button" class="ghost" data-testid="reject-cancel" onclick={() => (confirming = null)}>Batal</button>
						<button type="submit" class="danger-solid" data-testid="reject-submit" disabled={busy}>Ya, batalkan laporan</button>
					</div>
				</form>
			</div>
		</div>
	{/if}

	{#if confirming === 'dispatch'}
		{@const fields = form?.action === 'dispatch' ? (form?.fields ?? {}) : {}}
		<div class="backdrop" role="presentation">
			<div class="dialog wide" role="dialog" aria-modal="true" aria-labelledby="dispatch-title" data-testid="dispatch-dialog">
				<p class="eyebrow">{r.status === 'VERIFIED' ? 'Ubah status' : 'Tambah instansi'}</p>
				<h2 id="dispatch-title">Teruskan laporan {r.reportNumber} ke instansi</h2>
				{#if r.status === 'VERIFIED'}{@render transition('ASSIGNED')}{/if}
				<form method="POST" action="?/dispatch" use:enhance={submitting} class="stack">
					<div class="pick-head">
						<span id="agency-legend" class="legend-title">Instansi penerima</span>
						<span class="muted small-inline" data-testid="agency-selected-count">{selected.length} dari {available.length} dipilih</span>
						<button type="button" class="link" data-testid="select-all-agencies" disabled={available.length === 0} onclick={toggleAll}>
							{allSelected ? 'Batalkan semua' : 'Pilih semua'}
						</button>
					</div>
					<div class="agency-grid" role="group" aria-labelledby="agency-legend">
						{#each data.agencies as a (a.id)}
							{@const already = sentIds.has(a.id)}
							<label class="agency" class:checked={selected.includes(a.id)} class:sent={already}>
								<input type="checkbox" name="agencyIds" value={a.id} bind:group={selected} disabled={already} data-testid="agency-option" />
								<span class="agency-text">
									<span class="agency-name">{a.name}</span>
									{#if already}<small class="muted" data-testid="already-dispatched">sudah diteruskan</small>{:else if a.type}<small class="muted">{AGENCY_TYPE_LABELS[a.type] ?? a.type}</small>{/if}
								</span>
							</label>
						{/each}
					</div>
					{#if fields.agencyIds}<small class="field-error" data-testid="agency-error">{fields.agencyIds}</small>{/if}
					<label for="dispatch-note">Catatan untuk instansi <small class="muted">(opsional)</small></label>
					<textarea id="dispatch-note" name="note" rows="2" maxlength="500" placeholder="Contoh: akses lewat jalan desa, lahan gambut"></textarea>
					<ul class="effects">
						{#if r.status === 'VERIFIED'}
							<li>Laporan{dupNote} berstatus <strong>Petugas Ditugaskan</strong>.</li>
							<li>Warga menerima notifikasi bahwa petugas sudah ditugaskan.</li>
						{:else}
							<li>Status tetap {r.statusLabel}; penambahan instansi dicatat sebagai kegiatan.</li>
						{/if}
						<li>Petugas di setiap instansi terpilih menerima notifikasi dan diminta mengonfirmasi.</li>
					</ul>
					<div class="buttons end">
						<button type="button" class="ghost" data-testid="dispatch-cancel" onclick={() => (confirming = null)}>Batal</button>
						<button type="submit" class="primary" data-testid="dispatch-submit" disabled={busy}>
							{selected.length ? `Teruskan ke ${selected.length} instansi` : 'Teruskan'}
						</button>
					</div>
				</form>
			</div>
		</div>
	{/if}

	{#if confirming === 'resolve'}
		<div class="backdrop" role="presentation">
			<div class="dialog" role="dialog" aria-modal="true" aria-labelledby="resolve-title" data-testid="resolve-dialog">
				<p class="eyebrow">Ubah status</p>
				<h2 id="resolve-title">Nyatakan penanganan laporan {r.reportNumber} selesai?</h2>
				{@render transition('RESOLVED')}
				<ul class="effects">
					<li>Pastikan api sudah padam berdasarkan laporan petugas di lapangan.</li>
					<li>Laporan{dupNote} berstatus <strong>Penanganan Selesai</strong> dan tiket kejadian ditutup. Status ini tidak dapat diubah lagi.</li>
					<li>Warga, Operator Polsek, dan instansi penerima menerima notifikasi.</li>
				</ul>
				<form method="POST" action="?/resolve" use:enhance={submitting} class="buttons end">
					<button type="button" class="ghost" data-testid="resolve-cancel" onclick={() => (confirming = null)}>Batal</button>
					<button type="submit" class="primary" data-testid="resolve-yes" disabled={busy}>Ya, nyatakan selesai</button>
				</form>
			</div>
		</div>
	{/if}

	{#if confirming === 'start'}
		<div class="backdrop" role="presentation">
			<div class="dialog" role="dialog" aria-modal="true" aria-labelledby="start-title" data-testid="start-dialog">
				<p class="eyebrow">Ubah status</p>
				<h2 id="start-title">Mulai penanganan laporan {r.reportNumber}?</h2>
				{@render transition('IN_PROGRESS')}
				<form method="POST" action="?/handling" use:enhance={submitting} class="stack">
					<input type="hidden" name="kind" value="IN_PROGRESS" />
					<label for="start-note">Catatan <small class="muted">(opsional)</small></label>
					<textarea id="start-note" name="note" rows="2" maxlength="500" placeholder="Contoh: tim tiba, pemadaman dimulai"></textarea>
					<ul class="effects">
						<li>Laporan{dupNote} berstatus <strong>Penanganan Berlangsung</strong>.</li>
						{#if r.myDispatch && !r.myDispatch.confirmed}<li>Penugasan instansi Anda sekaligus dicatat sebagai sudah dikonfirmasi.</li>{/if}
						<li>Warga dan Admin Polres menerima notifikasi.</li>
					</ul>
					<div class="buttons end">
						<button type="button" class="ghost" data-testid="start-cancel" onclick={() => (confirming = null)}>Batal</button>
						<button type="submit" class="primary" data-testid="start-yes" disabled={busy}>Ya, mulai penanganan</button>
					</div>
				</form>
			</div>
		</div>
	{/if}

	{#if confirming === 'verify'}
		<div class="backdrop" role="presentation">
			<div class="dialog" role="dialog" aria-modal="true" aria-labelledby="verify-title" data-testid="confirm-dialog">
				<p class="eyebrow">Ubah status</p>
				<h2 id="verify-title">Verifikasi laporan {r.reportNumber}?</h2>
				{@render transition('VERIFIED')}
				<ul class="effects">
					<li>Laporan dinyatakan valid berdasarkan foto, lokasi, dan petunjuk titik panas.</li>
					<li>Laporan{dupNote} berstatus <strong>Laporan Diverifikasi</strong>, lalu dapat diteruskan ke instansi.</li>
					<li>Warga dan Operator Polsek menerima notifikasi.</li>
				</ul>
				<form method="POST" action="?/verify" use:enhance={submitting} class="buttons end">
					<button type="button" class="ghost" data-testid="confirm-cancel" onclick={() => (confirming = null)}>Batal</button>
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
					<div class="dispatch-head">
						<h2>Instansi penerima {#if r.isOverdue}<span class="tag overdue" data-testid="detail-overdue">belum direspons</span>{/if}</h2>
						<span class="dispatch-count" data-testid="dispatch-summary">{confirmedCount} dari {r.dispatches.length} dikonfirmasi</span>
					</div>
					<div class="dispatch-progress" role="progressbar" aria-label="Instansi yang sudah mengonfirmasi" aria-valuemin="0" aria-valuemax={r.dispatches.length} aria-valuenow={confirmedCount}>
						<span style={`width: ${(confirmedCount / r.dispatches.length) * 100}%`}></span>
					</div>
					<ul class="dispatch-list">
						{#each r.dispatches as d}
							<li data-testid="dispatch-item" data-state={d.state} class:is-confirmed={d.state === 'CONFIRMED'}>
								<span class="dispatch-dot" aria-hidden="true"></span>
								<div class="dispatch-body">
									<div class="dispatch-top">
										<strong class="dispatch-name">{d.agency.name}</strong>
										<span class="tag" class:waiting={d.state === 'WAITING'} class:confirmed={d.state === 'CONFIRMED'} data-testid="dispatch-state">{d.stateLabel}</span>
									</div>
									<dl class="dispatch-meta">
										<dt>Diteruskan</dt><dd>{formatDateTime(d.dispatchedAt)}</dd>
										{#if d.confirmedAt}
											<dt>Dikonfirmasi</dt><dd>{formatDateTime(d.confirmedAt)}{#if d.confirmedBy}<span class="muted">{` oleh ${d.confirmedBy}`}</span>{/if}</dd>
										{/if}
									</dl>
								</div>
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
	button.danger { background: #c92a2a; color: #fff; box-shadow: 0 6px 14px -8px rgba(201, 42, 42, 0.7); }
	button.danger:not(:disabled):hover { background: #a61e1e; }
	button.primary:not(:disabled):hover { filter: brightness(0.95); }
	button.ghost:not(:disabled):hover, button.ghost[aria-pressed='true'] { background: #fff6f1; border-color: #e5341a; }
	button:disabled, button.primary:disabled, button.danger:disabled { background: #f4f1ef; color: #a39892; border-color: #e6e0dc; box-shadow: none; filter: none; cursor: not-allowed; }
	button:focus-visible { outline: 2px solid #e5341a; outline-offset: 2px; }
	.action-bar { display: flex; flex-wrap: wrap; align-items: flex-end; gap: 12px 24px; }
	.group { display: grid; gap: 6px; }
	.group + .group { padding-left: 24px; border-left: 1px solid #f0dcd2; }
	.group-label { font-size: 11px; font-weight: 700; letter-spacing: 0.8px; text-transform: uppercase; color: #8a807a; }
	.danger-zone { margin-left: auto; }
	.danger-zone .group-label { color: #c92a2a; }
	@media (max-width: 720px) {
		.group + .group { padding-left: 0; border-left: 0; padding-top: 12px; border-top: 1px solid #f0dcd2; }
		.action-bar { flex-direction: column; align-items: stretch; }
		.danger-zone { margin-left: 0; }
	}
	.stack { display: grid; gap: 6px; font-size: 14px; }
	textarea { font: inherit; font-size: 14px; padding: 8px; border: 1px solid #dccfc8; border-radius: 8px; background: #fffdfc; }
	.field-error { color: #c92a2a; }
	.tag { display: inline-block; font-size: 12px; font-weight: 700; padding: 2px 8px; border-radius: 6px; }
	.tag.standby { background: #d3f9d8; color: #2b8a3e; }
	.tag.waiting { background: #fff3bf; color: #8a5a00; }
	.tag.confirmed { background: #d3f9d8; color: #2b8a3e; }
	.tag.overdue { background: #ffe3e3; color: #c92a2a; margin-left: 6px; }
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
	.dialog { display: grid; gap: 14px; max-height: calc(100vh - 32px); overflow-y: auto; box-sizing: border-box; }
	.dialog.wide { max-width: 600px; }
	.dialog h2 { font-size: 19px; margin: 0; }
	.eyebrow { margin: 0 0 -8px; font-size: 11px; font-weight: 700; letter-spacing: 0.8px; text-transform: uppercase; color: #c2240f; }
	.danger-text { color: #c92a2a; }
	.transition { display: flex; align-items: center; gap: 12px; padding: 12px 14px; border-radius: 10px; background: #fff6f1; border: 1px solid #f6dccf; }
	.transition div { display: grid; gap: 4px; }
	.transition small { font-size: 11px; color: #8a807a; }
	.arrow { font-size: 18px; color: #c2240f; font-weight: 700; }
	.effects { margin: 0; padding: 12px 14px 12px 30px; border-radius: 10px; background: #fbf8f6; font-size: 13px; color: #5a4a41; display: grid; gap: 4px; }
	button.danger-solid { color: #fff; background: #c92a2a; }
	button.link { background: none; border: 0; padding: 0; color: #c2240f; font-weight: 700; text-decoration: underline; }
	.pick-head { display: flex; align-items: center; gap: 10px; }
	.legend-title { font-weight: 600; }
	.small-inline { font-size: 12px; margin-left: auto; }
	.agency-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 8px; }
	.agency { display: flex; gap: 10px; align-items: flex-start; padding: 10px 12px; border: 1.5px solid #e9e0da; border-radius: 10px; cursor: pointer; background: #fff; }
	.agency:hover { border-color: #ffb08f; }
	.agency.checked { border-color: #e5341a; background: #fff6f1; }
	.agency.sent { cursor: not-allowed; background: #f6f3f1; opacity: 0.75; }
	.agency input { margin-top: 3px; accent-color: #e5341a; }
	.agency-text { display: grid; gap: 2px; }
	.agency-name { font-weight: 600; }
	.dispatch-head { display: flex; align-items: baseline; justify-content: space-between; gap: 8px; flex-wrap: wrap; }
	.dispatch-head h2 { margin: 0; }
	.dispatch-count { font-size: 13px; font-weight: 600; color: #5b524d; }
	.dispatch-progress { height: 6px; border-radius: 3px; background: #fff3bf; margin: 10px 0 4px; overflow: hidden; }
	.dispatch-progress span { display: block; height: 100%; background: #2b8a3e; border-radius: 3px; }
	.dispatch-list { list-style: none; margin: 0; padding: 0; }
	.dispatch-list li { display: flex; gap: 12px; padding: 12px 0; border-top: 1px solid #f3e7e1; }
	.dispatch-list li:first-child { border-top: 0; }
	.dispatch-dot { flex: none; width: 10px; height: 10px; margin-top: 6px; border-radius: 50%; background: #f0b429; box-shadow: 0 0 0 3px #fff3bf; }
	.dispatch-list li.is-confirmed .dispatch-dot { background: #2b8a3e; box-shadow: 0 0 0 3px #d3f9d8; }
	.dispatch-body { flex: 1; min-width: 0; display: grid; gap: 4px; }
	.dispatch-top { display: flex; align-items: flex-start; justify-content: space-between; gap: 8px; }
	.dispatch-name { font-size: 14px; flex: 1; min-width: 0; }
	.dispatch-top .tag { flex: none; white-space: nowrap; }
	.dispatch-meta { display: grid; grid-template-columns: max-content 1fr; gap: 2px 10px; margin: 0; font-size: 12px; color: #5b524d; }
	.dispatch-meta dt { color: #8a807a; }
	.dispatch-meta dd { margin: 0; }
</style>
