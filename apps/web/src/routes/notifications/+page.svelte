<script lang="ts">
	import AppHeader from '#lib/components/AppHeader.svelte';
	import { formatDateTime } from '#lib/status.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<svelte:head><title>Notifikasi · Lapor Api</title></svelte:head>

<AppHeader user={data.user} active="notifications" />

<main class="content">
	<h1>Notifikasi</h1>
	{#if data.notifications.length === 0}
		<p class="empty" data-testid="empty-notifications">Belum ada notifikasi</p>
	{:else}
		<ul class="list" data-testid="notification-list">
			{#each data.notifications as n (n.id)}
				<li data-testid="notification-item" data-read={n.isRead} class:unread={!n.isRead}>
					<form method="POST" action="?/open">
						<input type="hidden" name="id" value={n.id} />
						<button type="submit" class="item" disabled={!n.reportId}>
							<strong>{n.title}</strong>
							<span class="body">{n.body}</span>
							<span class="time">{formatDateTime(n.createdAt)}</span>
						</button>
					</form>
				</li>
			{/each}
		</ul>
	{/if}
</main>

<style>
	.content { padding: 20px; max-width: 760px; margin: 0 auto; }
	h1 { font-size: 24px; margin: 0 0 16px; }
	.list { list-style: none; margin: 0; padding: 0; display: grid; gap: 8px; }
	.item { width: 100%; text-align: left; display: grid; gap: 2px; background: #fff; border: 1px solid #f0dcd2; border-radius: 12px; padding: 12px 14px; font: inherit; cursor: pointer; }
	.item:hover { border-color: #f0b49c; }
	.unread .item { border-left: 4px solid #e81a12; background: #fffaf7; }
	.body { font-size: 14px; color: #5b524d; }
	.time { font-size: 12px; color: #8a807a; }
	.empty { color: #8a807a; text-align: center; padding: 32px; }
</style>
