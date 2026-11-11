// Kural tabanlı devre çözücü. Yapay zekâ modeli kullanılmaz.
// Devre: { comps: [{id, type, aux}], wires: [{a: 'id.klemens', b: 'id.klemens'}] }
// Durum: { cont: {id: çekili mi}, tact: {zamanId: kontak konum değiştirdi mi},
//          pressed: {butonId: basılı mı}, tripped: {termikId: attı mı} }

import { TIPLER, klemensler, KABLO_RENKLERI, FAZ_RENGI } from './malzemeler.js';

const FAZLAR = ['L1', 'L2', 'L3'];

function iletkenler(c, st) {
  const p = [];
  const on = !!st.cont[c.id];
  switch (c.type) {
    case 'sigorta1': p.push(['1', '2']); break;
    case 'sigorta3': p.push(['1', '2'], ['3', '4'], ['5', '6']); break;
    case 'klemens': p.push(['a', 'b']); break;
    case 'kontaktor':
      if (on) {
        p.push(['1', '2'], ['3', '4'], ['5', '6'], ['13', '14']);
        if (c.aux) p.push(['53', '54']);
      } else {
        p.push(['21', '22']);
        if (c.aux) p.push(['61', '62']);
      }
      break;
    case 'termik':
      p.push(['1', '2'], ['3', '4'], ['5', '6']);
      p.push(st.tripped[c.id] ? ['97', '98'] : ['95', '96']);
      break;
    case 'zaman':
      p.push(st.tact[c.id] ? ['15', '18'] : ['15', '16']);
      break;
    case 'basla': if (st.pressed[c.id]) p.push(['13', '14']); break;
    case 'dur': if (!st.pressed[c.id]) p.push(['11', '12']); break;
  }
  return p;
}

// Bağlantı ağları (net): kablolar ve o anda kapalı kontaklar birleştirilir.
export function aglar(devre, st) {
  const ana = new Map();
  const bul = (x) => {
    if (!ana.has(x)) ana.set(x, x);
    let r = x;
    while (ana.get(r) !== r) r = ana.get(r);
    while (ana.get(x) !== r) { const n = ana.get(x); ana.set(x, r); x = n; }
    return r;
  };
  const birles = (a, b) => { const ra = bul(a), rb = bul(b); if (ra !== rb) ana.set(ra, rb); };
  for (const w of devre.wires) birles(w.a, w.b);
  for (const c of devre.comps) for (const [x, y] of iletkenler(c, st)) birles(c.id + '.' + x, c.id + '.' + y);
  const kaynaklar = new Map();
  for (const c of devre.comps) {
    const k = TIPLER[c.type].kaynak;
    if (!k) continue;
    for (const t in k) {
      const r = bul(c.id + '.' + t);
      if (!kaynaklar.has(r)) kaynaklar.set(r, new Set());
      kaynaklar.get(r).add(k[t]);
    }
  }
  const kaynakOf = (p) => kaynaklar.get(bul(p)) || new Set();
  const kisalar = [];
  for (const [, s] of kaynaklar) if (s.size > 1) kisalar.push([...s].sort().join(' ile '));
  return { bul, kaynakOf, kisalar };
}

// Yük (bobin, lamba) enerjili mi? Kumanda faz-nötr arası çalışır: bir ucu bir faz (L1, L2, L3), öteki ucu N görmeli.
function yukDurumu(c, ag) {
  const [a, b] = TIPLER[c.type].yuk;
  const sa = ag.kaynakOf(c.id + '.' + a), sb = ag.kaynakOf(c.id + '.' + b);
  const faz = (s) => s.size === 1 && FAZLAR.includes([...s][0]);
  const notr = (s) => s.size === 1 && s.has('N');
  const ok = (faz(sa) && notr(sb)) || (notr(sa) && faz(sb));
  let yanlis = false;
  if (!ok && sa.size && sb.size) {
    const hepsi = new Set([...sa, ...sb]);
    if (hepsi.size > 1) yanlis = true;
  }
  return { enerjili: ok, yanlis };
}

