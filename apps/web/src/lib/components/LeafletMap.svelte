<script lang="ts">
	import { onMount } from 'svelte';
	import 'leaflet/dist/leaflet.css';
	import { STATUS_COLORS, type ReportStatus } from '#lib/status.js';

	export interface MapPoint {
		id: string;
		latitude: number;
		longitude: number;
		status?: ReportStatus;
		color?: string;
		label: string;
		href?: string;
		isNew?: boolean;
		kind?: string;
	}

	let {
		points,
		lines = [],
		height = '420px',
		testid = 'map',
		fitPadding = 40
	}: {
		points: MapPoint[];
		lines?: [[number, number], [number, number]][];
		height?: string;
		testid?: string;
		fitPadding?: number;
	} = $props();

	let el: HTMLDivElement;
	let L: typeof import('leaflet') | null = null;
	let map: import('leaflet').Map | null = null;
	let layer: import('leaflet').LayerGroup | null = null;
	const SEKADAU: [number, number] = [0.03, 110.9];

	function draw() {
		if (!L || !map || !layer) return;
		layer.clearLayers();
		for (const p of points) {
			const color = p.color ?? (p.status ? STATUS_COLORS[p.status] : '#e5341a');
			const marker = L.circleMarker([p.latitude, p.longitude], {
				radius: p.isNew ? 10 : 8,
				color: '#ffffff',
				weight: 2,
				fillColor: color,
				fillOpacity: 0.95,
				className: `map-marker marker-${p.status ?? p.kind ?? 'point'}${p.isNew ? ' marker-new' : ''}`
			});
			marker.bindTooltip(p.label);
			if (p.href) marker.on('click', () => (window.location.href = p.href!));
			marker.addTo(layer);
		}
		for (const [a, b] of lines) L.polyline([a, b], { color: '#5b524d', dashArray: '4 4', weight: 2 }).addTo(layer);
		if (points.length === 1) map.setView([points[0].latitude, points[0].longitude], 15);
		else if (points.length > 1)
			map.fitBounds(L.latLngBounds(points.map((p) => [p.latitude, p.longitude] as [number, number])), {
				padding: [fitPadding, fitPadding],
				maxZoom: 16
			});
	}

	onMount(() => {
		let destroyed = false;
		import('leaflet').then((mod) => {
			if (destroyed) return;
			L = mod.default ?? mod;
			map = L.map(el, { zoomControl: true }).setView(SEKADAU, 10);
			// Masukan dosen 25 Nov 2026: peta dasar citra satelit agar hutan, sawah, dan kebun terlihat.
			const satellite = L.tileLayer(
				'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
				{ maxZoom: 19, maxNativeZoom: 18, attribution: 'Citra &copy; Esri, Maxar, Earthstar Geographics' }
			);
			// Label nama tempat di atas citra, di bawah penanda laporan.
			const labelPane = map.createPane('labels');
			labelPane.style.zIndex = '350';
			labelPane.style.pointerEvents = 'none';
			const labels = L.tileLayer(
				'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',
				{ maxZoom: 19, maxNativeZoom: 18, pane: 'labels', opacity: 0.9 }
			);
			const street = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
				maxZoom: 19,
				attribution: '&copy; kontributor OpenStreetMap'
			});
			const satelliteWithLabels = L.layerGroup([satellite, labels]).addTo(map);
			L.control.layers({ Satelit: satelliteWithLabels, Jalan: street }, undefined, { position: 'topright' }).addTo(map);
			layer = L.layerGroup().addTo(map);
			draw();
			el.dataset.ready = 'true';
		});
		return () => {
			destroyed = true;
			map?.remove();
		};
	});

	$effect(() => {
		// gambar ulang bila titik berubah
		void points;
		void lines;
		draw();
	});
</script>

<div class="map" bind:this={el} style={`height:${height}`} data-testid={testid}></div>

<style>
	.map { width: 100%; border-radius: 12px; border: 1px solid #f0dcd2; z-index: 0; }
	:global(.marker-new) { animation: pulse 1.2s ease-in-out infinite; }
	@keyframes pulse { 50% { stroke-width: 6; } }
</style>
