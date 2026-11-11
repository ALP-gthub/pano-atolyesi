# Pano Atölyesi

Tarayıcıda çalışan, interaktif bir kumanda devresi eğitim ve sınav seti. İlk konu: **yıldız üçgen yol verme**.

**Canlı sayfa:** https://alp-gthub.github.io/pano-atolyesi/

Katılımcı 3D montaj panosuna malzemeleri yerleştirir, klemens vidalarına tıklayarak kablo çeker, devreyi canlı olarak dener ve kural tabanlı bir çözücüyle kontrol eder. Kurulum gerekmez; masaüstü bilgisayarda fare ile kullanılır.

## Neler var

- 3D montaj panosu, DIN rayları ve kablo kanalları; ön görünüm ve 3D görünüm.
- Malzeme rafı: üç faz besleme (L1 L2 L3 N PE), sigorta (1 ve 3 kutup), kontaktör, termik röle, zaman rölesi (çekmede gecikmeli), START ve STOP butonları, sinyal lambası, asenkron motor, klemens, ön yardımcı kontak bloğu.
- Gerçek klemens adları: kontaktörde 1/L1-2/T1, 3/L2-4/T2, 5/L3-6/T3, A1-A2, 13-14, 21-22; termikte 95-96, 97-98; zaman rölesinde 15, 16, 18; motorda U1 V1 W1, W2 U2 V2 ve PE.
- Malzeme kodları: KM kontaktör, KT zaman rölesi, F sigorta, FR termik, S buton, H lamba, M motor, X klemens.
- Kablo renkleri TS EN IEC 60445 ve TS EN 60204-1'e göre: L1 kahverengi, L2 siyah, L3 gri, N mavi, PE sarı-yeşil, kumanda devresi kırmızı. İstenirse renk otomatik verilir.
- Canlı deneme: butonlara basılır, termik attırılır, zaman rölesi saydıktan sonra yıldızdan üçgene geçiş izlenir.
- Devre kontrolü: malzeme listesi, kontaktör görevleri (ana, yıldız, üçgen), karşılıklı kilitleme, kısa devre, yıldız ve üçgenin aynı anda çekmesi, çalışma sırası, termik koruması, motor bağlantısı ve dönüş yönü, koruma iletkeni, kablo renkleri.

Denetim yapay zekâ modeliyle değil, açıkça yazılmış kurallarla yapılır. Ayrıntılar uygulamadaki "Yöntem" bölümündedir.

## Kullanım amacı

Eğitim ve alıştırma içindir. Gerçek bir pano tasarımı, montajı ya da devreye alma için kullanılmaz; gerçek uygulamada yürürlükteki standartlara uygun proje ve yetkili kişinin denetimi gerekir.

## Geliştirme

Gerekenler: Node.js 20 ya da üstü.

```
npm ci
npm test        # kural tabanlı çözücü testleri
npm run derle   # dist/index.html: three.js dahil tek dosya
```

`dist/index.html` tek başına çalışır; internet olmayan bir salonda dosyayı bilgisayarlara kopyalayıp tarayıcıda açmak yeterlidir.

Klasörler:

- `src/malzemeler.js`: malzeme tanımları, klemens adları, kablo renkleri
- `src/cozucu.js`: kural tabanlı devre çözücü ve kontroller
- `src/sahne.js`: three.js sahnesi, malzeme rafı, kablo çekme, canlı deneme
- `src/ornek.js`: hazır doğru yıldız üçgen devresi
- `test/cozucu.test.mjs`: çözücü testleri
- `sablon.html`, `derle.mjs`: tek dosyalık sayfayı üretir

Her `main` güncellemesinde GitHub Actions testleri çalıştırır, sayfayı derler ve GitHub Pages'e yayınlar.

## Öneri ve hata bildirimi

Fikirlerinizi ve gördüğünüz hataları [Issues](https://github.com/ALP-gthub/pano-atolyesi/issues) bölümüne yazabilirsiniz.

## Lisans

MIT. Ayrıntı için `LICENSE` dosyasına bakınız.

## Yazar

ALP ATA
