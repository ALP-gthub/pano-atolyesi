// 3D pano, malzeme rafı ve etkileşimler (three.js)
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { TIPLER, RAF_SIRASI, klemensler, ucAnlami, GRUP_RENK, KABLO_RENKLERI } from './malzemeler.js';
import { kontrolEt, oturt, motorDurumu, motorAdi, otomatikRenk, renkAglari, beklenenRenk, gorevler, aglar } from './cozucu.js';
import { ornekDevre } from './ornek.js';

export const SURUM = '0.5.2';
const RAYLAR = [17, 2, -13];
const PANO = { w: 72, h: 50, cx: 0, cy: 2 };
const KABLO_RENK = Object.fromEntries(Object.entries(KABLO_RENKLERI).map(([k, v]) => [k, v.renk]));
const ON_KAMERA = { pos: new THREE.Vector3(7.5, 2, 160), hedef: new THREE.Vector3(7.5, 2, 0) };
const UC_KAMERA = { pos: new THREE.Vector3(85, 50, 125), hedef: new THREE.Vector3(4, 0, 0) };

const $ = (s) => document.querySelector(s);

// ---------- durum ----------
let devre = { comps: [], wires: [] };
let sayac = 1;
let secili = null; // {tur:'comp'|'wire', id|i}
let kabloBas = null; // ilk tıklanan uç
let yerlestir = null; // {type, mevcut, grup, basX, basY, surukle}
let gorunum = 'on';
let canli = null; // canlı deneme durumu

// ---------- sahne ----------
const kap = $('#sahne');
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
kap.appendChild(renderer.domElement);
const scene = new THREE.Scene();
scene.background = new THREE.Color('#e8ebef');
const camera = new THREE.PerspectiveCamera(20, 1, 1, 800);
camera.position.copy(ON_KAMERA.pos);
const controls = new OrbitControls(camera, renderer.domElement);
controls.target.copy(ON_KAMERA.hedef);
controls.enableRotate = false;
controls.zoomToCursor = true;
controls.minDistance = 20;
controls.maxDistance = 320;
controls.mouseButtons = { LEFT: null, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.PAN };
controls.update();

scene.add(new THREE.HemisphereLight('#ffffff', '#9aa3ad', 1.6));
const gunes = new THREE.DirectionalLight('#ffffff', 1.4);
gunes.position.set(25, 40, 60);
scene.add(gunes);

// Montaj plakası ve DIN rayları
const plaka = new THREE.Mesh(new THREE.BoxGeometry(PANO.w, PANO.h, 0.6), new THREE.MeshStandardMaterial({ color: '#c9ccd1', metalness: 0.3, roughness: 0.7 }));
plaka.position.set(PANO.cx, PANO.cy, -0.3);
plaka.userData.plaka = true;
scene.add(plaka);
const kasa = new THREE.Mesh(new THREE.BoxGeometry(PANO.w + 2, PANO.h + 2, 3), new THREE.MeshStandardMaterial({ color: '#9aa1aa', metalness: 0.2, roughness: 0.8 }));
kasa.position.set(PANO.cx, PANO.cy, -2.2);
scene.add(kasa);
// Kablo kanalları: raylar arasında yatay, iki yanda dikey
// Kablo kanalları: raylar arasındaki boşluklar (yatay bantlar) ve iki yanda dikey kanal.
// Kablolar bant içinde ayrı şeritlere dağıtılır, üst üste binmez.
const BANTLAR = [{ ust: 26.4, alt: 22.6 }, { ust: 11.4, alt: 7.6 }, { ust: -3.6, alt: -7.4 }, { ust: -18.6, alt: -22.4 }];
const KANAL_X = 34.2;
const YAN = { ic: 33.4, dis: 35.8 };
const KANAL_Z = 2.0;
const kanalMat = new THREE.MeshStandardMaterial({ color: '#c3c8ce', roughness: 0.9 });
for (const b of BANTLAR) {
  const k = new THREE.Mesh(new THREE.BoxGeometry(2 * YAN.dis, b.ust - b.alt, 1.0), kanalMat);
  k.position.set(PANO.cx, (b.ust + b.alt) / 2, 0.5); scene.add(k);
}
for (const x of [-1, 1]) {
  const k = new THREE.Mesh(new THREE.BoxGeometry(YAN.dis - YAN.ic, BANTLAR[0].ust - BANTLAR[3].alt, 1.0), kanalMat);
  k.position.set(x * (YAN.ic + YAN.dis) / 2, (BANTLAR[0].ust + BANTLAR[3].alt) / 2, 0.5); scene.add(k);
}
for (const y of RAYLAR) {
  const ray = new THREE.Mesh(new THREE.BoxGeometry(2 * YAN.ic - 1, 3.5, 0.75), new THREE.MeshStandardMaterial({ color: '#d5d9de', metalness: 0.5, roughness: 0.4 }));
  ray.position.set(PANO.cx, y, 0.375);
  scene.add(ray);
}

// ---------- doku yardımcıları ----------
const PX = 64;
function yaziDokusu(w, h, ciz) {
  const cv = document.createElement('canvas');
  cv.width = Math.round(w * PX); cv.height = Math.round(h * PX);
  const g = cv.getContext('2d');
  ciz(g, cv.width, cv.height);
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}
const ux = (w, x) => (x + w / 2) * PX;
const uy = (h, y) => (h / 2 - y) * PX;

function yuzCiz(c, tip) {
  const { w, h } = tip;
  return yaziDokusu(w, h, (g, W, H) => {
    g.fillStyle = tip.renk; g.fillRect(0, 0, W, H);
    g.strokeStyle = 'rgba(0,0,0,0.35)'; g.lineWidth = 4; g.strokeRect(2, 2, W - 4, H - 4);
    const koyu = ['#2b2f36', '#3d4a5c', '#4a6178', '#8a9099'].includes(tip.renk);
    const yazi = koyu ? '#f2f4f7' : '#1e2329';
    g.textAlign = 'center'; g.textBaseline = 'middle';
    // Uç grupları: güç, bobin, yardımcı kontak ayrı renkli bölgelerde
    const gruplar = {};
    for (const t of tip.terms) {
      if (!GRUP_RENK[t[5]]) continue;
      const satir = t[2] > 0 ? 'u' : 'a';
      const k = t[5] + satir;
      (gruplar[k] = gruplar[k] || []).push(t);
    }
    for (const k in gruplar) {
      const ts = gruplar[k];
      const x0 = Math.min(...ts.map((t) => t[1])) - 0.55, x1 = Math.max(...ts.map((t) => t[1])) + 0.55;
      const y = ts[0][2];
      const ya = y > 0 ? y + 0.5 : y - 1.3, yb = y > 0 ? y - 1.3 : y + 0.5;
      g.fillStyle = GRUP_RENK[ts[0][5]].zemin;
      g.fillRect(ux(w, x0), uy(h, Math.max(ya, yb)), (x1 - x0) * PX, Math.abs(ya - yb) * PX);
    }
    g.fillStyle = yazi;
    const tanim = c.tanim !== undefined ? c.tanim : tanimBul(c, { ana: [], yildiz: [], ucgen: [] }, null);
    const kod = c.label || '';
    const yaz = (m, yy, boy, gen = w - 0.5, xx = 0, renk = yazi) => { g.fillStyle = renk; sigdirYaz(g, m, ux(w, xx), uy(h, yy), gen, boy); };
    switch (c.type) {
      case 'basla': case 'dur': case 'lamba':
        yaz(kod, 2.3, 0.5); yaz(tanim, 1.75, 0.4, w - 0.4, 0, c.type === 'basla' ? '#69db7c' : c.type === 'dur' ? '#ff8787' : '#f2f4f7'); break;
      case 'kontaktor':
        yaz(kod, 2.72, 0.58); yaz(tanim, 2.1, 0.4, w - 1.2);
        g.fillStyle = GRUP_RENK.bobin.yazi; g.font = `${Math.round(0.32 * PX)}px system-ui, sans-serif`; g.fillText('Bobin 220 V', ux(w, -2.4), uy(h, -1.4)); break;
      case 'termik':
        yaz(kod, 1.75, 0.55, 3.8); yaz(tanim, 1.0, 0.4, 3.8); break;
      case 'zaman':
        yaz(kod, 2.7, 0.5); yaz(tanim, -0.5, 0.38);
        g.font = `${Math.round(0.34 * PX)}px system-ui, sans-serif`; g.fillText('çekmede ' + tip.sure + ' s', W / 2, uy(h, -1.6)); break;
      case 'sigorta3': case 'sigorta1':
        yaz(kod, -1.0, 0.55); yaz(tanim, -2.1, 0.4); break;
      case 'motor':
        yaz(kod + (tanim ? ' ' + tanim : ''), 0, 0.42, 4.6, -0.9); break;
      case 'besleme3f':
        yaz(kod, 0.5, 0.6); yaz(tanim, 1.85, 0.4); break;
      case 'klemens':
        g.font = `bold ${Math.round(0.42 * PX)}px system-ui`; g.save(); g.translate(W / 2, H / 2); g.rotate(-Math.PI / 2); g.fillText(kod, 0, 0); g.restore(); break;
    }
    // klemens adları: üst sıradakiler vidanın altına, alt sıradakiler üstüne (kablo dışarı çıkar, yazı kapanmaz)
    for (const t of tip.terms) {
      const ad = t[4];
      const x = ux(w, t[1]), y = uy(h, t[2]);
      g.fillStyle = 'rgba(0,0,0,0.28)'; g.beginPath(); g.arc(x, y, 0.36 * PX, 0, Math.PI * 2); g.fill();
      if (!ad) continue;
      g.fillStyle = koyu ? '#f2f4f7' : (GRUP_RENK[t[5]] || { yazi }).yazi;
      const uzun = ad.length > 2;
      g.font = `bold ${Math.round((uzun ? 0.42 : 0.5) * PX)}px system-ui, sans-serif`;
      const dy = (c.type === 'motor' ? 0 : t[2] >= 0 ? 0.78 : -0.78);
      if (c.type === 'motor') g.fillText(ad, x + 0.75 * PX, y);
      else g.fillText(ad, x, y + dy * PX);
    }
  });
}

