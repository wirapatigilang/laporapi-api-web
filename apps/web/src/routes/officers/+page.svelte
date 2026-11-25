<script lang="ts">
	import { enhance } from '$app/forms';
	import AppHeader from '#lib/components/AppHeader.svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	// Formulir Akun: null = tertutup, 'new' = tambah, atau id akun yang diubah.
	let editing = $state<null | string>(null);
	let role = $state('SECTOR_OPERATOR');
	let deactivating = $state<null | { id: string; name: string }>(null);
	let busy = $state(false);

	const current = $derived(editing && editing !== 'new' ? data.officers.find((o) => o.id === editing) : null);
	const failed = $derived(form && !form.success && (form.action === 'create' || form.action === 'update') ? form : null);
	const values = $derived((failed?.values ?? current ?? {}) as Record<string, any>);
	const fields = $derived((failed?.fields ?? {}) as Record<string, string>);

	function openForm(id: 'new' | string) {
		editing = id;
		const o = id === 'new' ? null : data.officers.find((x) => x.id === id);
		role = o?.role ?? 'SECTOR_OPERATOR';
	}

	const submitting = () => {
		busy = true;
		return async ({ result, update }: { result: any; update: (o?: { reset?: boolean }) => Promise<void> }) => {
			busy = false;
			if (result.type === 'success') {
				editing = null;
				deactivating = null;
			}
			if (result.type === 'failure' && result.data?.action === 'deactivate') deactivating = null;
			await update({ reset: false });
		};
	};
</script>

<svelte:head><title>Kelola Akun · Lapor Api</title></svelte:head>

<AppHeader user={data.user} active="officers" />

