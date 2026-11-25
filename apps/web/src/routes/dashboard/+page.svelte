<script lang="ts">
	import { onMount } from 'svelte';
	import { invalidateAll } from '$app/navigation';
	import AppHeader from '#lib/components/AppHeader.svelte';
	import LeafletMap, { type MapPoint } from '#lib/components/LeafletMap.svelte';
	import StatusBadge from '#lib/components/StatusBadge.svelte';
	import { STATUS_COLORS, STATUS_LABELS, STATUS_ORDER, formatDateTime } from '#lib/status.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const unit = $derived(data.user.agency?.name ?? data.user.policeSector?.name ?? 'Polres Sekadau');
	let newIds = $state<string[]>([]);
	let live = $state(false);

	const points: MapPoint[] = $derived(
		data.incidents.map((i) => ({
			id: i.incidentId,
			latitude: i.latitude,
			longitude: i.longitude,
			status: i.status,
			label: `${i.reportNumber} · ${STATUS_LABELS[i.status as keyof typeof STATUS_LABELS]}`,
			href: `/reports/${i.reportId}`,
			isNew: newIds.includes(i.incidentId)
		}))
	);

	onMount(() => {
		// UC-06 2a: Laporan baru masuk tanpa memuat ulang halaman.
		const source = new EventSource('/dashboard/stream');
		source.onopen = () => (live = true);
		source.onerror = () => (live = false);
		source.addEventListener('report-created', (e) => {
			const { incidentId } = JSON.parse((e as MessageEvent).data);
			if (!newIds.includes(incidentId)) newIds = [incidentId, ...newIds];
			invalidateAll();
		});
		source.addEventListener('incident-updated', () => invalidateAll());
		return () => source.close();
	});
</script>

<svelte:head><title>Dasbor Laporan · Lapor Api</title></svelte:head>

<AppHeader user={data.user} active="dashboard" />