// ---------- kısa tanımlar ----------
// Kontaktörün tanımı güç devresindeki bağlantıdan çıkarılır (ana, yıldız, üçgen).
function tanimBul(c, g, ag) {
  const kaynak = (t) => (ag ? ag.kaynakOf(c.id + '.' + t) : new Set());
  switch (c.type) {
    case 'basla': return 'START';
    case 'dur': return 'STOP';
    case 'kontaktor':
      return g.ana.includes(c.id) ? 'ANA KONTAKTÖR' : g.yildiz.includes(c.id) ? 'YILDIZ KONTAKTÖRÜ' : g.ucgen.includes(c.id) ? 'ÜÇGEN KONTAKTÖRÜ' : 'KONTAKTÖR';
    case 'termik': return 'TERMİK RÖLE';
    case 'zaman': return 'ZAMAN RÖLESİ';
    case 'sigorta3': return ['1', '3', '5'].some((t) => [...kaynak(t)].some((x) => /^L[123]$/.test(x))) ? 'GÜÇ SİGORTASI' : 'SİGORTA';
    case 'sigorta1': {
      // Çıkışı bobin, yardımcı kontak, buton ya da lamba ucuyla aynı ağdaysa kumanda sigortasıdır
      if (!ag) return 'SİGORTA';
      const cikis = ag.bul(c.id + '.2');
      const kumanda = devre.comps.some((d) => klemensler(d).some((t) => (t[5] === 'bobin' || t[5] === 'yard') && ag.bul(d.id + '.' + t[0]) === cikis));
      return kumanda ? 'KUMANDA SİGORTASI' : 'SİGORTA';
    }
    case 'lamba': return 'SİNYAL LAMBASI';
    case 'motor': return 'MOTOR 3~';
    case 'besleme3f': return '3 FAZ BESLEME';
    default: return '';
  }
}
function tanimlariGuncelle() {
  const g = gorevler(devre);
  const ag = aglar(devre, { cont: {}, tact: {}, pressed: {}, tripped: {} });
  const degisen = [];
  for (const c of devre.comps) {
    const t = tanimBul(c, g, ag);
    if (c.tanim !== t) { c.tanim = t; degisen.push(c); }
  }
  return degisen;
}
// Metni verilen genişliğe sığdır; gerekirse iki satıra böl
function sigdirYaz(g, metin, x, y, genislik, boy) {
  let f = boy;
  g.font = `bold ${f * PX}px system-ui, sans-serif`;
  if (g.measureText(metin).width <= genislik * PX) { g.fillText(metin, x, y); return; }
  const k = metin.split(' ');
  if (k.length > 1) {
    const orta = Math.ceil(k.length / 2), s1 = k.slice(0, orta).join(' '), s2 = k.slice(orta).join(' ');
    while (Math.max(g.measureText(s1).width, g.measureText(s2).width) > genislik * PX && f > 0.22) { f -= 0.02; g.font = `bold ${f * PX}px system-ui, sans-serif`; }
    g.fillText(s1, x, y - f * 0.55 * PX); g.fillText(s2, x, y + f * 0.55 * PX); return;
  }
  while (g.measureText(metin).width > genislik * PX && f > 0.22) { f -= 0.02; g.font = `bold ${f * PX}px system-ui, sans-serif`; }
  g.fillText(metin, x, y);
}

// ---------- malzeme modeli ----------
const vidaGeo = new THREE.CylinderGeometry(0.3, 0.3, 0.14, 18);
vidaGeo.rotateX(Math.PI / 2);
const vidaMat = new THREE.MeshStandardMaterial({ color: '#c8a85a', metalness: 0.8, roughness: 0.3 });
const vidaVurgu = new THREE.MeshStandardMaterial({ color: '#ffb000', emissive: '#ff8800', emissiveIntensity: 0.7 });
const vidaUzerinde = new THREE.MeshStandardMaterial({ color: '#ffe066', emissive: '#ffcc00', emissiveIntensity: 0.6 });

