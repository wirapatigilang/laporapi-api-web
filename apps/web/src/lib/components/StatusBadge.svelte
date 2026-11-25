<script lang="ts">
	import { STATUS_COLORS, STATUS_LABELS, type ReportStatus } from '#lib/status.js';
	let { status }: { status: ReportStatus } = $props();
</script>

<span class="badge" data-status={status} style={`--c:${STATUS_COLORS[status]}`}>{STATUS_LABELS[status]}</span>

<style>
	.badge {
		display: inline-flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 600; white-space: nowrap;
		padding: 3px 8px; border-radius: 999px; color: var(--c); background: color-mix(in srgb, var(--c) 12%, white);
	}
	.badge::before { content: ''; width: 8px; height: 8px; border-radius: 50%; background: var(--c); }
</style>