<main class="content">
	<div class="title">
		<h1>Kelola Akun Petugas</h1>
		<button type="button" class="primary" data-testid="add-account" onclick={() => openForm('new')}>Tambah Akun</button>
	</div>

	{#if form?.success && form.message}
		<p class="result ok" role="status" data-testid="account-result">{form.message}</p>
	{:else if form?.message && !failed}
		<p class="result err" role="alert" data-testid="account-result">{form.message}</p>
	{/if}

	{#if form?.success && form.initialPassword}
		<div class="password" data-testid="initial-password-box">
			<strong>Kata sandi awal untuk {form.officer?.name}:</strong>
			<code data-testid="initial-password">{form.initialPassword}</code>
			<small>Sampaikan langsung kepada petugas. Kata sandi ini hanya ditampilkan sekali.</small>
		</div>
	{/if}

	{#if editing}
		<section class="card" data-testid="account-form-card">
			<h2>{editing === 'new' ? 'Tambah akun petugas' : `Ubah akun ${current?.name ?? ''}`}</h2>
			<form method="POST" action={editing === 'new' ? '?/create' : '?/update'} use:enhance={submitting} class="form" data-testid="account-form">
				{#if editing !== 'new'}<input type="hidden" name="id" value={editing} />{/if}
				<label>
					<span>Nama</span>
					<input name="name" value={values.name ?? ''} maxlength="100" autocomplete="off" />
					{#if fields.name}<small class="field-error" data-testid="error-name">{fields.name}</small>{/if}
				</label>
				<label>
					<span>Nomor HP</span>
					<input name="phoneNumber" value={values.phoneNumber ?? ''} inputmode="tel" autocomplete="off" />
					{#if fields.phoneNumber}<small class="field-error" data-testid="error-phoneNumber">{fields.phoneNumber}</small>{/if}
				</label>
				<label>
					<span>Peran</span>
					<select name="role" bind:value={role}>
						<option value="SECTOR_OPERATOR">Operator Polsek</option>
						<option value="AGENCY_OFFICER">Petugas Instansi</option>
					</select>
					{#if fields.role}<small class="field-error">{fields.role}</small>{/if}
				</label>
				{#if role === 'SECTOR_OPERATOR'}
					<label>
						<span>Polsek</span>
						<select name="policeSectorId" value={values.policeSectorId ?? values.policeSector?.id ?? ''}>
							<option value="">Pilih Polsek</option>
							{#each data.policeSectors as p}<option value={p.id}>{p.name}</option>{/each}
						</select>
						{#if fields.policeSectorId}<small class="field-error" data-testid="error-policeSectorId">{fields.policeSectorId}</small>{/if}
					</label>
				{:else}
					<label>
						<span>Instansi</span>
						<select name="agencyId" value={values.agencyId ?? values.agency?.id ?? ''}>
							<option value="">Pilih Instansi</option>
							{#each data.agencies as a}<option value={a.id}>{a.name}</option>{/each}
						</select>
						{#if fields.agencyId}<small class="field-error" data-testid="error-agencyId">{fields.agencyId}</small>{/if}
					</label>
				{/if}
				<div class="buttons">
					<button type="button" class="ghost" onclick={() => (editing = null)}>Batal</button>
					<button type="submit" class="primary" data-testid="save-account" disabled={busy}>Simpan</button>
				</div>
			</form>
		</section>
	{/if}

	<section class="card list">
		<table data-testid="account-list">
			<thead><tr><th>Nama</th><th>Nomor HP</th><th>Peran</th><th>Polsek / Instansi</th><th>Status</th><th></th></tr></thead>
			<tbody>
				{#each data.officers as o (o.id)}
					<tr data-testid="account-row" data-phone={o.phoneNumber} data-active={o.isActive}>
						<td>{o.name}</td>
						<td>{o.phoneNumber}</td>
						<td>{o.roleLabel}</td>
						<td data-testid="account-unit">{o.policeSector?.name ?? o.agency?.name ?? '–'}</td>
						<td><span class="badge" class:off={!o.isActive} data-testid="account-status">{o.statusLabel}</span></td>
						<td class="row-actions">
							<button type="button" class="ghost small" data-testid="edit-account" onclick={() => openForm(o.id)}>Ubah</button>
							<button type="button" class="danger small" data-testid="deactivate-account" disabled={!o.isActive} onclick={() => (deactivating = { id: o.id, name: o.name })}>Nonaktifkan</button>
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</section>
</main>

{#if deactivating}
	<div class="backdrop" role="presentation">
		<div class="dialog" role="dialog" aria-modal="true" aria-labelledby="deact-title" data-testid="deactivate-dialog">
			<h2 id="deact-title">Nonaktifkan akun {deactivating.name}?</h2>
			<p>Akun tidak dapat masuk lagi ke Lapor Api.</p>
			<form method="POST" action="?/deactivate" use:enhance={submitting} class="buttons end">
				<input type="hidden" name="id" value={deactivating.id} />
				<button type="button" class="ghost" onclick={() => (deactivating = null)}>Batal</button>
				<button type="submit" class="primary" data-testid="deactivate-yes" disabled={busy}>Ya, nonaktifkan</button>
			</form>
		</div>
	</div>
{/if}

<style>
	.content { padding: 20px; max-width: 1100px; margin: 0 auto; display: grid; gap: 16px; }
	.title { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
	h1 { margin: 0; font-size: 24px; }
	h2 { margin: 0 0 12px; font-size: 16px; }
	.card { background: #fff; border: 1px solid #f0dcd2; border-radius: 12px; padding: 16px; }
	.list { padding: 0; overflow: auto; }
	table { width: 100%; border-collapse: collapse; font-size: 14px; }
	th, td { text-align: left; padding: 9px 12px; border-bottom: 1px solid #f6e9e2; }
	th { background: #fffaf7; font-size: 12px; color: #7a6f69; }
	.row-actions { display: flex; gap: 6px; justify-content: flex-end; }
	.form { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 12px; align-items: start; }
	.form label { display: grid; gap: 4px; font-size: 12px; font-weight: 600; color: #5b524d; }
	input, select { font: inherit; font-size: 14px; padding: 8px; border: 1px solid #dccfc8; border-radius: 8px; background: #fffdfc; }
	.buttons { display: flex; gap: 8px; align-items: end; }
	.buttons.end { justify-content: flex-end; }
	button { font: inherit; font-size: 14px; font-weight: 600; border-radius: 8px; padding: 8px 14px; cursor: pointer; border: 1px solid transparent; }
	button.small { padding: 4px 10px; font-size: 13px; }
	button.primary { color: #fff; background: linear-gradient(90deg, #ff7a45, #e81a12); }
	button.ghost { background: #fff; color: #b4442a; border-color: #f0c4b2; }
	button.danger { background: #fff; color: #c92a2a; border-color: #ffc9c9; }
	button:disabled { opacity: 0.45; cursor: not-allowed; }
	.field-error { color: #c92a2a; font-weight: 400; }
	.badge { font-size: 12px; font-weight: 700; padding: 2px 8px; border-radius: 6px; background: #d3f9d8; color: #2b8a3e; }
	.badge.off { background: #f1f3f5; color: #868e96; }
	.result { border-radius: 8px; padding: 8px 12px; font-size: 14px; margin: 0; }
	.result.ok { background: #ebfbee; color: #2b8a3e; }
	.result.err { background: #fdecea; color: #a1180f; }
	.password { background: #fff9db; border: 1px solid #ffe066; border-radius: 12px; padding: 12px 16px; display: grid; gap: 4px; }
	.password code { font-size: 20px; letter-spacing: 1px; }
	.password small { color: #8a5a00; }
	.backdrop { position: fixed; inset: 0; background: rgba(33, 24, 20, 0.45); display: grid; place-items: center; z-index: 2000; padding: 16px; }
	.dialog { background: #fff; border-radius: 12px; padding: 20px; max-width: 420px; width: 100%; }
	.dialog p { font-size: 14px; color: #5b524d; }
</style>
