<script lang="ts">
	import favicon from '#lib/assets/logo.svg';
	import type { LayoutProps } from './$types';

	let { children }: LayoutProps = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<link rel="preconnect" href="https://fonts.googleapis.com" />
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
	<link
		rel="stylesheet"
		href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,600..800&family=Hanken+Grotesk:wght@400;500;600;700&family=JetBrains+Mono:wght@500&display=swap"
	/>
</svelte:head>

{@render children()}

<style>
	/* Token Design System 2.0 Lapor Api (Figma). */
	:global(:root) {
		--latar-kanvas: #fbf8f6;
		--latar-permukaan: #ffffff;
		--latar-lembut: #fff6f1;
		--latar-gelap: #22140f;
		--teks-utama: #22140f;
		--teks-sekunder: #5a4a41;
		--teks-redup: #a8978c;
		--garis-default: #e9e0da;
		--garis-kuat: #d4c7bf;
		--brand-primer: #e5341a;
		--brand-aksen: #ff7a45;
		--brand-teks: #c2240f;
		--brand-lembut: #ffe8dc;
		--brand-gradasi: linear-gradient(150deg, #ff7a45 8%, #e81a12 92%);
		--font-judul: 'Bricolage Grotesque', 'Hanken Grotesk', system-ui, sans-serif;
		--font-isi: 'Hanken Grotesk', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
		--font-mono: 'JetBrains Mono', ui-monospace, 'SFMono-Regular', Menlo, monospace;
	}
	:global(body) {
		margin: 0;
		font-family: var(--font-isi);
		background: var(--latar-kanvas);
		color: var(--teks-utama);
	}
</style>
