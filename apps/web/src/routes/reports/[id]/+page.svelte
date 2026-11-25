<script lang="ts">
	import AppHeader from '#lib/components/AppHeader.svelte';
	import LeafletMap, { type MapPoint } from '#lib/components/LeafletMap.svelte';
	import StatusBadge from '#lib/components/StatusBadge.svelte';
	import { formatCoord, formatDateTime, formatMeters } from '#lib/status.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const r = $derived(data.report);
	const h = $derived(data.hotspots);

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
		{#if r.isDuplicate}<span class="note" data-testid="duplicate-of">Tergabung dengan laporan <a href={`/reports/${r.primaryReport.id}`}>{r.primaryReport.reportNumber}</a></span>{/if}
	</div>

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
</style>
