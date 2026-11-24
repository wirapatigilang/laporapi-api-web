<script lang="ts">
	import logo from '#lib/assets/logo.svg';
	import { ROLE_LABELS } from '#lib/roles.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const unit = $derived(data.user.agency?.name ?? data.user.policeSector?.name ?? 'Polres Sekadau');
</script>

<svelte:head><title>Dasbor Laporan · Lapor Api</title></svelte:head>

<header class="bar">
	<div class="brand"><img src={logo} alt="" width="28" height="28" /> <strong>Lapor Api</strong></div>
	<div class="who">
		<span data-testid="user-name">{data.user.name}</span>
		<span class="role" data-testid="user-role">{ROLE_LABELS[data.user.role]} · <span data-testid="user-unit">{unit}</span></span>
	</div>
	<form method="POST" action="/logout"><button>Keluar</button></form>
</header>

<main class="content">
	<h1>Dasbor Laporan</h1>
	{#if data.user.role === 'AGENCY_OFFICER'}
		<p data-testid="scope-note">Menampilkan laporan yang diteruskan ke {unit}.</p>
	{:else if data.user.role === 'SECTOR_OPERATOR'}
		<p data-testid="scope-note">Menampilkan laporan di wilayah {unit}.</p>
	{:else}
		<p data-testid="scope-note">Menampilkan semua laporan di Kabupaten Sekadau.</p>
	{/if}
	<p class="empty">Daftar dan peta laporan dibangun pada iterasi UC-06.</p>
</main>

<style>
	.bar {
		display: flex; align-items: center; gap: 16px; padding: 10px 20px; background: #fff;
		border-bottom: 1px solid #f0dcd2;
	}
	.brand { display: flex; align-items: center; gap: 8px; color: #e81a12; }
	.who { margin-left: auto; display: grid; text-align: right; font-size: 14px; }
	.role { color: #7a6f69; font-size: 12px; }
	button { font: inherit; border: 1px solid #e3cfc5; background: #fff; border-radius: 8px; padding: 6px 12px; cursor: pointer; }
	.content { padding: 24px 20px; max-width: 1100px; margin: 0 auto; }
	.empty { color: #8a807a; border: 1px dashed #e3cfc5; padding: 24px; border-radius: 12px; background: #fff; }
	@media (max-width: 560px) { .who { display: none; } }
</style>
