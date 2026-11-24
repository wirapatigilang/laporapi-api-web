<script lang="ts">
	import logo from '#lib/assets/logo.svg';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	let submitting = $state(false);
</script>

<svelte:head><title>Masuk · Lapor Api</title></svelte:head>

<main class="login">
	<section class="card" aria-labelledby="judul">
		<div class="brand">
			<img src={logo} alt="" width="44" height="44" />
			<div>
				<p class="eyebrow">Polres Sekadau</p>
				<h1 id="judul">Lapor Api</h1>
			</div>
		</div>
		<p class="lead">Masuk untuk memantau dan menindaklanjuti laporan karhutla.</p>

		{#if data.notice && !form}
			<p class="alert info" role="status">{data.notice}</p>
		{/if}
		{#if form?.message}
			<p class="alert error" role="alert" data-testid="login-error">{form.message}</p>
		{/if}

		<form method="POST" onsubmit={() => (submitting = true)}>
			<label>
				<span>Nomor HP</span>
				<input name="phoneNumber" type="tel" inputmode="tel" autocomplete="tel" placeholder="08xxxxxxxxxx" required defaultValue={form?.phoneNumber ?? ''} />
				{#if form?.fields?.phoneNumber}<small class="field-error">{form.fields.phoneNumber}</small>{/if}
			</label>
			<label>
				<span>Kata sandi</span>
				<input name="password" type="password" autocomplete="current-password" required />
				{#if form?.fields?.password}<small class="field-error">{form.fields.password}</small>{/if}
			</label>
			<button type="submit" disabled={submitting}>{submitting ? 'Memproses…' : 'Masuk'}</button>
		</form>
		<p class="foot">Akun petugas dibuat oleh Admin Polres. Pelapor memakai aplikasi Android.</p>
	</section>
</main>

<style>
	.login {
		min-height: 100dvh;
		display: grid;
		place-items: center;
		padding: 16px;
		background:
			radial-gradient(circle at 15% 10%, #ffe3d6 0, transparent 45%),
			linear-gradient(160deg, #fff7f3, #ffffff 60%);
	}
	.card {
		width: 100%;
		max-width: 400px;
		background: #fff;
		border: 1px solid #f3d9cd;
		border-radius: 16px;
		padding: 32px 28px;
		box-shadow: 0 12px 32px rgb(232 26 18 / 0.08);
	}
	.brand { display: flex; gap: 12px; align-items: center; }
	.eyebrow { margin: 0; font-size: 12px; letter-spacing: 0.08em; text-transform: uppercase; color: #b4442a; }
	h1 { margin: 0; font-size: 26px; color: #1f1a17; }
	.lead { color: #5b524d; margin: 16px 0 20px; line-height: 1.5; }
	form { display: grid; gap: 14px; }
	label { display: grid; gap: 6px; font-size: 14px; color: #3a332f; font-weight: 600; }
	input {
		font: inherit; font-weight: 400; padding: 11px 12px; border-radius: 10px;
		border: 1px solid #dccfc8; background: #fffdfc;
	}
	input:focus { outline: 2px solid #ff7a45; outline-offset: 1px; border-color: #ff7a45; }
	button {
		margin-top: 6px; font: inherit; font-weight: 700; color: #fff; border: 0; border-radius: 10px;
		padding: 12px; cursor: pointer; background: linear-gradient(90deg, #ff7a45, #e81a12);
	}
	button:disabled { opacity: 0.7; cursor: progress; }
	.alert { border-radius: 10px; padding: 10px 12px; font-size: 14px; margin: 0 0 14px; }
	.alert.error { background: #fdecea; color: #a1180f; border: 1px solid #f5c2bd; }
	.alert.info { background: #fff4e5; color: #8a4b00; border: 1px solid #ffd8a8; }
	.field-error { color: #a1180f; font-weight: 400; font-size: 13px; }
	.foot { font-size: 12px; color: #8a807a; margin: 18px 0 0; }
</style>