<main class="content">
	<div class="title">
		<h1>Dasbor Laporan</h1>
		<span class="live" data-testid="live-indicator" data-live={live}>{live ? 'Terhubung langsung' : 'Menghubungkan…'}</span>
	</div>
	{#if data.user.role === 'AGENCY_OFFICER'}
		<p class="scope" data-testid="scope-note">Menampilkan laporan yang diteruskan ke {unit}.</p>
	{:else if data.user.role === 'SECTOR_OPERATOR'}
		<p class="scope" data-testid="scope-note">Menampilkan laporan di wilayah {unit}.</p>
	{:else}
		<p class="scope" data-testid="scope-note">Menampilkan semua laporan di Kabupaten Sekadau.</p>
	{/if}

	<form class="filters" method="GET" data-testid="filters">
		<label>
			<span>Status</span>
			<select name="status" value={data.filter.status ?? ''}>
				<option value="">Semua status</option>
				{#each STATUS_ORDER as s}<option value={s}>{STATUS_LABELS[s]}</option>{/each}
			</select>
		</label>
		{#if data.user.role !== 'SECTOR_OPERATOR'}
			<label>
				<span>Kecamatan</span>
				<select name="districtId" value={data.filter.districtId ?? ''}>
					<option value="">Semua kecamatan</option>
					{#each data.districts as d}<option value={d.id}>{d.name}</option>{/each}
				</select>
			</label>
			<label>
				<span>Polsek</span>
				<select name="policeSectorId" value={data.filter.policeSectorId ?? ''}>
					<option value="">Semua Polsek</option>
					{#each data.policeSectors as p}<option value={p.id}>{p.name}</option>{/each}
				</select>
			</label>
		{/if}
		<label><span>Dari tanggal</span><input type="date" name="from" value={data.filter.from ?? ''} /></label>
		<label><span>Sampai tanggal</span><input type="date" name="to" value={data.filter.to ?? ''} /></label>
		<div class="actions">
			<button type="submit">Terapkan</button>
			<a href="/dashboard" class="reset">Atur ulang</a>
		</div>
	</form>
	{#if data.filterError}<p class="alert" role="alert">{data.filterError}</p>{/if}

	<div class="grid">
		<section class="list" aria-label="Daftar laporan">
			{#if data.incidents.length === 0}
				<p class="empty" data-testid="empty-state">Tidak ada laporan</p>
			{:else}
				<table data-testid="incident-list">
					<thead>
						<tr><th>Nomor</th><th>Waktu lapor</th><th>Kecamatan</th><th>Status</th><th>Ganda</th></tr>
					</thead>
					<tbody>
						{#each data.incidents as i (i.incidentId)}
							<tr data-testid="incident-row" data-report-number={i.reportNumber} class:is-new={newIds.includes(i.incidentId)}>
								<td>
									<a href={`/reports/${i.reportId}`}>{i.reportNumber}</a>
									{#if newIds.includes(i.incidentId)}<span class="tag new" data-testid="new-tag">baru</span>{/if}
									{#if i.sectorStandby}<span class="tag standby" data-testid="flag-standby">Polsek sudah siaga</span>{/if}
									{#if i.isOverdue}<span class="tag overdue" data-testid="flag-overdue">belum direspons</span>{/if}
								</td>
								<td>{formatDateTime(i.reportedAt)}</td>
								<td>{i.district.name}{#if !i.policeSector}<br /><small class="warn">Polsek belum ditentukan</small>{/if}</td>
								<td><StatusBadge status={i.status} /></td>
								<td data-testid="duplicate-count">{i.duplicateCount}</td>
							</tr>
						{/each}
					</tbody>
				</table>
			{/if}
		</section>
		<section class="mapbox" aria-label="Peta laporan">
			<LeafletMap {points} height="520px" testid="incident-map" />
			<ul class="legend" aria-label="Keterangan warna">
				{#each STATUS_ORDER as s}<li><span style={`background:${STATUS_COLORS[s]}`}></span>{STATUS_LABELS[s]}</li>{/each}
			</ul>
		</section>
	</div>
</main>

<style>
	.content { padding: 20px; max-width: 1280px; margin: 0 auto; }
	.title { display: flex; align-items: baseline; gap: 12px; }
	h1 { margin: 0 0 4px; font-size: 24px; }
	.live { font-size: 12px; color: #8a807a; }
	.live[data-live='true'] { color: #2f9e44; }
	.scope { margin: 0 0 16px; color: #5b524d; }
	.filters { display: flex; flex-wrap: wrap; gap: 12px; align-items: end; background: #fff; border: 1px solid #f0dcd2; border-radius: 12px; padding: 12px; margin-bottom: 16px; }
	.filters label { display: grid; gap: 4px; font-size: 12px; color: #5b524d; font-weight: 600; }
	select, input { font: inherit; font-size: 14px; padding: 7px 8px; border: 1px solid #dccfc8; border-radius: 8px; background: #fffdfc; }
	.actions { display: flex; gap: 8px; align-items: center; }
	button { font: inherit; font-weight: 600; color: #fff; border: 0; border-radius: 8px; padding: 8px 14px; cursor: pointer; background: linear-gradient(90deg, #ff7a45, #e81a12); }
	.reset { font-size: 14px; color: #b4442a; }
	.grid { display: grid; grid-template-columns: minmax(0, 1.1fr) minmax(0, 1fr); gap: 16px; align-items: start; }
	@media (max-width: 960px) { .grid { grid-template-columns: 1fr; } }
	.list { background: #fff; border: 1px solid #f0dcd2; border-radius: 12px; overflow: auto; max-height: 600px; }
	table { width: 100%; border-collapse: collapse; font-size: 14px; }
	th, td { text-align: left; padding: 9px 12px; border-bottom: 1px solid #f6e9e2; vertical-align: top; }
	th { position: sticky; top: 0; background: #fffaf7; font-size: 12px; color: #7a6f69; }
	td a { color: #b4442a; font-weight: 600; }
	tr.is-new { background: #fff6e5; }
	.tag { display: inline-block; margin-left: 6px; font-size: 11px; font-weight: 700; padding: 1px 6px; border-radius: 6px; background: #f1f3f5; color: #495057; }
	.tag.new { background: #ffe066; color: #5c4400; }
	.tag.standby { background: #d3f9d8; color: #2b8a3e; }
	.tag.overdue { background: #ffe3e3; color: #c92a2a; }
	.warn { color: #c92a2a; }
	.empty { padding: 32px; text-align: center; color: #8a807a; margin: 0; }
	.legend { list-style: none; display: flex; flex-wrap: wrap; gap: 10px; padding: 0; margin: 8px 0 0; font-size: 12px; color: #5b524d; }
	.legend span { display: inline-block; width: 10px; height: 10px; border-radius: 50%; margin-right: 4px; }
	.alert { background: #fdecea; color: #a1180f; border-radius: 8px; padding: 8px 12px; }
</style>
