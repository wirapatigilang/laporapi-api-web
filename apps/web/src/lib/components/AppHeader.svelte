<script lang="ts">
	import logo from '#lib/assets/logo.svg';
	import { ROLE_LABELS } from '#lib/roles.js';

	let { user, active = '', unread = 0 }: { user: SessionUser; active?: string; unread?: number } = $props();
	const unit = $derived(user.agency?.name ?? user.policeSector?.name ?? 'Polres Sekadau');
	const initials = $derived(
		user.name
			.split(/\s+/)
			.filter(Boolean)
			.slice(-2)
			.map((w) => w[0]?.toUpperCase())
			.join('')
	);
</script>

<!-- Sidebar web (Figma: SB/Sidebar Web, DS 2.0). Nama komponen tetap AppHeader agar semua halaman memakainya. -->
<aside class="sidebar">
	<a class="brand" href="/dashboard">
		<img src={logo} alt="" width="30" height="30" />
		<span>Lapor Api</span>
	</a>
	<p class="unit-caption">{unit}</p>

	<p class="group">Menu</p>
	<nav aria-label="Menu utama">
		<a href="/dashboard" class:active={active === 'dashboard'}>
			<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 4 3 6.5v13L9 17l6 2.5 6-2.5V4l-6 2.5L9 4Zm0 0v13m6-10.5v13" /></svg>
			Dasbor Laporan
		</a>
		{#if user.role === 'ADMIN'}
			<a href="/officers" class:active={active === 'officers'} data-testid="nav-accounts">
				<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 3.6-7 8-7s8 3 8 7" /></svg>
				Kelola Akun
			</a>
		{/if}
		<a href="/notifications" class:active={active === 'notifications'} data-testid="nav-notifications">
			<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 16V11a6 6 0 1 1 12 0v5l1.5 2h-15L6 16Zm4 4a2 2 0 0 0 4 0" /></svg>
			Notifikasi
			{#if unread > 0}<span class="count" data-testid="nav-unread">{unread}</span>{/if}
		</a>
	</nav>

	<div class="footer">
		<div class="who">
			<span class="avatar" aria-hidden="true">{initials}</span>
			<div>
				<strong data-testid="user-name">{user.name}</strong>
				<span class="role" data-testid="user-role">{ROLE_LABELS[user.role]} · <span data-testid="user-unit">{unit}</span></span>
			</div>
		</div>
		<form method="POST" action="/logout"><button>Keluar</button></form>
	</div>
</aside>

<style>
	:global(body:has(.sidebar)) { padding-left: 264px; }
	.sidebar {
		position: fixed; inset: 0 auto 0 0; width: 264px; box-sizing: border-box; z-index: 1000;
		display: flex; flex-direction: column; gap: 6px; padding: 28px 16px 24px;
		background: var(--latar-permukaan); border-right: 1px solid var(--garis-default); overflow-y: auto;
	}
	.brand { display: flex; align-items: center; gap: 8px; padding: 0 8px; text-decoration: none; color: var(--teks-utama); }
	.brand span { font-family: var(--font-judul); font-weight: 800; font-size: 22px; letter-spacing: -0.4px; }
	.unit-caption {
		margin: 6px 8px 22px; font-family: var(--font-mono); font-size: 11px; letter-spacing: 0.6px;
		text-transform: uppercase; color: var(--teks-redup);
	}
	.group { margin: 0 8px 4px; font-size: 11px; font-weight: 700; letter-spacing: 0.9px; text-transform: uppercase; color: var(--teks-redup); }
	nav { display: grid; gap: 4px; }
	nav a {
		display: flex; align-items: center; gap: 12px; padding: 10px 12px; border-radius: 10px;
		color: var(--teks-sekunder); text-decoration: none; font-size: 14px; font-weight: 500;
	}
	nav a:hover { background: var(--latar-lembut); }
	nav a.active { background: var(--brand-lembut); color: var(--brand-teks); font-weight: 600; }
	nav svg { width: 18px; height: 18px; fill: none; stroke: currentColor; stroke-width: 1.8; stroke-linecap: round; stroke-linejoin: round; flex: none; }
	.count {
		margin-left: auto; min-width: 20px; padding: 1px 6px; box-sizing: border-box; text-align: center;
		border-radius: 999px; background: var(--brand-lembut); color: var(--brand-teks); font-family: var(--font-mono); font-size: 11px;
	}
	nav a.active .count { background: var(--latar-permukaan); }
	.footer { margin-top: auto; display: grid; gap: 10px; }
	.who { display: flex; gap: 10px; align-items: center; padding: 12px; border-radius: 14px; background: var(--latar-lembut); }
	.who div { display: grid; min-width: 0; }
	.who strong { font-size: 14px; }
	.avatar {
		flex: none; width: 36px; height: 36px; border-radius: 50%; display: grid; place-items: center;
		background: var(--brand-gradasi); color: #fff; font-size: 12px; font-weight: 700;
	}
	.role { font-size: 12px; color: var(--teks-sekunder); }
	button {
		width: 100%; font: inherit; font-size: 14px; font-weight: 600; color: var(--teks-utama); cursor: pointer;
		border: 1.5px solid var(--garis-kuat); background: var(--latar-permukaan); border-radius: 12px; padding: 9px 12px;
	}
	button:hover { background: var(--latar-lembut); }
	@media (max-width: 900px) {
		:global(body:has(.sidebar)) { padding-left: 0; }
		.sidebar { position: static; width: auto; height: auto; flex-direction: row; flex-wrap: wrap; align-items: center; padding: 12px 16px; border-right: 0; border-bottom: 1px solid var(--garis-default); }
		.unit-caption, .group { display: none; }
		nav { display: flex; flex-wrap: wrap; }
		.footer { margin: 0 0 0 auto; display: flex; align-items: center; }
		.who { display: none; }
		button { width: auto; }
	}
</style>
