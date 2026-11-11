// Malzeme tanımları. Ölçüler pano biriminde (1 birim yaklaşık 10 mm).
// terms: [klemens kimliği, x, y, z (öne çıkıklık), ekranda yazan ad, grup]
// grup: 'guc' güç devresi, 'bobin' kumanda beslemesi, 'yard' yardımcı kontak, 'kaynak', 'motor', 'klemens'
//
// Klemens adları (üretici belgeleriyle doğrulandı, kaynaklar durum notunda):
// Kontaktör: güç 1/L1-2/T1, 3/L2-4/T2, 5/L3-6/T3; bobin A1-A2; yardımcı 13-14 NA, 21-22 NK;
//   ön yardımcı kontak bloğu 53-54 NA, 61-62 NK.
// Termik: güç 1/L1, 3/L2, 5/L3 giriş, 2/T1, 4/T2, 6/T3 çıkış; 95-96 NK, 97-98 NA.
// Zaman rölesi: besleme A1-A2; 15 ortak, 16 NK, 18 NA.
// Lamba X1-X2. Motor klemens kutusu: U1 V1 W1 üstte, W2 U2 V2 altta, PE ucu.
// PE ucu yalnızca gerçekte PE bağlantısı olan malzemelerde: üç faz besleme, motor.
// Kumanda devresi L1 ve N'den, kumanda sigortası üzerinden beslenir (ayrı kumanda kaynağı yok).
// Kodlar (Alp'in kararı): KM kontaktör, KT zaman rölesi, F sigorta, FR termik, S buton, H lamba, M motor, X klemens.
// Buton kontakları: START 13-14 (NA), STOP 11-12 (NK) (Alp'in onayı, EN 50013).

// Kablo renkleri: TS EN IEC 60445:2021 + A1:2026 (L1 kahverengi, L2 siyah, L3 gri, N mavi, PE sarı-yeşil)
// ve TS EN 60204-1:2018 + A1:2025 (AC kumanda devresi kırmızı).
export const KABLO_RENKLERI = {
  kahve: { ad: 'Kahverengi (L1)', renk: '#7b4a26' },
  siyah: { ad: 'Siyah (L2)', renk: '#1f1f1f' },
  gri: { ad: 'Gri (L3)', renk: '#8e9196' },
  mavi: { ad: 'Mavi (N)', renk: '#2f6fd6' },
  kirmizi: { ad: 'Kırmızı (kumanda fazı)', renk: '#d02a2a' },
  sariyesil: { ad: 'Sarı-yeşil (PE)', renk: '#7fbf2a' },
};
export const FAZ_RENGI = { L1: 'kahve', L2: 'siyah', L3: 'gri' };

const ust = 4.1, alt = -4.1;

export const GRUP_RENK = {
  guc: { zemin: 'rgba(120,128,140,0.20)', yazi: '#1e2329' },
  bobin: { zemin: 'rgba(230,140,30,0.25)', yazi: '#9a4d00' },
  yard: { zemin: 'rgba(40,110,210,0.20)', yazi: '#164f9e' },
  pe: { zemin: 'rgba(110,170,30,0.30)', yazi: '#3d6b00' },
};