// Kontaktör ve zaman rölesi bobinleri kararlı hale gelene kadar yeniden hesaplanır.
// girdi: { pressed, tripped, elapsed: {zamanId: süre doldu mu} }, bas: başlangıç bobin durumları
export function oturt(devre, girdi, bas = {}) {
  const on = { ...bas };
  const kisalar = new Set(), yanlis = new Set();
  const anlar = []; // her ara adımdaki bobin durumları (aynı anda çekme denetimi için)
  let ag, salinim = false;
  for (let i = 0; i < 40; i++) {
    const tact = {};
    for (const c of devre.comps) if (c.type === 'zaman') tact[c.id] = !!(on[c.id] && girdi.elapsed[c.id]);
    ag = aglar(devre, { cont: on, tact, pressed: girdi.pressed, tripped: girdi.tripped });
    ag.kisalar.forEach((k) => kisalar.add(k));
    let degisti = false;
    for (const c of devre.comps) {
      if (!TIPLER[c.type].yuk) continue;
      const y = yukDurumu(c, ag);
      if (y.yanlis) yanlis.add(c.id);
      if (!!on[c.id] !== y.enerjili) { on[c.id] = y.enerjili; degisti = true; }
    }
    anlar.push({ ...on });
    if (!degisti) break;
    if (i === 39) salinim = true;
  }
  for (const c of devre.comps) if (c.type === 'zaman' && !on[c.id]) girdi.elapsed[c.id] = false;
  return { on, ag, kisalar: [...kisalar], yanlis: [...yanlis], salinim, anlar };
}

// Güç devresinden kontaktör görevlerini bulur: ana, yıldız, üçgen.
export function gorevler(devre) {
  const ag = aglar(devre, { cont: {}, tact: {}, pressed: {}, tripped: {} });
  const motor = devre.comps.find((c) => c.type === 'motor');
  const sonuc = { ana: [], yildiz: [], ucgen: [] };
  if (!motor) return sonuc;
  const m = (t) => ag.bul(motor.id + '.' + t);
  const bas1 = new Set(['U1', 'V1', 'W1'].map(m)), son2 = new Set(['U2', 'V2', 'W2'].map(m));
  for (const c of devre.comps.filter((x) => x.type === 'kontaktor')) {
    const n = (t) => ag.bul(c.id + '.' + t);
    const giris = ['1', '3', '5'].map(n), cikis = ['2', '4', '6'].map(n);
    const kopru = (arr) => arr[0] === arr[1] && arr[1] === arr[2] && ag.kaynakOf(c.id + '.' + (arr === giris ? '1' : '2')).size === 0;
    if ((kopru(cikis) && giris.every((x) => son2.has(x))) || (kopru(giris) && cikis.every((x) => son2.has(x)))) {
      sonuc.yildiz.push(c.id); continue;
    }
    const ucgenKutup = [0, 1, 2].every((i) => (bas1.has(giris[i]) && son2.has(cikis[i])) || (son2.has(giris[i]) && bas1.has(cikis[i])));
    if (ucgenKutup) { sonuc.ucgen.push(c.id); continue; }
    const fazli = giris.some((x, i) => FAZLAR.some((f) => ag.kaynakOf(c.id + '.' + ['1', '3', '5'][i]).has(f)));
    if (fazli) sonuc.ana.push(c.id);
  }
  return sonuc;
}

