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

	const today = new Intl.DateTimeFormat('id-ID', { timeZone: 'Asia/Jakarta', weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
		.format(new Date())
		.replace(',', '');

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

	// Kartu ringkasan (Figma W4 / DS 2.0 Kartu/Statistik), dihitung dari Kejadian yang tampil sesuai saringan.
	const count = (...statuses: string[]) => data.incidents.filter((i) => statuses.includes(i.status)).length;
	const overdue = $derived(data.incidents.filter((i) => i.isOverdue).length);
	const standby = $derived(data.incidents.filter((i) => i.sectorStandby).length);
	const stats = $derived([
		{ key: 'received', label: 'Menunggu verifikasi', value: count('RECEIVED'), note: 'Status Laporan Diterima' },
		{
			key: 'verified',
			label: 'Diverifikasi',
			value: count('VERIFIED'),
			note: standby > 0 ? `${standby} kejadian Polsek sudah siaga` : 'Menunggu diteruskan ke instansi'
		},
		{
			key: 'handling',
			label: 'Sedang ditangani',
			value: count('ASSIGNED', 'IN_PROGRESS'),
			note: overdue > 0 ? `${overdue} belum direspons ≥ 60 menit` : 'Petugas ditugaskan dan berlangsung'
		},
		{ key: 'resolved', label: 'Penanganan selesai', value: count('RESOLVED'), note: 'Kejadian sudah ditutup' }
	]);

	// Laporan per kecamatan (DS 2.0): jumlah Kejadian per kecamatan, terbanyak di atas.
	const perDistrict = $derived.by(() => {
		const totals = new Map<string, number>(data.districts.map((d: { name: string }) => [d.name, 0]));
		for (const i of data.incidents) totals.set(i.district.name, (totals.get(i.district.name) ?? 0) + 1);
		const rows = [...totals.entries()].map(([name, total]) => ({ name, total }));
		rows.sort((a, b) => b.total - a.total || a.name.localeCompare(b.name, 'id'));
		const max = Math.max(1, ...rows.map((r) => r.total));
		return rows.map((r) => ({ ...r, pct: (r.total / max) * 100 }));
	});
	const districtCount = $derived(new Set(data.incidents.map((i) => i.district.name)).size);
	const filtered = $derived(Object.keys(data.filter).length > 0);

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

<AppHeader user={data.user} active="dashboard" unread={data.unread} />

<main class="content">
	<header class="top">
		<div>
			<p class="eyebrow">{today} · Kabupaten Sekadau</p>
			<h1>Dasbor Laporan</h1>
			{#if data.user.role === 'AGENCY_OFFICER'}
				<p class="scope" data-testid="scope-note">Menampilkan laporan yang diteruskan ke {unit}.</p>
			{:else if data.user.role === 'SECTOR_OPERATOR'}
				<p class="scope" data-testid="scope-note">Menampilkan laporan di wilayah {unit}.</p>
			{:else}
				<p class="scope" data-testid="scope-note">Menampilkan semua laporan di Kabupaten Sekadau.</p>
			{/if}
		</div>
		<div class="top-actions">
			<span class="live" data-testid="live-indicator" data-live={live}>{live ? 'Terhubung langsung' : 'Menghubungkan…'}</span>
			<a class="bell" href="/notifications" aria-label={data.unread > 0 ? `Notifikasi, ${data.unread} belum dibaca` : 'Notifikasi'}>
				<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 16V11a6 6 0 1 1 12 0v5l1.5 2h-15L6 16Zm4 4a2 2 0 0 0 4 0" /></svg>
				{#if data.unread > 0}<span class="dot"></span>{/if}
			</a>
		</div>
	</header>

	<form class="filters" method="GET" data-testid="filters">
		<label class="pill">
			<span>Status</span>
			<select name="status" value={data.filter.status ?? ''}>
				<option value="">Semua</option>
				{#each STATUS_ORDER as s}<option value={s}>{STATUS_LABELS[s]}</option>{/each}
			</select>
		</label>
		{#if data.user.role !== 'SECTOR_OPERATOR'}
			<label class="pill">
				<span>Kecamatan</span>
				<select name="districtId" value={data.filter.districtId ?? ''}>
					<option value="">Semua</option>
					{#each data.districts as d}<option value={d.id}>{d.name}</option>{/each}
				</select>
			</label>
			<label class="pill">
				<span>Polsek</span>
				<select name="policeSectorId" value={data.filter.policeSectorId ?? ''}>
					<option value="">Semua</option>
					{#each data.policeSectors as p}<option value={p.id}>{p.name}</option>{/each}
				</select>
			</label>
		{/if}
		<label class="pill"><span>Dari</span><input type="date" name="from" value={data.filter.from ?? ''} /></label>
		<label class="pill"><span>Sampai</span><input type="date" name="to" value={data.filter.to ?? ''} /></label>
		<button type="submit">Terapkan</button>
		<a href="/dashboard" class="reset">Atur ulang</a>
	</form>
	{#if data.filterError}<p class="alert" role="alert">{data.filterError}</p>{/if}

	<section class="stats" aria-label="Ringkasan laporan" data-testid="stat-cards">
		{#each stats as s, idx (s.key)}
			<article class="stat" class:hero={idx === 0} data-testid={`stat-${s.key}`}>
				<p class="stat-label">{s.label}</p>
				<p class="stat-value"><span data-testid="stat-value">{s.value}</span>{#if idx === 0}<small>kejadian</small>{/if}</p>
				<p class="stat-note">{s.note}</p>
			</article>
		{/each}
	</section>

	<div class="panels">
		<section class="card map-card" aria-label="Peta laporan">
			<div class="card-head">
				<div>
					<h2>Peta kejadian</h2>
					<p class="sub">{data.incidents.length} kejadian · {districtCount} kecamatan{filtered ? ' · sesuai saringan' : ''}</p>
				</div>
			</div>
			<div class="map-wrap"><LeafletMap {points} height="440px" testid="incident-map" /></div>
			<ul class="legend" aria-label="Keterangan warna">
				{#each STATUS_ORDER as s}<li><span style={`background:${STATUS_COLORS[s]}`}></span>{STATUS_LABELS[s]}</li>{/each}
			</ul>
		</section>

		<section class="card district-card" aria-label="Laporan per kecamatan" data-testid="district-summary">
			<div class="card-head">
				<h2>Laporan per kecamatan</h2>
				<span class="mono">{filtered ? 'SARINGAN' : 'SEMUA'}</span>
			</div>
			{#if perDistrict.length === 0}
				<p class="sub">Belum ada data kecamatan.</p>
			{:else}
				<ul class="bars">
					{#each perDistrict as d, idx (d.name)}
						<li data-testid="district-row" data-district={d.name}>
							<div class="bar-label"><span>{d.name}</span><span class="mono" data-testid="district-total">{d.total}</span></div>
							<div class="track"><div class="fill" class:lead={idx === 0 && d.total > 0} style={`width:${d.pct}%`}></div></div>
						</li>
					{/each}
				</ul>
			{/if}
		</section>
	</div>

	<section class="card list-card" aria-label="Daftar laporan">
		<div class="card-head">
			<div>
				<h2>Laporan masuk terbaru</h2>
				<p class="sub">Satu baris per kejadian · laporan ganda digabung ke laporan utama</p>
			</div>
			<span class="mono">{data.incidents.length} KEJADIAN</span>
		</div>
		{#if data.incidents.length === 0}
			<p class="empty" data-testid="empty-state">Tidak ada laporan</p>
		{:else}
			<div class="table-wrap">
				<table data-testid="incident-list">
					<thead>
						<tr><th>Nomor</th><th>Lokasi</th><th>Waktu lapor</th><th>Ganda</th><th>Status</th></tr>
					</thead>
					<tbody>
						{#each data.incidents as i (i.incidentId)}
							<tr data-testid="incident-row" data-report-number={i.reportNumber} class:is-new={newIds.includes(i.incidentId)}>
								<td class="num"><a href={`/reports/${i.reportId}`}>{i.reportNumber}</a></td>
								<td>
									<strong>{i.district.name}</strong>
									<span class="place">{i.policeSector ? i.policeSector.name : ''}{#if !i.policeSector}<span class="warn">Polsek belum ditentukan</span>{/if}</span>
									<span class="tags">
										{#if newIds.includes(i.incidentId)}<span class="tag new" data-testid="new-tag">baru</span>{/if}
										{#if i.sectorStandby}<span class="tag standby" data-testid="flag-standby">Polsek sudah siaga</span>{/if}
										{#if i.isOverdue}<span class="tag overdue" data-testid="flag-overdue">belum direspons</span>{/if}
									</span>
								</td>
								<td class="time">{formatDateTime(i.reportedAt)}</td>
								<td data-testid="duplicate-count" class="mono-cell">{i.duplicateCount}</td>
								<td><StatusBadge status={i.status} /></td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}
	</section>
</main>

<style>
	.content { padding: 28px 32px 40px; max-width: 1280px; margin: 0 auto; display: grid; gap: 20px; }
	.top { display: flex; align-items: flex-start; gap: 16px; }
	.eyebrow { margin: 0 0 6px; font-size: 12px; font-weight: 700; letter-spacing: 0.9px; text-transform: uppercase; color: var(--brand-teks); }
	h1 { margin: 0; font-family: var(--font-judul); font-weight: 800; font-size: 34px; letter-spacing: -0.7px; line-height: 1.1; }
	.scope { margin: 6px 0 0; color: var(--teks-sekunder); font-size: 14px; }
	.top-actions { margin-left: auto; display: flex; align-items: center; gap: 12px; }
	.live {
		display: inline-flex; align-items: center; gap: 8px; padding: 8px 14px; border-radius: 999px; font-size: 13px; font-weight: 500;
		background: var(--latar-permukaan); border: 1px solid var(--garis-default); color: var(--teks-sekunder);
	}
	.live::before { content: ''; width: 8px; height: 8px; border-radius: 50%; background: var(--teks-redup); }
	.live[data-live='true'] { background: #e3f3e8; border-color: #e3f3e8; color: #1b6b3f; }
	.live[data-live='true']::before { background: #2e9b5f; }
	.bell {
		position: relative; display: grid; place-items: center; width: 46px; height: 46px; box-sizing: border-box; border-radius: 12px;
		border: 1.5px solid var(--garis-kuat); background: var(--latar-permukaan); color: var(--teks-utama);
	}
	.bell svg { width: 20px; height: 20px; fill: none; stroke: currentColor; stroke-width: 1.8; stroke-linejoin: round; }
	.dot { position: absolute; top: 10px; right: 11px; width: 8px; height: 8px; border-radius: 50%; background: var(--brand-primer); border: 2px solid #fff; }

	.filters { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; }
	.pill {
		display: inline-flex; align-items: center; gap: 8px; padding: 6px 6px 6px 14px; border-radius: 12px;
		background: var(--latar-permukaan); border: 1px solid var(--garis-default); font-size: 12px; color: var(--teks-sekunder);
	}
	.pill select, .pill input {
		font: inherit; font-size: 14px; font-weight: 600; color: var(--teks-utama); border: 0; background: transparent; padding: 4px 6px; max-width: 170px;
	}
	.pill:focus-within { border-color: var(--brand-aksen); }
	.pill input[type="date"] { width: 132px; }
	button {
		font: inherit; font-size: 14px; font-weight: 600; color: #fff; border: 0; border-radius: 12px; padding: 10px 18px; cursor: pointer;
		background: var(--brand-gradasi); box-shadow: 0 8px 18px -10px rgba(229, 52, 26, 0.6);
	}
	.reset { font-size: 14px; font-weight: 600; color: var(--brand-teks); text-decoration: none; }
	.alert { margin: 0; background: #fdecea; color: #a1180f; border-radius: 10px; padding: 10px 14px; }

	.stats { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 16px; }
	.stat {
		display: grid; gap: 10px; align-content: start; padding: 18px 20px; border-radius: 16px;
		background: var(--latar-permukaan); border: 1px solid var(--garis-default);
	}
	.stat p { margin: 0; }
	.stat-label { font-size: 11px; font-weight: 700; letter-spacing: 0.88px; text-transform: uppercase; color: var(--teks-sekunder); }
	.stat-value { display: flex; align-items: baseline; gap: 10px; font-family: var(--font-judul); font-weight: 800; font-size: 36px; letter-spacing: -0.7px; line-height: 1; }
	.stat-value small { font-family: var(--font-isi); font-size: 14px; font-weight: 600; letter-spacing: 0; }
	.stat-note { font-size: 14px; color: var(--teks-sekunder); line-height: 1.45; }
	.stat.hero { background: var(--brand-gradasi); border-color: transparent; color: #fff; box-shadow: 0 12px 28px -10px rgba(229, 52, 26, 0.3); }
	.stat.hero .stat-label, .stat.hero .stat-note { color: #fff; }

	.panels { display: grid; grid-template-columns: minmax(0, 1fr) 380px; gap: 16px; align-items: stretch; }
	.card { background: var(--latar-permukaan); border: 1px solid var(--garis-default); border-radius: 20px; padding: 22px 24px; display: grid; gap: 16px; align-content: start; }
	.card-head { display: flex; align-items: center; gap: 8px; }
	.card-head > :first-child { flex: 1; min-width: 0; }
	h2 { margin: 0; font-family: var(--font-judul); font-weight: 700; font-size: 20px; letter-spacing: -0.1px; }
	.sub { margin: 4px 0 0; font-size: 14px; color: var(--teks-sekunder); }
	.mono { font-family: var(--font-mono); font-size: 12px; color: var(--teks-redup); letter-spacing: 0.4px; }
	.map-wrap { border-radius: 14px; overflow: hidden; background: var(--latar-lembut); }
	.legend { list-style: none; display: flex; flex-wrap: wrap; gap: 8px 16px; padding: 0; margin: 0; font-size: 12px; color: var(--teks-sekunder); }
	.legend span { display: inline-block; width: 9px; height: 9px; border-radius: 50%; margin-right: 6px; }

	.bars { list-style: none; margin: 0; padding: 0; display: grid; gap: 16px; }
	.bars li { display: grid; gap: 6px; }
	.bar-label { display: flex; justify-content: space-between; gap: 8px; font-size: 14px; }
	.bar-label .mono { color: var(--teks-utama); }
	.track { height: 6px; border-radius: 3px; background: var(--latar-kanvas); overflow: hidden; }
	.fill { height: 100%; border-radius: 3px; background: var(--brand-aksen); }
	.fill.lead { background: linear-gradient(90deg, #ff7a45, #e81a12); }

	.list-card { padding: 22px 0 0; gap: 12px; overflow: hidden; }
	.list-card .card-head { padding: 0 24px; }
	.table-wrap { overflow: auto; max-height: 560px; }
	table { width: 100%; border-collapse: collapse; font-size: 14px; }
	th {
		position: sticky; top: 0; z-index: 1; text-align: left; padding: 12px 16px; background: var(--latar-lembut);
		font-family: var(--font-mono); font-size: 11px; font-weight: 500; letter-spacing: 0.6px; text-transform: uppercase; color: var(--teks-sekunder);
	}
	td { padding: 14px 16px; border-top: 1px solid var(--garis-default); vertical-align: middle; }
	th:first-child, td:first-child { padding-left: 24px; }
	th:last-child, td:last-child { padding-right: 24px; }
	td strong { display: block; font-weight: 600; }
	.place { display: block; font-size: 12px; color: var(--teks-sekunder); }
	.num a { font-family: var(--font-mono); font-size: 13px; color: var(--teks-utama); text-decoration: none; font-weight: 500; }
	.num a:hover { color: var(--brand-teks); text-decoration: underline; }
	.time, .mono-cell { font-family: var(--font-mono); font-size: 13px; color: var(--teks-sekunder); white-space: nowrap; }
	tr.is-new { background: var(--latar-lembut); box-shadow: inset 3px 0 0 var(--brand-primer); }
	tr.is-new .num a { color: var(--brand-teks); }
	.tags { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 4px; }
	.tags:empty { display: none; }
	.tag { font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 999px; }
	.tag.new { background: var(--brand-primer); color: #fff; }
	.tag.standby { background: #e3f3e8; color: #1b6b3f; }
	.tag.overdue { background: var(--brand-lembut); color: var(--brand-teks); }
	.warn { color: var(--brand-teks); }
	.empty { padding: 32px; text-align: center; color: var(--teks-redup); margin: 0; border-top: 1px solid var(--garis-default); }

	@media (max-width: 1100px) {
		.stats { grid-template-columns: repeat(2, minmax(0, 1fr)); }
		.panels { grid-template-columns: 1fr; }
	}
	@media (max-width: 640px) {
		.content { padding: 20px 16px 32px; }
		.top { flex-direction: column; }
		.top-actions { margin-left: 0; }
		.stats { grid-template-columns: 1fr; }
	}
</style>