export const TIPLER = {
  besleme3f: {
    ad: 'Üç faz besleme', kod: '3F', on: 'L', w: 7.4, h: 5.6, d: 3, renk: '#3d4a5c',
    terms: [['L1', -2.8, -1.8, 0, 'L1', 'kaynak'], ['L2', -1.4, -1.8, 0, 'L2', 'kaynak'], ['L3', 0, -1.8, 0, 'L3', 'kaynak'], ['N', 1.4, -1.8, 0, 'N', 'kaynak'], ['PE', 2.8, -1.8, 0, 'PE', 'pe']],
    kaynak: { L1: 'L1', L2: 'L2', L3: 'L3', N: 'N', PE: 'PE' },
  },
  sigorta3: {
    ad: 'Sigorta (3 kutup)', on: 'F', w: 6, h: 10, d: 7, renk: '#e9e6df',
    terms: [['1', -1.8, ust, 0, '1', 'guc'], ['3', 0, ust, 0, '3', 'guc'], ['5', 1.8, ust, 0, '5', 'guc'],
      ['2', -1.8, alt, 0, '2', 'guc'], ['4', 0, alt, 0, '4', 'guc'], ['6', 1.8, alt, 0, '6', 'guc']],
  },
  sigorta1: {
    ad: 'Sigorta (1 kutup)', on: 'F', w: 2.2, h: 10, d: 7, renk: '#e9e6df',
    terms: [['1', 0, ust, 0, '1', 'guc'], ['2', 0, alt, 0, '2', 'guc']],
  },
  kontaktor: {
    ad: 'Kontaktör', on: 'KM', w: 7.8, h: 10, d: 9, renk: '#d9d6cf', yuk: ['A1', 'A2'],
    terms: [
      ['A1', -3.3, ust, 0, 'A1', 'bobin'],
      ['1', -1.8, ust, 0, '1/L1', 'guc'], ['3', -0.6, ust, 0, '3/L2', 'guc'], ['5', 0.6, ust, 0, '5/L3', 'guc'],
      ['13', 2.1, ust, 0, '13', 'yard'], ['21', 3.3, ust, 0, '21', 'yard'],
      ['A2', -3.3, alt, 0, 'A2', 'bobin'],
      ['2', -1.8, alt, 0, '2/T1', 'guc'], ['4', -0.6, alt, 0, '4/T2', 'guc'], ['6', 0.6, alt, 0, '6/T3', 'guc'],
      ['14', 2.1, alt, 0, '14', 'yard'], ['22', 3.3, alt, 0, '22', 'yard'],
    ],
    // Sürüklenerek eklenen ön yardımcı kontak bloğu (1 NA + 1 NK)
    ek: [['53', -0.4, 1.0, 1.6, '53', 'yard'], ['61', 1.6, 1.0, 1.6, '61', 'yard'], ['54', -0.4, -1.0, 1.6, '54', 'yard'], ['62', 1.6, -1.0, 1.6, '62', 'yard']],
    ekBlok: { x: 0.6, y: 0, w: 4, h: 3.6 },
  },
  termik: {
    ad: 'Termik röle', on: 'FR', w: 7, h: 8, d: 8, renk: '#d9d6cf',
    terms: [
      ['1', -2.4, 3.1, 0, '1/L1', 'guc'], ['3', -1.2, 3.1, 0, '3/L2', 'guc'], ['5', 0, 3.1, 0, '5/L3', 'guc'],
      ['95', 1.7, 3.1, 0, '95', 'yard'], ['97', 2.9, 3.1, 0, '97', 'yard'],
      ['2', -2.4, -3.1, 0, '2/T1', 'guc'], ['4', -1.2, -3.1, 0, '4/T2', 'guc'], ['6', 0, -3.1, 0, '6/T3', 'guc'],
      ['96', 1.7, -3.1, 0, '96', 'yard'], ['98', 2.9, -3.1, 0, '98', 'yard'],
    ],
  },
  zaman: {
    ad: 'Zaman rölesi (çekmede gecikmeli)', on: 'KT', w: 3.8, h: 10, d: 7, renk: '#e9e6df', yuk: ['A1', 'A2'],
    terms: [['A1', -1.1, ust, 0, 'A1', 'bobin'], ['15', 1.1, ust, 0, '15', 'yard'],
      ['A2', -1.25, alt, 0, 'A2', 'bobin'], ['16', 0, alt, 0, '16', 'yard'], ['18', 1.25, alt, 0, '18', 'yard']],
    sure: 3,
  },
  basla: {
    ad: 'Başlat butonu (NA)', on: 'S', w: 3.4, h: 5.6, d: 5, renk: '#2b2f36',
    terms: [['13', -0.9, -2.1, 0, '13', 'yard'], ['14', 0.9, -2.1, 0, '14', 'yard']], kapak: '#2f9e44',
  },
  dur: {
    ad: 'Durdur butonu (NK)', on: 'S', w: 3.4, h: 5.6, d: 5, renk: '#2b2f36',
    terms: [['11', -0.9, -2.1, 0, '11', 'yard'], ['12', 0.9, -2.1, 0, '12', 'yard']], kapak: '#d63c3c',
  },
  lamba: {
    ad: 'Sinyal lambası', on: 'H', w: 3.4, h: 5.6, d: 5, renk: '#2b2f36', yuk: ['X1', 'X2'],
    terms: [['X1', -0.9, -2.1, 0, 'X1', 'bobin'], ['X2', 0.9, -2.1, 0, 'X2', 'bobin']],
  },
  motor: {
    ad: 'Asenkron motor', on: 'M', w: 10, h: 8, d: 8, renk: '#4a6178', kutu: { w: 7.6, h: 4.4 },
    // Klemens kutusunda altı sargı ucu ve bir koruma iletkeni (PE) ucu
    terms: [['U1', -2.6, 1.1, 0, 'U1', 'motor'], ['V1', -1.0, 1.1, 0, 'V1', 'motor'], ['W1', 0.6, 1.1, 0, 'W1', 'motor'],
      ['W2', -2.6, -1.1, 0, 'W2', 'motor'], ['U2', -1.0, -1.1, 0, 'U2', 'motor'], ['V2', 0.6, -1.1, 0, 'V2', 'motor'],
      ['PE', 2.5, 0, 0, 'PE', 'pe']],
  },
  klemens: {
    ad: 'Klemens', on: 'X', w: 1.6, h: 6, d: 5, renk: '#8a9099',
    terms: [['a', 0, 2.2, 0, '', 'klemens'], ['b', 0, -2.2, 0, '', 'klemens']],
  },
};