function malzemeKur(c, { klemensli = true } = {}) {
  const tip = TIPLER[c.type];
  const grup = new THREE.Group();
  grup.userData.compId = c.id;
  const yanMat = new THREE.MeshStandardMaterial({ color: tip.renk, roughness: 0.75 });
  const yuzMat = new THREE.MeshStandardMaterial({ map: yuzCiz(c, tip), roughness: 0.8 });
  if (c.type === 'motor') {
    const govde = new THREE.Mesh(new THREE.CylinderGeometry(3.6, 3.6, 9, 32), new THREE.MeshStandardMaterial({ color: tip.renk, metalness: 0.3, roughness: 0.6 }));
    govde.rotation.z = Math.PI / 2; govde.position.z = 3.6;
    grup.add(govde);
    const kw = tip.kutu.w, kh = tip.kutu.h;
    const kutu = new THREE.Mesh(new THREE.BoxGeometry(kw, kh, 1.6), [yanMat, yanMat, yanMat, yanMat, yuzMat, yanMat]);
    kutu.position.z = tip.d - 0.8;
    grup.add(kutu);
    const mil = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 2, 16), new THREE.MeshStandardMaterial({ color: '#aeb4bb', metalness: 0.9, roughness: 0.25 }));
    mil.rotation.z = Math.PI / 2; mil.position.set(5.5, 0, 3.6);
    grup.add(mil);
    const pervane = new THREE.Mesh(new THREE.BoxGeometry(0.3, 4.4, 0.6), new THREE.MeshStandardMaterial({ color: '#e0a100' }));
    pervane.position.set(6.1, 0, 3.6);
    grup.add(pervane);
    grup.userData.pervane = pervane;
    // yüz dokusu 9x7 çizildi; kutu 5.2x3.6: dokuyu kırp
    yuzMat.map.repeat.set(kw / tip.w, kh / tip.h);
    yuzMat.map.offset.set((1 - kw / tip.w) / 2, (1 - kh / tip.h) / 2);
  } else {
    const govde = new THREE.Mesh(new THREE.BoxGeometry(tip.w, tip.h, tip.d), [yanMat, yanMat, yanMat, yanMat, yuzMat, yanMat]);
    govde.position.z = 0.75 + tip.d / 2;
    grup.add(govde);
  }
  const yuzZ = c.type === 'motor' ? tip.d : 0.75 + tip.d;
  const ekle = (geo, renk, x, y, z) => { const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: renk, roughness: 0.5 })); m.position.set(x, y, yuzZ + z); grup.add(m); return m; };
  if (c.type === 'kontaktor') grup.userData.gosterge = ekle(new THREE.BoxGeometry(1.4, 0.7, 0.2), '#5b6068', -2.4, -2.2, 0.1);
  if (c.type === 'termik') grup.userData.gosterge = ekle(new THREE.BoxGeometry(1.0, 0.5, 0.2), '#2f9e44', 2.3, 0.4, 0.1);
  if (c.type === 'zaman') { ekle(new THREE.CylinderGeometry(0.7, 0.7, 0.4, 20).rotateX(Math.PI / 2), '#3b5bdb', 0, 0.9, 0.2); grup.userData.gosterge = ekle(new THREE.SphereGeometry(0.25, 12, 8), '#4a2a2a', 1.25, 1.9, 0.05); }
  if (c.type === 'sigorta1' || c.type === 'sigorta3') ekle(new THREE.BoxGeometry(Math.min(tip.w - 0.8, 4.4), 1.2, 0.8), '#30343b', 0, 0.6, 0.4);
  if (tip.kapak) {
    const k = ekle(new THREE.CylinderGeometry(1.0, 1.0, 0.8, 24).rotateX(Math.PI / 2), tip.kapak, 0, 0.3, 0.4);
    grup.userData.kapak = k;
  }
  if (c.type === 'lamba') {
    const l = new THREE.Mesh(new THREE.SphereGeometry(1.0, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: '#58b65b', emissive: '#000000', transparent: true, opacity: 0.9 }));
    l.rotation.x = Math.PI / 2; l.position.set(0, 0.3, yuzZ); grup.add(l); grup.userData.lamba = l;
  }
  if (c.type === 'kontaktor' && c.aux) {
    const b = tip.ekBlok;
    const blokMat = new THREE.MeshStandardMaterial({
      map: yaziDokusu(b.w, b.h, (g, W, H) => {
        g.fillStyle = '#cfccc4'; g.fillRect(0, 0, W, H); g.strokeStyle = '#777'; g.lineWidth = 4; g.strokeRect(2, 2, W - 4, H - 4);
        g.fillStyle = GRUP_RENK.yard.zemin; g.fillRect(4, 4, W - 8, H - 8);
        g.textAlign = 'center'; g.textBaseline = 'middle';
        for (const t of tip.ek) {
          const x = (t[1] - b.x + b.w / 2) * PX, y = (b.h / 2 - (t[2] - b.y)) * PX;
          g.fillStyle = 'rgba(0,0,0,0.28)'; g.beginPath(); g.arc(x, y, 0.36 * PX, 0, Math.PI * 2); g.fill();
          g.fillStyle = GRUP_RENK.yard.yazi; g.font = `bold ${0.5 * PX}px system-ui`;
          g.fillText(t[4], x + 0.85 * PX, y);
        }
      }),
    });
    const blok = new THREE.Mesh(new THREE.BoxGeometry(b.w, b.h, 1.6), [yanMat, yanMat, yanMat, yanMat, blokMat, yanMat]);
    blok.position.set(b.x, b.y, yuzZ + 0.8);
    grup.add(blok);
  }
  if (klemensli) {
    grup.userData.uclar = {};
    for (const t of klemensler(c)) {
      const v = new THREE.Mesh(vidaGeo, vidaMat);
      v.position.set(t[1], t[2], yuzZ + (t[3] || 0) + 0.07);
      v.userData.pid = c.id + '.' + t[0];
      v.userData.ad = t[4] || t[0];
      grup.add(v);
      grup.userData.uclar[t[0]] = v;
    }
  }
  return grup;
}

// ---------- malzeme rafı (köşede) ----------
const raf = new THREE.Group();
scene.add(raf);
const RAF_X = 41;
const rafZemin = new THREE.Mesh(new THREE.BoxGeometry(15, 50, 0.6), new THREE.MeshStandardMaterial({ color: '#d7dbe0' }));
rafZemin.position.set(RAF_X + 3.5, 2, -0.3);
raf.add(rafZemin);
const rafBaslik = new THREE.Mesh(new THREE.PlaneGeometry(14, 1.6), new THREE.MeshBasicMaterial({ map: yaziDokusu(14, 1.6, (g, W, H) => { g.fillStyle = '#d7dbe0'; g.fillRect(0, 0, W, H); g.fillStyle = '#1e2329'; g.font = `bold ${0.75 * PX}px system-ui`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('Malzemeler', W / 2, H / 2); }) }));
rafBaslik.position.set(RAF_X + 3.5, 25.8, 0.05);
raf.add(rafBaslik);
const RAF_ADLARI = { ekKontak: 'Ek kontak (1NA+1NK)' };
RAF_SIRASI.forEach((tipAd, i) => {
  const sut = i % 2, sat = Math.floor(i / 2);
  const x = RAF_X + sut * 7, y = 21.6 - sat * 6.7;
  let g;
  if (tipAd === 'ekKontak') {
    g = new THREE.Group();
    const m = new THREE.Mesh(new THREE.BoxGeometry(3, 3.2, 1.4), new THREE.MeshStandardMaterial({ color: '#cfccc4' }));
    m.position.z = 0.7; g.add(m);
    for (const [xx, yy] of [[-0.7, 1], [0.7, 1], [-0.7, -1], [0.7, -1]]) { const v = new THREE.Mesh(vidaGeo, vidaMat); v.position.set(xx, yy, 1.47); g.add(v); }
  } else {
    const tip = TIPLER[tipAd];
    g = malzemeKur({ id: 'raf-' + tipAd, type: tipAd, label: '' }, { klemensli: true });
    g.traverse((o) => { delete o.userData.pid; });
    const s = Math.min(5.8 / tip.w, 4.3 / tip.h, 0.75);
    g.scale.setScalar(s);
    g.position.z = -0.5;
  }
  const kutu = new THREE.Group();
  kutu.position.set(x, y + 0.6, 0);
  kutu.add(g);
  kutu.userData.rafTip = tipAd;
  g.traverse((o) => { o.userData.rafTip = tipAd; });
  const ad = RAF_ADLARI[tipAd] || TIPLER[tipAd].ad;
  const yazi = new THREE.Mesh(new THREE.PlaneGeometry(6.8, 1.5), new THREE.MeshBasicMaterial({ transparent: true, map: yaziDokusu(6.8, 1.5, (gg, W, H) => {
    gg.fillStyle = '#1e2329'; gg.textAlign = 'center'; gg.textBaseline = 'middle'; gg.font = `600 ${0.5 * PX}px system-ui`;
    const kelime = ad.replace(/\(.*\)/, '').trim().split(' ');
    const ek = (ad.match(/\(.*\)/) || [''])[0];
    let s1 = kelime.join(' '), s2 = ek;
    if (gg.measureText(s1).width > W - 6 && kelime.length > 1) { s1 = kelime.slice(0, -1).join(' '); s2 = kelime.slice(-1)[0] + (ek ? ' ' + ek : ''); }
    const sigdir = (t) => { let f = 0.5; gg.font = `600 ${f * PX}px system-ui`; while (gg.measureText(t).width > W - 6 && f > 0.28) { f -= 0.02; gg.font = `600 ${f * PX}px system-ui`; } };
    if (s2) { sigdir(s1); gg.fillText(s1, W / 2, H * 0.3); sigdir(s2); gg.fillText(s2, W / 2, H * 0.74); } else { sigdir(s1); gg.fillText(s1, W / 2, H / 2); }
  }) }));
  yazi.position.set(0, -3.1, 0.1);
  yazi.userData.rafTip = tipAd;
  kutu.add(yazi);
  raf.add(kutu);
});

// ---------- çizim ----------
const malzemeGruplari = new Map();
const kabloGrubu = new THREE.Group();
scene.add(kabloGrubu);

