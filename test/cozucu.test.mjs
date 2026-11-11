import { kontrolEt, gorevler } from '../src/cozucu.js';
import { ornekDevre } from '../src/ornek.js';

let hata = 0;
const bekle = (ad, kosul) => { console.log((kosul ? 'GEÇTİ ' : 'KALDI ') + ad); if (!kosul) hata++; };
const sonucu = (d, baslik) => kontrolEt(d).find((x) => x.baslik === baslik);
const kopya = () => JSON.parse(JSON.stringify(ornekDevre()));
const sil = (d, a, b) => { d.wires = d.wires.filter((w) => !((w.a === a && w.b === b) || (w.a === b && w.b === a))); };

// 1. Doğru devre: bütün kontroller geçmeli
const d0 = ornekDevre();
const g = gorevler(d0);
bekle('görevler: ana KM1, yıldız KM2, üçgen KM3', g.ana[0] === 'c5' && g.yildiz[0] === 'c6' && g.ucgen[0] === 'c7');
const s0 = kontrolEt(d0);
for (const s of s0) bekle('doğru devre: ' + s.baslik, s.ok);
if (s0.some((s) => !s.ok)) console.log(s0);

// 2. Yıldız yolundaki üçgen NK kontağı köprülenirse kilitleme eksik olmalı
const d1 = kopya();
sil(d1, 'c8.16', 'c7.21'); sil(d1, 'c7.22', 'c6.A1');
d1.wires.push({ a: 'c8.16', b: 'c6.A1' });
bekle('kilitleme eksik: yakalandı', !sonucu(d1, 'Karşılıklı kilitleme').ok);

// 3. Her iki kilit de yok ve zaman rölesi yerine iki bobin aynı yerden beslenirse aynı anda çekme
const d2 = kopya();
sil(d2, 'c8.16', 'c7.21'); sil(d2, 'c7.22', 'c6.A1'); sil(d2, 'c8.18', 'c6.21'); sil(d2, 'c6.22', 'c7.A1');
d2.wires.push({ a: 'c8.15', b: 'c6.A1' }, { a: 'c8.15', b: 'c7.A1' });
bekle('aynı anda çekme: yakalandı', !sonucu(d2, 'Yıldız ve üçgen aynı anda çekmez').ok);
bekle('aynı anda çekme: kısa devre de yakalandı', !sonucu(d2, 'Kısa devre').ok);

// 4. Fazlar arası doğrudan kablo: kısa devre
const d3 = kopya();
d3.wires.push({ a: 'c3.2', b: 'c3.4' });
bekle('L1-L2 kısa devre: yakalandı', !sonucu(d3, 'Kısa devre').ok);

// 5. Mühürleme kontağı yoksa başlat bırakılınca durur
const d4 = kopya();
sil(d4, 'c10.12', 'c5.13');
bekle('mühürleme eksik: çalışma sırası hatası', !sonucu(d4, 'Çalışma sırası').ok);

// 6. Termik 95-96 kumanda yolunda değilse
const d5 = kopya();
sil(d5, 'c4.2', 'c9.95'); sil(d5, 'c9.96', 'c10.11');
d5.wires.push({ a: 'c4.2', b: 'c10.11' });
bekle('termik devre dışı: yakalandı', !sonucu(d5, 'Termik koruması').ok);

// 7. Üçgende iki faz yer değiştirirse dönüş yönü uyarısı
const d6 = kopya();
sil(d6, 'c7.2', 'c13.W2'); sil(d6, 'c7.4', 'c13.U2');
d6.wires.push({ a: 'c7.2', b: 'c13.U2' }, { a: 'c7.4', b: 'c13.W2' });
const m6 = sonucu(d6, 'Motor bağlantısı');
bekle('üçgende yanlış uç: motor bağlantısı hatası', !m6.ok);

// 8. Renk: nötr kablosu kırmızı olursa renk hatası
const d7 = kopya();
d7.wires.find((w) => w.a === 'c1.N').color = 'kirmizi';
const r7 = sonucu(d7, 'Kablo renkleri (TS EN IEC 60445, TS EN 60204-1)');
bekle('nötr kırmızı: renk hatası yakalandı', !r7.ok && r7.ayrinti.includes('mavi'));

// 9. Renk: L1 kablosu gri olursa
const d8 = kopya();
d8.wires.find((w) => w.a === 'c1.L1').color = 'gri';
bekle('L1 gri: renk hatası yakalandı', !sonucu(d8, 'Kablo renkleri (TS EN IEC 60445, TS EN 60204-1)').ok);

// 10. Renk: kumanda kablosu kahverengi olursa
const d9 = kopya();
d9.wires.find((w) => w.a === 'c10.12' && w.b === 'c11.13').color = 'kahve';
bekle('kumanda kahverengi: renk hatası yakalandı', !sonucu(d9, 'Kablo renkleri (TS EN IEC 60445, TS EN 60204-1)').ok);

// 11. PE bağlı değilse
const d10 = kopya();
sil(d10, 'c1.PE', 'c13.PE');
bekle('PE bağlı değil: yakalandı', !sonucu(d10, 'Koruma iletkeni (PE)').ok);

// 12. PE fazla birleşirse kısa devre
const d11 = kopya();
d11.wires.push({ a: 'c1.PE', b: 'c3.2', color: 'sariyesil' });
bekle('PE ile L1 birleşti: kısa devre yakalandı', !sonucu(d11, 'Kısa devre').ok);

// 13. Bobin iki faz arasına bağlanırsa yanlış gerilim
const d12 = kopya();
sil(d12, 'c1.N', 'c5.A2');
d12.wires.push({ a: 'c5.A2', b: 'c1.L2', color: 'siyah' });
const r12 = kontrolEt(d12);
bekle('bobin L1-L2 arasında: yanlış gerilim yakalandı', r12.some((x) => x.baslik === 'Bobin ve lamba gerilimi' && !x.ok));

// 14. L1'den kumanda sigortasına giden kablo kahverengi, sigorta çıkışı kırmızı olmalı
const d13 = kopya();
d13.wires.find((w) => w.a === 'c4.2').color = 'kahve';
bekle('kumanda sigortası çıkışı kahverengi: renk hatası', !sonucu(d13, 'Kablo renkleri (TS EN IEC 60445, TS EN 60204-1)').ok);

// 15. Otomatik renk doğru devrenin renklerini aynen verir
import('../src/cozucu.js').then(({ otomatikRenk, renkAglari }) => {
  const d = ornekDevre(); const ag = renkAglari(d);
  const farkli = d.wires.filter((w) => otomatikRenk(d, { ...w, color: 'kirmizi' }, ag) !== w.color && !(['kahve', 'siyah', 'gri'].includes(w.color)));
  bekle('otomatik renk: N, PE ve kumanda kabloları doğru', farkli.length === 0);
  if (farkli.length) console.log(farkli);
  console.log(hata ? `\n${hata} test kaldı` : '\nBütün testler geçti');
  process.exit(hata ? 1 : 0);
});