export const RAF_SIRASI = ['besleme3f', 'sigorta3', 'sigorta1', 'kontaktor', 'termik', 'zaman', 'basla', 'dur', 'lamba', 'motor', 'klemens', 'ekKontak'];

export function klemensler(c) {
  const t = TIPLER[c.type];
  return c.aux && t.ek ? t.terms.concat(t.ek) : t.terms;
}

// Ucun ne işe yaradığı (fare üzerine gelince gösterilir)
export function ucAnlami(c, t) {
  const tip = c.type;
  if (tip === 'kontaktor' || tip === 'termik') {
    const guc = { 1: 'güç girişi L1', 3: 'güç girişi L2', 5: 'güç girişi L3', 2: 'güç çıkışı T1', 4: 'güç çıkışı T2', 6: 'güç çıkışı T3' };
    if (guc[t]) return guc[t];
  }
  if (tip === 'sigorta3' || tip === 'sigorta1') return +t % 2 ? 'giriş' : 'çıkış';
  if (tip === 'basla') return 'NA kontak';
  if (tip === 'dur') return 'NK kontak';
  if (tip === 'lamba') return 'lamba beslemesi';
  if (tip === 'klemens') return t === 'a' ? 'üst uç' : 'alt uç';
  return { A1: 'bobin beslemesi', A2: 'bobin beslemesi', 13: 'yardımcı NA', 14: 'yardımcı NA', 21: 'yardımcı NK', 22: 'yardımcı NK',
    53: 'ek yardımcı NA', 54: 'ek yardımcı NA', 61: 'ek yardımcı NK', 62: 'ek yardımcı NK', 95: 'termik NK', 96: 'termik NK',
    97: 'termik NA', 98: 'termik NA', 15: 'ortak', 16: 'NK, gecikmeli açar', 18: 'NA, gecikmeli kapar',
    L1: 'faz', L2: 'faz', L3: 'faz', L: 'kumanda fazı', N: 'nötr', PE: 'koruma iletkeni' }[t] || '';
}

// Etiketleri yerleştirme sırasına göre ver: K1, K2, F1, S1 ...
export function etiketle(comps) {
  const say = {};
  for (const c of comps) {
    const on = TIPLER[c.type].on;
    if (c.type === 'besleme3f') { c.label = TIPLER[c.type].kod; continue; }
    say[on] = (say[on] || 0) + 1;
    c.label = on === 'X' ? 'X1:' + say[on] : on + say[on];
  }
}