function konumla(grup, c) {
  grup.position.set(c.x, RAYLAR[c.rail], 0);
}
function malzemeCiz(c) {
  const eski = malzemeGruplari.get(c.id);
  if (eski) scene.remove(eski);
  const g = malzemeKur(c);
  konumla(g, c);
  scene.add(g);
  malzemeGruplari.set(c.id, g);
}
function ucKonumu(pid) {
  const [id, t] = pid.split('.');
  const g = malzemeGruplari.get(id);
  if (!g || !g.userData.uclar[t]) return null;
  const v = new THREE.Vector3();
  g.userData.uclar[t].getWorldPosition(v);
  return v;
}
// Kablo yolu: uçtan dışarı (üst sıra yukarı, alt sıra aşağı), raylar arasındaki banda, bant içinde
// kendi şeridinde, gerekirse yan kanaldan öteki banda, oradan hedef uca.
function ucBilgi(pid) {
  const [id, t] = pid.split('.');
  const c = devre.comps.find((x) => x.id === id);
  const k = klemensler(c).find((x) => x[0] === t);
  const yon = k && k[2] >= 0 ? 1 : -1;
  const tip = TIPLER[c.type];
  const yuk = c.type === 'motor' ? tip.kutu.h : tip.h;
  const kenar = RAYLAR[c.rail] + yon * (yuk / 2 + 0.4);
  return { yon, bant: yon > 0 ? c.rail : c.rail + 1, kenar };
}
// Aralık boyama: aynı bantta üst üste gelen aralıklar farklı şeride düşer
function seritAta(istekler, bosluk = 0.5) {
  const sonlar = [];
  istekler.sort((p, q) => p.bas - q.bas || q.son - p.son);
  for (const r of istekler) {
    let k = sonlar.findIndex((e) => e < r.bas - bosluk);
    if (k < 0) { k = sonlar.length; sonlar.push(0); }
    sonlar[k] = r.son;
    r.serit = k;
  }
  return sonlar.length;
}
function seritKonumu(k, n, ust, alt) {
  const bos = ust - alt - 0.3, enAz = 0.3;
  if (n <= 1) return { v: (ust + alt) / 2, kat: 0 };
  const ara = Math.min(0.5, bos / (n - 1));
  if (ara >= enAz) return { v: (ust + alt) / 2 + ((n - 1) * ara) / 2 - k * ara, kat: 0 };
  const sigan = Math.floor(bos / enAz) + 1;
  return { v: ust - 0.15 - (k % sigan) * enAz, kat: Math.floor(k / sigan) };
}
function kabloYollari() {
  const yollar = [];
  const ucSayac = new Map();
  const ucKaydir = (pid) => { const n = ucSayac.get(pid) || 0; ucSayac.set(pid, n + 1); return [0, 0.24, -0.24, 0.48, -0.48][n % 5]; };
  const bantIstek = BANTLAR.map(() => []), yanIstek = { '-1': [], 1: [] };
  const plan = devre.wires.map((w, i) => {
    const a = ucKonumu(w.a), b = ucKonumu(w.b);
    if (!a || !b) return null;
    const A = ucBilgi(w.a), B = ucBilgi(w.b);
    const xa = a.x + ucKaydir(w.a), xb = b.x + ucKaydir(w.b);
    const p = { i, a, b, A, B, xa, xb };
    if (A.bant === B.bant) {
      p.ra = { bas: Math.min(xa, xb), son: Math.max(xa, xb) }; bantIstek[A.bant].push(p.ra);
    } else {
      p.yan = (xa + xb) / 2 < 0 ? -1 : 1;
      const yx = p.yan * YAN.ic;
      p.ra = { bas: Math.min(xa, yx), son: Math.max(xa, yx) }; bantIstek[A.bant].push(p.ra);
      p.rb = { bas: Math.min(xb, yx), son: Math.max(xb, yx) }; bantIstek[B.bant].push(p.rb);
      const ya = (BANTLAR[A.bant].ust + BANTLAR[A.bant].alt) / 2, yb = (BANTLAR[B.bant].ust + BANTLAR[B.bant].alt) / 2;
      p.ry = { bas: Math.min(ya, yb), son: Math.max(ya, yb) }; yanIstek[p.yan].push(p.ry);
    }
    return p;
  });
  const bantN = bantIstek.map((l) => seritAta(l));
  const yanN = { '-1': seritAta(yanIstek['-1'], 0.3), 1: seritAta(yanIstek[1], 0.3) };
  const bantY = (bi, r) => { const k = seritKonumu(r.serit, bantN[bi], BANTLAR[bi].ust, BANTLAR[bi].alt); return { y: k.v, z: KANAL_Z + k.kat * 0.4 }; };
  for (const p of plan) {
    if (!p) { yollar.push(null); continue; }
    const { a, b, A, B, xa, xb } = p;
    const la = bantY(A.bant, p.ra);
    // Uçtan cihaz kenarına çık, orada kanal derinliğine in, sonra şeride git (önden bakınca dik açılı görünür)
    const nok = [a.clone(), new THREE.Vector3(xa, A.kenar, a.z + 0.3), new THREE.Vector3(xa, A.kenar, la.z), new THREE.Vector3(xa, la.y, la.z)];
    let lb = la;
    if (p.yan) {
      const k = seritKonumu(p.ry.serit, yanN[p.yan], YAN.dis, YAN.ic);
      const yx = p.yan * k.v, zz = KANAL_Z + k.kat * 0.4;
      lb = bantY(B.bant, p.rb);
      nok.push(new THREE.Vector3(yx, la.y, zz), new THREE.Vector3(yx, lb.y, zz));
    }
    nok.push(new THREE.Vector3(xb, lb.y, lb.z), new THREE.Vector3(xb, B.kenar, lb.z), new THREE.Vector3(xb, B.kenar, b.z + 0.3), b.clone());
    const yol = new THREE.CurvePath();
    for (let k = 0; k < nok.length - 1; k++) if (nok[k].distanceTo(nok[k + 1]) > 1e-3) yol.add(new THREE.LineCurve3(nok[k], nok[k + 1]));
    yollar.push(yol);
  }
  return yollar;
}
// Sarı-yeşil koruma iletkeni için çizgili doku
const peDoku = (() => {
  const cv = document.createElement('canvas'); cv.width = 64; cv.height = 8;
  const g = cv.getContext('2d');
  g.fillStyle = '#e8c21a'; g.fillRect(0, 0, 64, 8);
  g.fillStyle = '#2f9e44'; g.fillRect(0, 0, 32, 8);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
})();
function kablolariCiz() {
  // Bağlantı değişince tanımı değişen malzemeler (ör. kontaktörün ana/yıldız/üçgen görevi) yeniden çizilir
  if (malzemeGruplari.size) for (const c of tanimlariGuncelle()) if (malzemeGruplari.has(c.id)) malzemeCiz(c);
  kabloGrubu.clear();
  const yollar = kabloYollari();
  devre.wires.forEach((w, i) => {
    const yol = yollar[i];
    if (!yol) return;
    const seciliMi = secili && secili.tur === 'wire' && secili.i === i;
    const parca = Math.max(40, Math.round(yol.getLength() * 3));
    const mat = new THREE.MeshStandardMaterial({ color: w.color === 'sariyesil' ? '#ffffff' : KABLO_RENK[w.color] || '#d02a2a', roughness: 0.55, emissive: seciliMi ? '#ffaa00' : '#000000', emissiveIntensity: 0.7 });
    if (w.color === 'sariyesil') { mat.map = peDoku.clone(); mat.map.needsUpdate = true; mat.map.repeat.set(yol.getLength() / 1.2, 1); }
    const m = new THREE.Mesh(new THREE.TubeGeometry(yol, parca, seciliMi ? 0.24 : 0.14, 8, false), mat);
    m.userData.kablo = i;
    kabloGrubu.add(m);
  });
}
// Otomatik renk açıksa bütün kabloların rengi devredeki görevine göre yeniden verilir
let otoRenk = false;
try { otoRenk = localStorage.getItem('pano-atolyesi-otorenk') === '1'; } catch (e) { /* yok say */ }
function renkleriOtomatikVer() {
  if (!otoRenk || !devre.wires.length) return;
  const ag = renkAglari(devre);
  for (const w of devre.wires) w.color = otomatikRenk(devre, w, ag);
}
function hepsiniCiz() {
  tanimlariGuncelle();
  for (const [, g] of malzemeGruplari) scene.remove(g);
  malzemeGruplari.clear();
  devre.comps.forEach(malzemeCiz);
  kablolariCiz();
  seciliGoster();
  sakla();
}
let cerceve = null;
function seciliGoster() {
  if (cerceve) { cerceve.parent && cerceve.parent.remove(cerceve); cerceve = null; }
  if (secili && secili.tur === 'comp') {
    const c = devre.comps.find((x) => x.id === secili.id);
    const g = malzemeGruplari.get(secili.id);
    if (c && g) {
      const tip = TIPLER[c.type];
      cerceve = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(tip.w + 0.8, tip.h + 0.8, (c.type === 'motor' ? tip.d : tip.d + 0.75) + 0.6)), new THREE.LineBasicMaterial({ color: '#ff9900' }));
      cerceve.position.z = (c.type === 'motor' ? tip.d : tip.d + 0.75) / 2;
      g.add(cerceve);
    }
  }
  const varMi = !!secili;
  $('#sil').disabled = !varMi;
  if (secili && secili.tur === 'comp') { const c = devre.comps.find((x) => x.id === secili.id); c && bilgi(`${c.label} (${TIPLER[c.type].ad}) seçildi. Silmek için Delete tuşu ya da "Seçileni sil".`); }
  if (secili && secili.tur === 'wire') { const w = devre.wires[secili.i]; w && bilgi(`Kablo seçildi: ${aciklama(w.a)} → ${aciklama(w.b)}. Silmek için Delete tuşu ya da "Seçileni sil". Rengi listeden değiştirebilirsin.`); }
}