// Motorun o anki bağlantısı: durdu, yildiz, ucgen ya da hatali
export function motorDurumu(devre, ag) {
  const motor = devre.comps.find((c) => c.type === 'motor');
  if (!motor) return { tip: 'yok' };
  const faz = {}, net = {};
  let yabanci = false;
  for (const t of ['U1', 'V1', 'W1', 'U2', 'V2', 'W2']) {
    const s = [...ag.kaynakOf(motor.id + '.' + t)];
    const f = s.filter((x) => FAZLAR.includes(x));
    if (s.length !== f.length || f.length > 1) yabanci = true;
    faz[t] = f[0] || null;
    net[t] = ag.bul(motor.id + '.' + t);
  }
  if (yabanci) return { tip: 'hatali', neden: 'Motor uçlarında kumanda gerilimi ya da birden çok faz var.' };
  const hepsiBos = Object.values(faz).every((x) => !x);
  if (hepsiBos) return { tip: 'durdu' };
  const b = [faz.U1, faz.V1, faz.W1];
  const farkli = b.every(Boolean) && new Set(b).size === 3;
  const yildizNoktasi = net.U2 === net.V2 && net.V2 === net.W2 && !faz.U2;
  if (farkli && yildizNoktasi) return { tip: 'yildiz', sira: b.join('-') };
  const sargilar = [['U1', 'U2'], ['V1', 'V2'], ['W1', 'W2']];
  if (farkli && sargilar.every(([x, y]) => faz[y] && faz[x] !== faz[y])) return { tip: 'ucgen', sira: b.join('-') };
  return { tip: 'hatali', neden: 'Sargılar ne yıldız ne üçgen bağlı; eksik faz ya da yanlış uç bağlantısı var.' };
}

// Karşılıklı kilitleme: biri çekiliyken öteki hiçbir buton, zaman ve kontaktör
// kombinasyonunda enerji alamamalı.
function kilitliMi(devre, kilitleyen, kilitlenen) {
  const serbest = [];
  for (const c of devre.comps) {
    if (c.type === 'basla' || c.type === 'dur') serbest.push(['pressed', c.id]);
    else if (c.type === 'zaman') serbest.push(['tact', c.id]);
    else if (c.type === 'kontaktor' && c.id !== kilitleyen) serbest.push(['cont', c.id]);
  }
  const n = Math.min(serbest.length, 14);
  const kilitlenenC = devre.comps.find((c) => c.id === kilitlenen);
  for (let m = 0; m < 1 << n; m++) {
    const st = { cont: { [kilitleyen]: true }, tact: {}, pressed: {}, tripped: {} };
    serbest.slice(0, n).forEach(([k, id], i) => { st[k][id] = !!(m & (1 << i)); });
    const ag = aglar(devre, st);
    if (yukDurumu(kilitlenenC, ag).enerjili) return false;
  }
  return true;
}

