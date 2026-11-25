<script lang="ts">
	import logo from '#lib/assets/logo.svg';
	import { ROLE_LABELS } from '#lib/roles.js';

	let { user, active = '' }: { user: SessionUser; active?: string } = $props();
	const unit = $derived(user.agency?.name ?? user.policeSector?.name ?? 'Polres Sekadau');
</script>

<header class="bar">
	<a class="brand" href="/dashboard"><img src={logo} alt="" width="28" height="28" /> <strong>Lapor Api</strong></a>
	<nav aria-label="Menu utama">
		<a href="/dashboard" class:active={active === 'dashboard'}>Dasbor</a>
	</nav>
	<div class="who">
		<span data-testid="user-name">{user.name}</span>
		<span class="role" data-testid="user-role">{ROLE_LABELS[user.role]} · <span data-testid="user-unit">{unit}</span></span>
	</div>
	<form method="POST" action="/logout"><button>Keluar</button></form>
</header>

<style>
	.bar {
		display: flex; align-items: center; gap: 16px; padding: 10px 20px; background: #fff;
		border-bottom: 1px solid #f0dcd2; position: sticky; top: 0; z-index: 1000;
	}
	.brand { display: flex; align-items: center; gap: 8px; color: #e81a12; text-decoration: none; }
	nav { display: flex; gap: 4px; }
	nav a { color: #5b524d; text-decoration: none; padding: 6px 10px; border-radius: 8px; font-size: 14px; }
	nav a.active, nav a:hover { background: #fff1eb; color: #b4442a; }
	.who { margin-left: auto; display: grid; text-align: right; font-size: 14px; }
	.role { color: #7a6f69; font-size: 12px; }
	button { font: inherit; border: 1px solid #e3cfc5; background: #fff; border-radius: 8px; padding: 6px 12px; cursor: pointer; }
	@media (max-width: 640px) { .who { display: none; } }
</style>