// ---------- kayıt (tarayıcıda) ----------
function sakla() {
  try { localStorage.setItem('pano-atolyesi-v3', JSON.stringify({ devre, sayac })); } catch (e) { /* saklama yoksa devam */ }
}
function yukle() {
  try {
    const s = JSON.parse(localStorage.getItem('pano-atolyesi-v3') || 'null');
    if (s && s.devre) { devre = s.devre; sayac = s.sayac || 100; }
  } catch (e) { /* yok say */ }
}

// ---------- etiket ----------
function yeniEtiket(type) {
  if (type === 'besleme3f') return TIPLER[type].kod;
  const on = TIPLER[type].on;
  let n = 0;
  for (const c of devre.comps) {
    if (TIPLER[c.type].on !== on || !c.label) continue;
    const m = c.label.match(/(\d+)$/);
    if (m) n = Math.max(n, +m[1]);
  }
  return on === 'X' ? 'X1:' + (n + 1) : on + (n + 1);
}

// ---------- fare ----------
const ray = new THREE.Raycaster();
const fare = new THREE.Vector2();
function fareAyarla(e) {
  const r = renderer.domElement.getBoundingClientRect();
  fare.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
  ray.setFromCamera(fare, camera);
}
function vur(e) {
  fareAyarla(e);
  const hedefler = [...malzemeGruplari.values(), kabloGrubu, raf];
  const hits = ray.intersectObjects(hedefler, true);
  const uc = hits.find((h) => h.object.userData.pid);
  if (uc) return { tur: 'uc', pid: uc.object.userData.pid, ad: uc.object.userData.ad, nesne: uc.object };
  // Vidalar küçük: imlecin 14 piksel yakınındaki en yakın vida seçilir
  const yakin = yakinVida(e);
  if (yakin) return { tur: 'uc', pid: yakin.userData.pid, ad: yakin.userData.ad, nesne: yakin };
  for (const h of hits) {
    let o = h.object;
    if (o.userData.kablo !== undefined) return { tur: 'kablo', i: o.userData.kablo };
    if (o.userData.rafTip) return { tur: 'raf', tip: o.userData.rafTip };
    while (o && o.userData.compId === undefined) o = o.parent;
    if (o) return { tur: 'comp', id: o.userData.compId };
  }
  return null;
}
const YAKALAMA_PX = 14;
function yakinVida(e) {
  const r = renderer.domElement.getBoundingClientRect();
  const v = new THREE.Vector3();
  let enIyi = null, enKisa = YAKALAMA_PX;
  for (const [, g] of malzemeGruplari) {
    if (!g.visible || !g.userData.uclar) continue;
    for (const k in g.userData.uclar) {
      const vida = g.userData.uclar[k];
      vida.getWorldPosition(v).project(camera);
      const x = r.left + ((v.x + 1) / 2) * r.width, y = r.top + ((1 - v.y) / 2) * r.height;
      const d = Math.hypot(x - e.clientX, y - e.clientY);
      if (d < enKisa) { enKisa = d; enIyi = vida; }
    }
  }
  return enIyi;
}
// Fare altındaki vidayı büyüt ve parlat
let isaretli = null;
function vidaIsaretle(vida) {
  if (isaretli === vida) return;
  if (isaretli) { isaretli.scale.setScalar(1); if (isaretli.material === vidaUzerinde) isaretli.material = vidaMat; }
  isaretli = vida;
  if (vida) { vida.scale.setScalar(1.8); if (vida.material === vidaMat) vida.material = vidaUzerinde; }
}
function plakaNoktasi(z = 0) {
  const p = new THREE.Vector3();
  return ray.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 0, 1), -z), p) ? p : null;
}

// yerleşim kontrolü
function yerUygunMu(type, x, rail, haric) {
  const w = TIPLER[type].w;
  if (Math.abs(x - PANO.cx) + w / 2 > YAN.ic - 0.4) return false;
  return !devre.comps.some((c) => c.id !== haric && c.rail === rail && Math.abs(c.x - x) < (w + TIPLER[c.type].w) / 2 + 0.2);
}
function oturtKonum(p) {
  let rail = 0, enIyi = 1e9;
  RAYLAR.forEach((y, i) => { const d = Math.abs(p.y - y); if (d < enIyi) { enIyi = d; rail = i; } });
  return { rail, x: Math.round(p.x * 2) / 2 };
}

let kabloHayalet = null;
const tip = $('#ipucu');

function ipucuGoster(e, metin) {
  if (!metin) { tip.style.display = 'none'; return; }
  tip.textContent = metin; tip.style.display = 'block';
  tip.style.left = e.clientX + 14 + 'px'; tip.style.top = e.clientY + 12 + 'px';
}
function aciklama(pid) {
  const [id, t] = pid.split('.');
  const c = devre.comps.find((x) => x.id === id);
  if (!c) return pid;
  const k = klemensler(c).find((x) => x[0] === t);
  const ad = (k && k[4]) || '';
  const anlam = ucAnlami(c, t);
  return `${c.label} ${ad}${anlam ? ' (' + anlam + ')' : ''}`.replace(/\s+/g, ' ');
}

function hayaletBirak() {
  if (yerlestir && yerlestir.grup) scene.remove(yerlestir.grup);
  if (yerlestir && yerlestir.mevcut) malzemeGruplari.get(yerlestir.mevcut.id).visible = true;
  yerlestir = null;
}
function kabloIptal() {
  if (kabloHayalet) { scene.remove(kabloHayalet); kabloHayalet = null; }
  if (kabloBas) { const g = malzemeGruplari.get(kabloBas.split('.')[0]); g && (g.userData.uclar[kabloBas.split('.')[1]].material = vidaMat); }
  kabloBas = null;
}

function yerlestirmeBaslat(type, e, mevcut = null) {
  hayaletBirak(); kabloIptal();
  if (gorunum !== 'on') gorunumAyarla('on');
  let grup;
  if (type === 'ekKontak') {
    grup = new THREE.Group();
    const m = new THREE.Mesh(new THREE.BoxGeometry(3, 3.2, 1.4), new THREE.MeshStandardMaterial({ color: '#cfccc4', transparent: true, opacity: 0.7 }));
    grup.add(m);
  } else {
    grup = malzemeKur(mevcut || { id: 'hayalet', type, label: yeniEtiket(type) }, { klemensli: false });
    grup.traverse((o) => { if (o.material) { o.material = Array.isArray(o.material) ? o.material.map((m) => { const k = m.clone(); k.transparent = true; k.opacity = 0.6; return k; }) : Object.assign(o.material.clone(), { transparent: true, opacity: 0.6 }); } });
    if (mevcut) malzemeGruplari.get(mevcut.id).visible = false;
  }
  grup.visible = false;
  scene.add(grup);
  yerlestir = { type, mevcut, grup, basX: e.clientX, basY: e.clientY, surukle: true };
}

function yerlestirmeGuncelle(e) {
  fareAyarla(e);
  const g = yerlestir.grup;
  if (yerlestir.type === 'ekKontak') {
    const h = vur(e);
    const c = h && h.tur === 'comp' && devre.comps.find((x) => x.id === h.id);
    const p = plakaNoktasi(10);
    if (p) { g.position.set(p.x, p.y, 10); g.visible = true; }
    yerlestir.hedef = c && c.type === 'kontaktor' && !c.aux ? c : null;
    g.children[0].material.color.set(yerlestir.hedef ? '#7fd17f' : '#cfccc4');
    return;
  }
  const p = plakaNoktasi(0);
  if (!p) return;
  const k = oturtKonum(p);
  const uygun = Math.abs(p.x) < PANO.w / 2 + 2 && yerUygunMu(yerlestir.type, k.x, k.rail, yerlestir.mevcut && yerlestir.mevcut.id);
  g.position.set(k.x, RAYLAR[k.rail], 0.2);
  g.visible = true;
  yerlestir.konum = uygun ? k : null;
  g.traverse((o) => { if (o.material) [].concat(o.material).forEach((m) => m.emissive && m.emissive.set(uygun ? '#003300' : '#660000')); });
}