// ---------- Kablo renk kuralı ----------
// TS EN IEC 60445: L1 kahverengi, L2 siyah, L3 gri, N mavi, PE sarı-yeşil. TS EN 60204-1: AC kumanda kırmızı.
// Kablonun bağlı olduğu ağa bakılır: ağda hangi kaynak varsa o rengi taşımalıdır.
function ucGrubu(devre, pid) {
  const [id, t] = pid.split('.');
  const c = devre.comps.find((x) => x.id === id);
  if (!c) return null;
  const k = klemensler(c).find((x) => x[0] === t);
  return { c, t, grup: k ? k[5] : null };
}
// Güç kablosunun hangi faz kutbunda olduğu (otomatik renk için ipucu)
function kutupIpucu(devre, pid) {
  const u = ucGrubu(devre, pid);
  if (!u) return null;
  if (u.c.type === 'motor') return { U: 'kahve', V: 'siyah', W: 'gri' }[u.t[0]] || null;
  if (['kontaktor', 'termik', 'sigorta3'].includes(u.c.type)) return { 1: 'kahve', 2: 'kahve', 3: 'siyah', 4: 'siyah', 5: 'gri', 6: 'gri' }[u.t] || null;
  return null;
}
export function renkAglari(devre) {
  const sabit = aglar(devre, { cont: {}, tact: {}, pressed: {}, tripped: {} });
  const g = gorevler(devre);
  const anaKapali = aglar(devre, { cont: Object.fromEntries(g.ana.map((id) => [id, true])), tact: {}, pressed: {}, tripped: {} });
  return { sabit, anaKapali };
}
// Döner: { renkler: [izin verilen renkler], neden }
export function beklenenRenk(devre, w, ag = renkAglari(devre)) {
  const ua = ucGrubu(devre, w.a), ub = ucGrubu(devre, w.b);
  if ((ua && ua.grup === 'pe') || (ub && ub.grup === 'pe')) return { renkler: ['sariyesil'], neden: 'koruma iletkeni (PE)' };
  const s1 = ag.sabit.kaynakOf(w.a), s2 = ag.anaKapali.kaynakOf(w.a);
  if (s1.size > 1 || s2.size > 1) return null; // kısa devre varsa renk denetlenmez
  if (s1.has('PE')) return { renkler: ['sariyesil'], neden: 'koruma iletkeni (PE)' };
  if (s1.has('N')) return { renkler: ['mavi'], neden: 'nötr (N)' };
  // Kumanda devresi: kumanda sigortasının çıkışından sonrası ya da bobin, yardımcı kontak, buton, lamba uçları
  const kumanda = [ua, ub].some((u) => u && (u.grup === 'bobin' || u.grup === 'yard' || (u.c.type === 'sigorta1' && u.t === '2')));
  const faz = [...s1, ...s2].find((x) => FAZ_RENGI[x]);
  if (kumanda) return { renkler: ['kirmizi'], neden: 'kumanda devresi' + (faz ? ' (' + faz + '-N)' : '') };
  if (faz) return { renkler: [FAZ_RENGI[faz]], neden: 'güç devresi ' + faz };
  const guc = [ua, ub].some((u) => u && (u.grup === 'guc' || u.grup === 'motor'));
  if (guc) return { renkler: ['kahve', 'siyah', 'gri'], neden: 'güç devresi', ipucu: kutupIpucu(devre, w.a) || kutupIpucu(devre, w.b) };
  return { renkler: ['kirmizi'], neden: 'kumanda devresi' };
}
export function otomatikRenk(devre, w, ag) {
  const b = beklenenRenk(devre, w, ag);
  if (!b) return w.color;
  if (b.renkler.length === 1) return b.renkler[0];
  return b.renkler.includes(w.color) ? w.color : b.ipucu || b.renkler[0];
}
export function ucAdi(devre, pid) {
  const u = ucGrubu(devre, pid);
  if (!u) return pid;
  const k = klemensler(u.c).find((x) => x[0] === u.t);
  return `${u.c.label} ${(k && k[4]) || (u.t === 'a' ? 'üst' : u.t === 'b' ? 'alt' : u.t)}`;
}

