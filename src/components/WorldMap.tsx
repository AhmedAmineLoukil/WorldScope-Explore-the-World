import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { geoContains, geoEquirectangular, geoGraticule, geoPath } from 'd3-geo';
import { feature } from 'topojson-client';
import type { Feature, Geometry } from 'geojson';
import type { Topology, GeometryCollection } from 'topojson-specification';
import { Minus, Plus, RotateCcw, Pause, Play } from 'lucide-react';
import { countryName } from '../data/countries';

type GeoCountry = Feature<Geometry, { name: string }>;
interface Props { selectedCountry: string; coordinates: [number, number]; onSelectCountry: (name: string) => void; onCountries: (names: string[]) => void }
const position = (lat: number, lng: number, radius = 1) => new THREE.Vector3(Math.cos(lat * Math.PI / 180) * Math.cos(lng * Math.PI / 180), Math.sin(lat * Math.PI / 180), -Math.cos(lat * Math.PI / 180) * Math.sin(lng * Math.PI / 180)).multiplyScalar(radius);

export default function WorldMap({ selectedCountry, coordinates, onSelectCountry, onCountries }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const api = useRef<{ select: (name: string, coord: [number, number]) => void; zoom: (factor: number) => void; reset: () => void; rotate: (value: boolean) => void } | null>(null);
  const callbacks = useRef({ onSelectCountry, onCountries });
  callbacks.current = { onSelectCountry, onCountries };
  const [error, setError] = useState('');
  const [ready, setReady] = useState(false);
  const [rotating, setRotating] = useState(false);
  const [hovered, setHovered] = useState('');

  useEffect(() => {
    const container = host.current!;
    let disposed = false, frame = 0;
    let cleanup = () => {};
    const controller = new AbortController();
    async function initialize() {
      try {
        const response = await fetch('/data/countries.json', { signal: controller.signal });
        if (!response.ok) throw new Error('Country boundaries unavailable');
        const atlas = await response.json() as Topology<{ countries: GeometryCollection<{ name: string }> }>;
        const countries = feature(atlas, atlas.objects.countries).features as GeoCountry[];
        if (disposed) return;
        callbacks.current.onCountries(countries.map(c => countryName(c.properties.name)).sort());
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 100);
        camera.position.copy(position(25, 110, 4.05));
        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.setClearColor(0, 0);
        container.appendChild(renderer.domElement);
        renderer.domElement.setAttribute('aria-label', 'Interactive 3D globe. Drag to rotate, scroll to zoom, or click a country. Use country search for keyboard navigation.');
        renderer.domElement.setAttribute('role', 'img');
        const canvas = document.createElement('canvas');
        canvas.width = 2048; canvas.height = 1024;
        const ctx = canvas.getContext('2d')!;
        const path = geoPath(geoEquirectangular().translate([1024, 512]).scale(2048 / (Math.PI * 2)), ctx);
        const texture = new THREE.CanvasTexture(canvas);
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
        function draw(selected: string) {
          ctx.fillStyle = '#123a63'; ctx.fillRect(0, 0, 2048, 1024);
          ctx.beginPath(); path(geoGraticule().step([15, 15])()); ctx.strokeStyle = '#2b6289'; ctx.lineWidth = 0.7; ctx.stroke();
          for (const country of countries) {
            const active = countryName(country.properties.name) === selected;
            ctx.beginPath(); path(country); ctx.fillStyle = active ? '#b7f34a' : '#4c9a62'; ctx.fill();
            ctx.strokeStyle = active ? '#e5ff9a' : '#1f5e47'; ctx.lineWidth = active ? 2.5 : 0.85; ctx.stroke();
          }
          texture.needsUpdate = true;
        }
        draw(selectedCountry);
        const geometry = new THREE.SphereGeometry(1, 96, 64);
        const material = new THREE.MeshPhongMaterial({ map: texture, shininess: 9, specular: '#969696' });
        const globe = new THREE.Mesh(geometry, material); scene.add(globe);
        scene.add(new THREE.AmbientLight('#ffffff', 1.5));
        const light = new THREE.DirectionalLight('#ffffff', 1.8);
        light.position.copy(position(45, 60, 6)); scene.add(light);
        const atmosphereMaterial = new THREE.ShaderMaterial({
          vertexShader: 'varying vec3 vNormal; varying vec3 vView; void main(){ vNormal=normalize(normalMatrix*normal); vec4 p=modelViewMatrix*vec4(position,1.0); vView=normalize(-p.xyz); gl_Position=projectionMatrix*p; }',
          fragmentShader: 'varying vec3 vNormal; varying vec3 vView; void main(){ float a=pow(1.0-abs(dot(vNormal,vView)),4.0); gl_FragColor=vec4(0.8,0.8,0.8,a*0.18); }',
          transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
        });
        const atmosphere = new THREE.Mesh(new THREE.SphereGeometry(1.018, 64, 48), atmosphereMaterial); scene.add(atmosphere);
        const markerMaterial = new THREE.MeshBasicMaterial({ color: '#ffffff' });
        const marker = new THREE.Mesh(new THREE.SphereGeometry(0.012, 16, 16), markerMaterial);
        marker.position.copy(position(coordinates[0], coordinates[1], 1.016)); scene.add(marker);
        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enablePan = false; controls.enableDamping = true; controls.dampingFactor = 0.065;
        controls.minDistance = 2.7; controls.maxDistance = 5.8; controls.autoRotateSpeed = 0.35; controls.rotateSpeed = 0.55;
        let targetPosition: THREE.Vector3 | null = null;
        controls.addEventListener('start', () => { targetPosition = null; });
        const observer = new ResizeObserver(() => {
          const { width, height } = container.getBoundingClientRect();
          renderer.setSize(width, height); camera.aspect = width / height;
          camera.fov = THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(36 / 2)) / Math.min(1, camera.aspect)));
          camera.updateProjectionMatrix();
        }); observer.observe(container);
        const raycaster = new THREE.Raycaster(); const pointer = new THREE.Vector2();
        function hit(event: PointerEvent) {
          const bounds = renderer.domElement.getBoundingClientRect();
          pointer.set((event.clientX - bounds.left) / bounds.width * 2 - 1, -(event.clientY - bounds.top) / bounds.height * 2 + 1);
          raycaster.setFromCamera(pointer, camera);
          const intersection = raycaster.intersectObject(globe)[0];
          if (!intersection) return null;
          const point = intersection.point.normalize();
          const coord: [number, number] = [Math.atan2(-point.z, point.x) * 180 / Math.PI, Math.asin(point.y) * 180 / Math.PI];
          return countries.find(country => geoContains(country, coord));
        }
        let start = [0, 0];
        const down = (event: PointerEvent) => { start = [event.clientX, event.clientY]; };
        const up = (event: PointerEvent) => { if (Math.hypot(event.clientX - start[0], event.clientY - start[1]) < 5) { const country = hit(event); if (country) callbacks.current.onSelectCountry(countryName(country.properties.name)); } };
        const move = (event: PointerEvent) => { if (event.buttons) return; const country = hit(event); setHovered(country ? countryName(country.properties.name) : ''); renderer.domElement.style.cursor = country ? 'pointer' : 'grab'; };
        const leave = () => setHovered('');
        renderer.domElement.addEventListener('pointerdown', down); renderer.domElement.addEventListener('pointerup', up);
        renderer.domElement.addEventListener('pointermove', move); renderer.domElement.addEventListener('pointerleave', leave);
        api.current = {
          select: (name, coord) => { draw(name); marker.position.copy(position(coord[0], coord[1], 1.016)); if (coord[0] !== 0 || coord[1] !== 0) targetPosition = position(coord[0], coord[1], camera.position.length()); },
          zoom: factor => { targetPosition = camera.position.clone().normalize().multiplyScalar(THREE.MathUtils.clamp(camera.position.length() * factor, 2.7, 5.8)); },
          reset: () => { targetPosition = position(25, 110, 4.05); },
          rotate: value => { controls.autoRotate = value; },
        };
        const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
        function animate() {
          if (disposed) return;
          frame = requestAnimationFrame(animate);
          if (targetPosition) { camera.position.lerp(targetPosition, motion.matches ? 1 : 0.06); if (camera.position.distanceTo(targetPosition) < 0.005) targetPosition = null; }
          controls.update(); renderer.render(scene, camera);
        }
        animate(); setReady(true);
        cleanup = () => { observer.disconnect(); controls.dispose(); renderer.dispose(); geometry.dispose(); material.dispose(); texture.dispose(); atmosphere.geometry.dispose(); atmosphereMaterial.dispose(); marker.geometry.dispose(); markerMaterial.dispose(); renderer.domElement.remove(); api.current = null; };
      } catch (err) { if (!disposed) setError(err instanceof Error ? err.message : 'Globe unavailable'); }
    }
    void initialize();
    return () => { disposed = true; controller.abort(); cancelAnimationFrame(frame); cleanup(); };
  }, []);
  useEffect(() => { if (ready) api.current?.select(selectedCountry, coordinates); }, [selectedCountry, coordinates, ready]);
  return <div className="globe-stage">
    <div className="globe-orbit orbit-one" /><div className="globe-orbit orbit-two" />
    <div ref={host} className="globe-canvas" />
    {!ready && <div className="globe-loading" role="status">{error ? `${error}. Explore using country search above.` : 'Bringing the world to you…'}</div>}
    {hovered && <div className="globe-tooltip">{hovered}</div>}
    <div className="globe-controls">
      <button className="icon-button" aria-label="Zoom in" onClick={() => api.current?.zoom(0.85)}><Plus size={17} /></button>
      <button className="icon-button" aria-label="Zoom out" onClick={() => api.current?.zoom(1.15)}><Minus size={17} /></button>
      <span className="control-divider" />
      <button className="icon-button" aria-label="Reset globe view" onClick={() => api.current?.reset()}><RotateCcw size={15} /></button>
      <button className="icon-button" aria-label={rotating ? 'Pause globe rotation' : 'Auto-rotate globe'} aria-pressed={rotating} onClick={() => { api.current?.rotate(!rotating); setRotating(!rotating); }}>{rotating ? <Pause size={15} /> : <Play size={15} />}</button>
    </div>
    <div className="globe-caption"><span className="live-dot" /> A whole world of possibilities <span className="caption-separator">/</span> <span>Drag to explore</span></div>
  </div>;
}