function yerlestirmeBitir() {
  const y = yerlestir;
  if (y.type === 'ekKontak') {
    if (y.hedef) { y.hedef.aux = true; hayaletBirak(); malzemeCiz(y.hedef); kablolariCiz(); sakla(); bilgi(`${y.hedef.label} üzerine ek kontak bloğu (53-54 NA, 61-62 NK) eklendi.`); return true; }
    return false;
  }
  if (!y.konum) return false;
  if (y.mevcut) { y.mevcut.x = y.konum.x; y.mevcut.rail = y.konum.rail; hayaletBirak(); malzemeCiz(y.mevcut); kablolariCiz(); sakla(); return true; }
  const c = { id: 'c' + sayac++, type: y.type, rail: y.konum.rail, x: y.konum.x, label: yeniEtiket(y.type) };
  devre.comps.push(c);
  hayaletBirak();
  tanimlariGuncelle();
  malzemeCiz(c); sakla();
  bilgi(`${c.label} (${TIPLER[c.type].ad}) panoya yerleşti. Aynı malzemeden bir tane daha için raftan yeniden seç.`);
  return true;
}

// Görünümü kaydırma (ön görünümde boş yerde sol tuşla sürükleme, sağ tuşla sürükleme ya da ok tuşları)
function kaydir(dxPx, dyPx) {
  const h = renderer.domElement.clientHeight;
  const uzak = camera.position.distanceTo(controls.target);
  const birim = (2 * uzak * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2))) / h;
  const sag = new THREE.Vector3().setFromMatrixColumn(camera.matrix, 0);
  const yukari = new THREE.Vector3().setFromMatrixColumn(camera.matrix, 1);
  const d = sag.multiplyScalar(-dxPx * birim).add(yukari.multiplyScalar(dyPx * birim));
  camera.position.add(d); controls.target.add(d);
}
function yakinlas(oran) {
  const yon = camera.position.clone().sub(controls.target).multiplyScalar(oran);
  const uz = yon.length();
  if (uz < controls.minDistance || uz > controls.maxDistance) return;
  camera.position.copy(controls.target).add(yon);
}

let basili = null;
let kaydirma = null;
renderer.domElement.addEventListener('pointerdown', (e) => {
  if (e.button !== 0) return;
  basili = { x: e.clientX, y: e.clientY, h: null };
  if (canli) {
    const h = vur(e);
    if (h && h.tur === 'comp') { canliBas(e); return; }
    if (gorunum === 'on') kaydirma = { x: e.clientX, y: e.clientY };
    return;
  }
  if (yerlestir && !yerlestir.surukle) { if (!yerlestirmeBitir()) bilgi('Buraya yerleşmiyor: başka malzemeyle çakışıyor ya da pano dışında.'); basili = null; return; }
  const h = vur(e);
  basili.h = h;
  if (gorunum !== 'on' && h && h.tur !== 'raf') { basili.h = null; gorunumAyarla('on'); bilgi('Ön görünüme geçildi. Kablo için şimdi bir uca tıkla.'); return; }
  if (h && h.tur === 'raf') { yerlestirmeBaslat(h.tip, e); return; }
  if (!h && gorunum === 'on') kaydirma = { x: e.clientX, y: e.clientY };
});
renderer.domElement.addEventListener('pointermove', (e) => {
  if (kaydirma) {
    const dx = e.clientX - kaydirma.x, dy = e.clientY - kaydirma.y;
    if (dx || dy) { kaydir(dx, dy); kaydirma.x = e.clientX; kaydirma.y = e.clientY; kaydirma.oynadi = kaydirma.oynadi || Math.hypot(e.clientX - basili.x, e.clientY - basili.y) > 4; }
    renderer.domElement.style.cursor = 'grabbing';
    if (kabloBas && kabloHayalet) { const a = ucKonumu(kabloBas); const p = plakaNoktasi(a.z + 1); if (p) kabloHayalet.geometry.setFromPoints([a, p]); }
    return;
  }
  if (yerlestir) { yerlestirmeGuncelle(e); ipucuGoster(e, null); return; }
  if (basili && basili.h && basili.h.tur === 'comp' && !canli && gorunum === 'on' && Math.hypot(e.clientX - basili.x, e.clientY - basili.y) > 6) {
    const c = devre.comps.find((x) => x.id === basili.h.id);
    yerlestirmeBaslat(c.type, e, c);
    basili = null;
    return;
  }
  const h = vur(e);
  if (kabloBas && kabloHayalet) {
    const a = ucKonumu(kabloBas);
    const p = h && h.tur === 'uc' ? ucKonumu(h.pid) : plakaNoktasi(a.z + 1);
    if (p) { kabloHayalet.geometry.setFromPoints([a, p]); }
  }
  renderer.domElement.style.cursor = h && (h.tur === 'uc' || h.tur === 'raf' || (canli && h.tur === 'comp')) ? 'pointer' : h && h.tur === 'comp' ? 'grab' : gorunum === 'on' ? 'grab' : 'default';
  vidaIsaretle(h && h.tur === 'uc' && gorunum === 'on' ? h.nesne : null);
  if (h && h.tur === 'uc') ipucuGoster(e, aciklama(h.pid) + (gorunum === 'on' ? (kabloBas ? ': kabloyu bitirmek için tıkla' : ': kablo başlatmak için tıkla') : ''));
  else if (h && h.tur === 'raf') ipucuGoster(e, (RAF_ADLARI[h.tip] || TIPLER[h.tip].ad) + (h.tip === 'ekKontak' ? ': bir kontaktörün üzerine sürükle' : ': tıkla ya da panoya sürükle'));
  else if (h && h.tur === 'comp' && canli) { const c = devre.comps.find((x) => x.id === h.id); ipucuGoster(e, c.type === 'basla' || c.type === 'dur' ? 'Basılı tut' : c.type === 'termik' ? 'Tıkla: termiği at / kur' : null); }
  else ipucuGoster(e, null);
});
window.addEventListener('pointerup', (e) => {
  if (e.button !== 0) return;
  if (yerlestir && yerlestir.surukle) {
    const oynadi = Math.hypot(e.clientX - yerlestir.basX, e.clientY - yerlestir.basY) > 6;
    if (oynadi) { if (!yerlestirmeBitir()) { hayaletBirak(); bilgi('Bırakılan yer uygun değil: başka malzemeyle çakışıyor ya da pano dışında.'); } }
    else if (yerlestir.mevcut) hayaletBirak();
    else { yerlestir.surukle = false; bilgi(yerlestir.type === 'ekKontak' ? 'Bir kontaktörün üzerine tıkla. Vazgeçmek için Esc.' : 'Panoda bir raya tıkla. Vazgeçmek için Esc.'); }
    basili = null; kaydirma = null; return;
  }
  // Yalnızca pano üzerinde başlayan tıklamalar işlenir; düğmelere tıklamak seçimi bozmaz.
  if (!basili) return;
  const kaydi = kaydirma && kaydirma.oynadi;
  kaydirma = null;
  if (canli) { canliBirak(); basili = null; return; }
  if (kaydi) { basili = null; return; }
  if (!basili.h) { if (kabloBas) kabloIptal(); basili = null; if (secili) { secili = null; kablolariCiz(); seciliGoster(); bilgi('Seçim kaldırıldı.'); } return; }
  const h = basili.h; basili = null;
  if (gorunum !== 'on') return;
  if (h.tur === 'uc') {
    if (!kabloBas) {
      kabloBas = h.pid;
      vidaIsaretle(null);
      h.nesne.material = vidaVurgu;
      kabloHayalet = new THREE.Line(new THREE.BufferGeometry().setFromPoints([ucKonumu(h.pid), ucKonumu(h.pid)]), new THREE.LineDashedMaterial({ color: KABLO_RENK[$('#renk').value], dashSize: 0.6, gapSize: 0.3 }));
      scene.add(kabloHayalet);
      bilgi(`Kablo başladı: ${aciklama(h.pid)}. Bitiş ucuna tıkla. Uzaktaki uca gitmek için boş yerde sürükleyerek kaydırabilirsin.`);
    } else if (kabloBas === h.pid) kabloIptal();
    else {
      const a = kabloBas, b = h.pid;
      const var_ = devre.wires.some((w) => (w.a === a && w.b === b) || (w.a === b && w.b === a));
      kabloIptal();
      if (var_) { bilgi('Bu iki uç zaten bağlı.'); return; }
      const yeni = { a, b, color: $('#renk').value };
      devre.wires.push(yeni);
      renkleriOtomatikVer();
      kablolariCiz(); sakla();
      const bek = beklenenRenk(devre, yeni);
      const uyari = !otoRenk && bek && !bek.renkler.includes(yeni.color) ? ` Dikkat: bu kablo ${bek.neden}; rengi ${bek.renkler.map((r) => KABLO_RENKLERI[r].ad.split(' (')[0].toLowerCase()).join(' ya da ')} olmalı.` : '';
      bilgi(`Kablo: ${aciklama(a)} → ${aciklama(b)} (${KABLO_RENKLERI[yeni.color].ad.split(' (')[0].toLowerCase()}).` + uyari);
    }
    return;
  }
  if (kabloBas) { kabloIptal(); return; }
  if (h.tur === 'kablo') secili = { tur: 'wire', i: h.i };
  else if (h.tur === 'comp') secili = { tur: 'comp', id: h.id };
  kablolariCiz(); seciliGoster();
});
renderer.domElement.addEventListener('contextmenu', (e) => e.preventDefault());