export function kontrolEt(devre) {
  const sonuc = [];
  const ekle = (baslik, ok, ayrinti) => sonuc.push({ baslik, ok, ayrinti });
  const say = (t) => devre.comps.filter((c) => c.type === t).length;
  const ad = (id) => (devre.comps.find((c) => c.id === id) || {}).label || id;

  // 1. Malzeme
  const gerekli = [['besleme3f', 1], ['sigorta1', 1], ['kontaktor', 3], ['termik', 1], ['zaman', 1], ['basla', 1], ['dur', 1], ['motor', 1]];
  const eksik = gerekli.filter(([t, n]) => say(t) < n).map(([t, n]) => `${TIPLER[t].ad} (en az ${n})`);
  ekle('Malzeme listesi', eksik.length === 0, eksik.length ? 'Eksik: ' + eksik.join(', ') : 'Yıldız üçgen için gereken malzemeler panoda.');

  // 2. Kontaktör görevleri
  const g = gorevler(devre);
  const gorevOk = g.ana.length >= 1 && g.yildiz.length === 1 && g.ucgen.length === 1;
  ekle('Güç devresi: kontaktör görevleri', gorevOk,
    `Ana: ${g.ana.map(ad).join(', ') || 'bulunamadı'}; Yıldız: ${g.yildiz.map(ad).join(', ') || 'bulunamadı'}; Üçgen: ${g.ucgen.map(ad).join(', ') || 'bulunamadı'}. ` +
    'Yıldız kontaktörü motorun U2-V2-W2 uçlarını köprüler; üçgen kontaktörü U1-W2, V1-U2, W1-V2 uçlarını birleştirir.');
  const Y = g.yildiz[0], D = g.ucgen[0], A = g.ana;

  // 3. Karşılıklı kilitleme
  if (Y && D) {
    const yk = kilitliMi(devre, D, Y), dk = kilitliMi(devre, Y, D);
    ekle('Karşılıklı kilitleme', yk && dk,
      (yk ? '' : `${ad(D)} çekiliyken ${ad(Y)} bobini enerji alabiliyor; ${ad(Y)} bobin yoluna ${ad(D)} NK kontağı (21-22) konmalı. `) +
      (dk ? '' : `${ad(Y)} çekiliyken ${ad(D)} bobini enerji alabiliyor; ${ad(D)} bobin yoluna ${ad(Y)} NK kontağı (21-22) konmalı.`) ||
      'Yıldız ve üçgen bobinleri birbirinin NK kontağı üzerinden besleniyor.');
  } else ekle('Karşılıklı kilitleme', false, 'Yıldız ve üçgen kontaktörleri bulunamadığı için denetlenemedi.');

  // 4. Çalışma sırası benzetimi
  const basla = devre.comps.filter((c) => c.type === 'basla').map((c) => c.id);
  const dur = devre.comps.filter((c) => c.type === 'dur').map((c) => c.id);
  const termikler = devre.comps.filter((c) => c.type === 'termik').map((c) => c.id);
  const zamanlar = devre.comps.filter((c) => c.type === 'zaman').map((c) => c.id);
  const bas = (ids) => Object.fromEntries(ids.map((i) => [i, true]));
  const girdi = { pressed: {}, tripped: {}, elapsed: {} };
  const kisalar = new Set(), yanlis = new Set();
  let ayniAnda = false, salinim = false;
  const adimlar = [];
  let on = {};
  const adim = (isim, p, beklenen) => {
    girdi.pressed = p.pressed || {};
    girdi.tripped = p.tripped || {};
    if (p.sureDoldu) for (const z of zamanlar) if (on[z]) girdi.elapsed[z] = true;
    const r = oturt(devre, girdi, on);
    on = r.on;
    r.kisalar.forEach((k) => kisalar.add(k));
    r.yanlis.forEach((k) => yanlis.add(k));
    if (r.salinim) salinim = true;
    if (Y && D && (r.anlar.some((a) => a[Y] && a[D]) || (on[Y] && on[D]))) ayniAnda = true;
    const motor = motorDurumu(devre, r.ag);
    const anaCekili = A.some((x) => on[x]);
    const gercek = { ana: anaCekili, y: !!(Y && on[Y]), d: !!(D && on[D]), motor: motor.tip };
    const ok = !beklenen || (gercek.ana === beklenen.ana && gercek.y === beklenen.y && gercek.d === beklenen.d && gercek.motor === beklenen.motor);
    adimlar.push({ isim, ok, gercek, motor });
    return motor;
  };
  const kapali = { ana: false, y: false, d: false, motor: 'durdu' };
  adim('Başlangıç', {}, kapali);
  const m1 = adim('Başlat butonuna basıldı', { pressed: bas(basla) }, { ana: true, y: true, d: false, motor: 'yildiz' });
  adim('Başlat bırakıldı (mühürleme)', {}, { ana: true, y: true, d: false, motor: 'yildiz' });
  const m3 = adim('Zaman rölesinin süresi doldu', { sureDoldu: true }, { ana: true, y: false, d: true, motor: 'ucgen' });
  adim('Durdur butonuna basıldı', { pressed: bas(dur) }, kapali);
  adim('Durdur bırakıldı', {}, kapali);
  adim('Yeniden başlatıldı', { pressed: bas(basla) }, null);
  adim('Başlat bırakıldı', {}, null);
  const termikAdim = adimlar.length;
  adim('Termik attı', { tripped: bas(termikler) }, kapali);

  ekle('Kısa devre', kisalar.size === 0,
    kisalar.size ? 'Doğrudan birleşen kaynaklar: ' + [...kisalar].join('; ') + '. Kaynak uçları arasında yük olmadan bağlantı var.' : 'Hiçbir adımda kaynak uçları doğrudan birleşmedi.');
  ekle('Yıldız ve üçgen aynı anda çekmez', !ayniAnda,
    ayniAnda ? 'Benzetimin en az bir adımında yıldız ve üçgen kontaktörleri birlikte çekili.' : 'Benzetimin hiçbir adımında ikisi birlikte çekili olmadı.');
  if (yanlis.size) ekle('Bobin ve lamba gerilimi', false, [...yanlis].map(ad).join(', ') + ' faz-nötr arası dışında bir gerilime bağlı (ör. iki faz arası ya da PE).');
  if (salinim) ekle('Kararlılık', false, 'Devre kararlı bir duruma oturmuyor (kontaktörler sürekli açıp kapanıyor).');

  const sirali = adimlar.slice(0, 6);
  ekle('Çalışma sırası', sirali.every((a) => a.ok),
    sirali.map((a) => `${a.ok ? '✓' : '✗'} ${a.isim}: ana ${a.gercek.ana ? 'çekili' : 'bırakık'}, yıldız ${a.gercek.y ? 'çekili' : 'bırakık'}, üçgen ${a.gercek.d ? 'çekili' : 'bırakık'}, motor ${motorAdi(a.gercek.motor)}`).join('\n'));
  const t = adimlar[termikAdim];
  ekle('Termik koruması', termikler.length > 0 && t.ok, termikler.length ? (t.ok ? 'Termik atınca bütün kontaktörler bırakıyor.' : 'Termik atınca devre durmuyor; 95-96 NK kontağı kumanda yolunda olmalı.') : 'Termik röle yok.');
  const yon = m1.tip === 'yildiz' && m3.tip === 'ucgen';
  ekle('Motor bağlantısı', yon && m1.sira === m3.sira,
    !yon ? `Başlatınca motor ${motorAdi(m1.tip)}, süre dolunca ${motorAdi(m3.tip)}.${m1.neden ? ' ' + m1.neden : ''}${m3.neden ? ' ' + m3.neden : ''}`
      : m1.sira === m3.sira ? `Yıldızda ve üçgende U1-V1-W1 faz sırası aynı (${m1.sira}); dönüş yönü değişmiyor.`
        : `Faz sırası yıldızda ${m1.sira}, üçgende ${m3.sira}; geçişte dönüş yönü değişir.`);

  // Koruma iletkeni: motor gövdesi PE'ye bağlı olmalı
  const motor = devre.comps.find((c) => c.type === 'motor');
  if (motor) {
    const pe = aglar(devre, { cont: {}, tact: {}, pressed: {}, tripped: {} }).kaynakOf(motor.id + '.PE');
    ekle('Koruma iletkeni (PE)', pe.has('PE') && pe.size === 1,
      pe.has('PE') && pe.size === 1 ? `${motor.label} PE ucu beslemenin PE ucuna bağlı.` : pe.size > 1 ? `${motor.label} PE ucu ${[...pe].filter((x) => x !== 'PE').join(', ')} ile birleşmiş.` : `${motor.label} PE ucu bağlı değil; motor gövdesi koruma iletkenine bağlanmalı.`);
  }

  // Kablo renkleri
  const rAg = renkAglari(devre);
  const yanlisRenk = [];
  devre.wires.forEach((w) => {
    const b = beklenenRenk(devre, w, rAg);
    if (b && !b.renkler.includes(w.color)) yanlisRenk.push(`${ucAdi(devre, w.a)} → ${ucAdi(devre, w.b)}: ${KABLO_RENKLERI[w.color] ? KABLO_RENKLERI[w.color].ad.split(' (')[0].toLowerCase() : w.color}, olması gereken ${b.renkler.map((r) => KABLO_RENKLERI[r].ad.split(' (')[0].toLowerCase()).join(' ya da ')} (${b.neden})`);
  });
  ekle('Kablo renkleri (TS EN IEC 60445, TS EN 60204-1)', yanlisRenk.length === 0,
    yanlisRenk.length ? `${yanlisRenk.length} kablonun rengi yanlış:\n` + yanlisRenk.join('\n') : 'Bütün kabloların rengi devredeki görevine uygun.');
  return sonuc;
}

export function motorAdi(t) {
  return { durdu: 'duruyor', yildiz: 'yıldız', ucgen: 'üçgen', hatali: 'hatalı bağlı', yok: 'yok' }[t] || t;
}