window.addEventListener('keydown', (e) => {
  const yazim = ['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName);
  if (e.key === 'Escape') { hayaletBirak(); kabloIptal(); }
  if ((e.key === 'Delete' || e.key === 'Backspace') && secili && !canli && !yazim) { e.preventDefault(); seciliSil(); }
  const ok = { ArrowLeft: [60, 0], ArrowRight: [-60, 0], ArrowUp: [0, 60], ArrowDown: [0, -60] }[e.key];
  if (ok && !yazim && document.activeElement.tagName !== 'SELECT') { e.preventDefault(); kaydir(ok[0], ok[1]); }
  if ((e.key === '+' || e.key === '=') && !yazim) yakinlas(0.8);
  if (e.key === '-' && !yazim) yakinlas(1.25);
});

function seciliSil() {
  if (!secili) return;
  if (secili.tur === 'wire') devre.wires.splice(secili.i, 1);
  else {
    devre.comps = devre.comps.filter((c) => c.id !== secili.id);
    devre.wires = devre.wires.filter((w) => !w.a.startsWith(secili.id + '.') && !w.b.startsWith(secili.id + '.'));
  }
  const ad = secili.tur === 'wire' ? 'Kablo' : 'Malzeme ve bağlı kabloları';
  secili = null;
  renkleriOtomatikVer();
  hepsiniCiz();
  bilgi(ad + ' silindi.');
}

// ---------- görünüm ----------
let kameraAnim = null;
function onKamera() {
  // Pano ve malzeme rafı ekrana tam sığsın
  const genislik = 92, yukseklik = 54;
  const t = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
  const uzak = Math.max(yukseklik / 2 / t, genislik / 2 / t / camera.aspect);
  return { pos: new THREE.Vector3(7.5, 2, uzak), hedef: new THREE.Vector3(7.5, 2, 0) };
}
function gorunumAyarla(g) {
  gorunum = g;
  const k = g === 'on' ? onKamera() : UC_KAMERA;
  kameraAnim = { t: 0, p0: camera.position.clone(), h0: controls.target.clone(), p1: k.pos.clone(), h1: k.hedef.clone() };
  controls.enableRotate = g !== 'on';
  controls.mouseButtons.LEFT = g === 'on' ? null : THREE.MOUSE.ROTATE;
  $('#gOn').classList.toggle('aktif', g === 'on');
  $('#g3d').classList.toggle('aktif', g !== 'on');
  if (g !== 'on') { hayaletBirak(); kabloIptal(); }
}

// ---------- canlı deneme ----------
function canliBaslat() {
  hayaletBirak(); kabloIptal(); secili = null; seciliGoster();
  canli = { pressed: {}, tripped: {}, elapsed: {}, on: {}, zamanBas: {}, kisa: null };
  $('#canli').classList.add('aktif');
  $('#canli').textContent = 'Canlı denemeyi bitir';
  document.body.classList.add('canli');
  canliHesapla();
}
function canliBitir() {
  canli = null;
  $('#canli').classList.remove('aktif');
  $('#canli').textContent = 'Canlı deneme';
  document.body.classList.remove('canli');
  $('#durum').innerHTML = '';
  for (const [, g] of malzemeGruplari) gorselSifirla(g);
}
function gorselSifirla(g) {
  if (g.userData.gosterge) g.userData.gosterge.material.color.set(g.userData.compId && devre.comps.find((c) => c.id === g.userData.compId)?.type === 'termik' ? '#2f9e44' : '#5b6068');
  if (g.userData.lamba) g.userData.lamba.material.emissive.set('#000000');
  if (g.userData.kapak) g.userData.kapak.position.z = g.userData.kapak.userData.z0 ?? g.userData.kapak.position.z;
}
function canliBas(e) {
  const h = vur(e);
  if (!h || h.tur !== 'comp') return;
  const c = devre.comps.find((x) => x.id === h.id);
  if (c.type === 'basla' || c.type === 'dur') { canli.pressed[c.id] = true; canliHesapla(); }
  if (c.type === 'termik') { canli.tripped[c.id] = !canli.tripped[c.id]; canliHesapla(); }
}
function canliBirak() {
  if (Object.keys(canli.pressed).length) { canli.pressed = {}; canliHesapla(); }
}
function canliHesapla() {
  if (!canli || canli.kisa) return;
  const r = oturt(devre, { pressed: canli.pressed, tripped: canli.tripped, elapsed: canli.elapsed }, canli.on);
  canli.on = r.on;
  const simdi = performance.now();
  for (const c of devre.comps) {
    if (c.type !== 'zaman') continue;
    if (r.on[c.id] && canli.zamanBas[c.id] === undefined) canli.zamanBas[c.id] = simdi;
    if (!r.on[c.id]) { delete canli.zamanBas[c.id]; canli.elapsed[c.id] = false; }
  }
  if (r.kisalar.length) {
    canli.kisa = r.kisalar.join('; ');
    canli.on = {};
  }
  canli.motor = canli.kisa ? { tip: 'durdu' } : motorDurumu(devre, r.ag);
  canli.yanlis = r.yanlis;
  canli.salinim = r.salinim;
  canliGorsel();
}
function canliGorsel() {
  const satir = [];
  for (const c of devre.comps) {
    const g = malzemeGruplari.get(c.id);
    if (!g) continue;
    const on = !!canli.on[c.id];
    if (c.type === 'kontaktor') { g.userData.gosterge.material.color.set(on ? '#2fbf4a' : '#5b6068'); satir.push(`<b>${c.label}</b> ${on ? 'çekili' : 'bırakık'}`); }
    if (c.type === 'zaman') {
      const bas = canli.zamanBas[c.id];
      const kalan = bas !== undefined ? Math.max(0, TIPLER.zaman.sure - (performance.now() - bas) / 1000) : null;
      g.userData.gosterge.material.color.set(on ? (canli.elapsed[c.id] ? '#ff9f1a' : '#e03131') : '#4a2a2a');
      satir.push(`<b>${c.label}</b> ${on ? (canli.elapsed[c.id] ? 'süre doldu' : 'sayıyor ' + kalan.toFixed(1) + ' s') : 'enerjisiz'}`);
    }
    if (c.type === 'lamba') g.userData.lamba.material.emissive.set(on ? '#3cff3c' : '#000000');
    if (c.type === 'termik') g.userData.gosterge.material.color.set(canli.tripped[c.id] ? '#e03131' : '#2f9e44');
    if (g.userData.kapak) {
      const k = g.userData.kapak;
      if (k.userData.z0 === undefined) k.userData.z0 = k.position.z;
      k.position.z = k.userData.z0 - (canli.pressed[c.id] ? 0.5 : 0);
    }
  }
  const m = canli.motor;
  let html = `<div class="motor ${m.tip}">Motor: ${motorAdi(m.tip)}${m.neden ? ' · ' + m.neden : ''}</div>` + satir.join(' · ');
  if (canli.kisa) html = `<div class="kisa">KISA DEVRE: ${canli.kisa}. Benzetim durdu; devreyi düzeltip canlı denemeyi yeniden başlat.</div>` + html;
  if (canli.yanlis.length) html += `<div class="kisa">Yanlış gerilim: ${canli.yanlis.map((id) => devre.comps.find((c) => c.id === id).label).join(', ')}</div>`;
  if (canli.salinim) html += '<div class="kisa">Devre kararlı değil (kontaktörler sürekli açıp kapanıyor).</div>';
  $('#durum').innerHTML = html;
}

// ---------- kontrol ----------
function kontrolGoster() {
  if (!devre.comps.length) { bilgi('Panoda malzeme yok.'); return; }
  const s = kontrolEt(devre);
  const gecen = s.filter((x) => x.ok).length;
  $('#sonucIcerik').innerHTML = `<p class="ozet">${s.length} kontrolün ${gecen} tanesi geçti.</p>` +
    s.map((x) => `<div class="kontrol ${x.ok ? 'ok' : 'hata'}"><div class="kb">${x.ok ? '✓' : '✗'} ${x.baslik}</div><div class="ka">${x.ayrinti.replace(/</g, '&lt;').replace(/\n/g, '<br>')}</div></div>`).join('');
  $('#sonuc').hidden = false;
}

// ---------- arayüz ----------
function bilgi(m) { $('#bilgi').textContent = m; }
$('#gOn').onclick = () => gorunumAyarla('on');
$('#g3d').onclick = () => gorunumAyarla('3d');
$('#sil').onclick = seciliSil;
$('#geri').onclick = () => { if (devre.wires.length) { devre.wires.pop(); secili = null; renkleriOtomatikVer(); kablolariCiz(); sakla(); } };
$('#renk').innerHTML = Object.entries(KABLO_RENKLERI).map(([k, v]) => `<option value="${k}"${k === 'kirmizi' ? ' selected' : ''}>${v.ad}</option>`).join('');
$('#otoRenk').checked = otoRenk;
function otoRenkGoster() { $('#renk').disabled = otoRenk; $('#renkEtiket').textContent = otoRenk ? 'Kablo (otomatik)' : 'Kablo'; }
otoRenkGoster();
$('#otoRenk').onchange = () => {
  otoRenk = $('#otoRenk').checked;
  try { localStorage.setItem('pano-atolyesi-otorenk', otoRenk ? '1' : '0'); } catch (e) { /* yok say */ }
  otoRenkGoster();
  if (otoRenk) { renkleriOtomatikVer(); kablolariCiz(); sakla(); bilgi('Otomatik renk açık: kablo renkleri devredeki görevine göre verilir (TS EN IEC 60445, TS EN 60204-1).'); }
  else bilgi('Otomatik renk kapalı: kablo rengini listeden sen seçersin; kontrol yanlış renkleri gösterir.');
  $('#otoRenk').blur();
};
$('#temizle').onclick = () => { if (confirm('Panodaki bütün malzeme ve kablolar silinsin mi?')) { if (canli) canliBitir(); kabloIptal(); hayaletBirak(); devre = { comps: [], wires: [] }; secili = null; hepsiniCiz(); } };
$('#ornek').onclick = () => { if (devre.comps.length && !confirm('Panodaki devre silinip hazır örnek yüklensin mi?')) return; if (canli) canliBitir(); kabloIptal(); hayaletBirak(); devre = ornekDevre(); sayac = 100; secili = null; hepsiniCiz(); bilgi('Hazır doğru yıldız üçgen devresi yüklendi.'); };
$('#canli').onclick = () => (canli ? canliBitir() : canliBaslat());
$('#kontrol').onclick = kontrolGoster;
$('#yontemAc').onclick = () => { $('#yontem').hidden = false; };
$('#rehberAc').onclick = () => { $('#rehber').hidden = false; };
document.querySelectorAll('[data-kapat]').forEach((b) => (b.onclick = () => { b.closest('.pencere').hidden = true; }));
$('#renk').onchange = () => { if (secili && secili.tur === 'wire' && !otoRenk) { devre.wires[secili.i].color = $('#renk').value; kablolariCiz(); sakla(); } $('#renk').blur(); };
$('#zArti').onclick = () => yakinlas(0.8);
$('#zEksi').onclick = () => yakinlas(1.25);
$('#zSigdir').onclick = () => gorunumAyarla(gorunum);
document.querySelectorAll('[data-kaydir]').forEach((b) => { const [x, y] = b.dataset.kaydir.split(',').map(Number); b.onclick = () => kaydir(x, y); });
document.querySelectorAll('.surum').forEach((x) => (x.textContent = 'v' + SURUM));

function boyutla() {
  const w = kap.clientWidth, h = kap.clientHeight;
  renderer.setSize(w, h);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', boyutla);
new ResizeObserver(boyutla).observe(kap);
boyutla();
{ const k = onKamera(); camera.position.copy(k.pos); controls.target.copy(k.hedef); controls.update(); }

yukle();
hepsiniCiz();

let sonCanli = 0;
renderer.setAnimationLoop((t) => {
  if (kameraAnim) {
    kameraAnim.t = Math.min(1, kameraAnim.t + 0.05);
    const s = kameraAnim.t * kameraAnim.t * (3 - 2 * kameraAnim.t);
    camera.position.lerpVectors(kameraAnim.p0, kameraAnim.p1, s);
    controls.target.lerpVectors(kameraAnim.h0, kameraAnim.h1, s);
    if (kameraAnim.t >= 1) kameraAnim = null;
  }
  controls.update();
  if (canli && !canli.kisa) {
    let degisti = false;
    for (const id in canli.zamanBas) {
      if (!canli.elapsed[id] && (t - canli.zamanBas[id]) / 1000 >= TIPLER.zaman.sure) { canli.elapsed[id] = true; degisti = true; }
    }
    if (degisti) canliHesapla();
    else if (t - sonCanli > 100) { sonCanli = t; canliGorsel(); }
    const motorG = [...malzemeGruplari.values()].find((g) => g.userData.pervane);
    if (motorG && canli.motor) motorG.userData.pervane.rotation.x += canli.motor.tip === 'yildiz' ? 0.12 : canli.motor.tip === 'ucgen' ? 0.35 : 0;
  }
  renderer.render(scene, camera);
});

// Otomatik testler için (yalnızca adres ?test içerirse)
if (location.search.includes('test')) {
  window.__pano = {
    ekrana(pid) { const v = ucKonumu(pid).project(camera); const r = renderer.domElement.getBoundingClientRect(); return { x: r.left + (v.x + 1) / 2 * r.width, y: r.top + (1 - v.y) / 2 * r.height }; },
    malzemeEkrana(id, dy = 0) { const g = malzemeGruplari.get(id); const v = new THREE.Vector3(); g.getWorldPosition(v); v.y += dy; v.z += 9; v.project(camera); const r = renderer.domElement.getBoundingClientRect(); return { x: r.left + (v.x + 1) / 2 * r.width, y: r.top + (1 - v.y) / 2 * r.height }; },
    rafEkrana(tip) { const k = raf.children.find((c) => c.userData.rafTip === tip); const v = new THREE.Vector3(); k.getWorldPosition(v); v.project(camera); const r = renderer.domElement.getBoundingClientRect(); return { x: r.left + (v.x + 1) / 2 * r.width, y: r.top + (1 - v.y) / 2 * r.height }; },
    plakaEkrana(x, y) { const v = new THREE.Vector3(x, y, 0).project(camera); const r = renderer.domElement.getBoundingClientRect(); return { x: r.left + (v.x + 1) / 2 * r.width, y: r.top + (1 - v.y) / 2 * r.height }; },
    devre: () => devre,
    durum: () => ({ yerlestir: yerlestir && { type: yerlestir.type, surukle: yerlestir.surukle, mevcut: yerlestir.mevcut && yerlestir.mevcut.id }, gorunur: [...malzemeGruplari].filter(([, g]) => !g.visible).map(([id]) => id) }),
    canli: () => canli && { on: canli.on, motor: canli.motor, kisa: canli.kisa },
  };
}
