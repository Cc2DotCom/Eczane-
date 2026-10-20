# Nöbetçi

O gün nöbetçi olan eczaneleri konuma göre sıralayan, en yakını öne çıkaran Expo (React Native) uygulaması. iOS ve Android.

## Çalıştırma

```bash
npm install
npx expo start        # Expo Go ile QR'ı okut
```

Uygulama nöbet listesini bu reponun `api/duty/<il>.json` dosyalarından okur. Liste olmayan bir il seçilirse "yakında" ekranı çıkar. Arayüzü sahte veriyle denemek için `.env` dosyasına `EXPO_PUBLIC_DEMO=1` yaz.

## Nöbet listesi nereden geliyor (ücretsiz, anahtarsız)

Veri, Sağlık Bakanlığı'nın resmi hizmetinden gelir: e-Devlet'teki **TİTCK Nöbetçi Eczane Sorgulama** (giriş gerektirmez). `.github/workflows/update-duty.yml` her sabah Türkiye saatiyle 09:15'te çalışır ve `scripts/update-duty.mjs` ile 81 ilin o günkü nöbetçi eczanelerini adres, telefon, nöbet saatleri ve konumlarıyla birlikte `api/duty/<il>.json` dosyalarına yazar. Gün içinde 12:15, 16:15 ve 19:15'te yalnızca alınamayan ya da listesi henüz girilmemiş iller tekrar denenir.
- Bazı illerin listesi resmi kaynağa geç giriliyor ya da hiç girilmiyor; bu iller `unavailable: true` olarak işaretlenir ve uygulama "liste yok" ekranı gösterir.

- Eczane konumları hizmetin "Haritada Göster" sayfasından alınır ve `data/coords.json`'da saklanır; her eczanenin konumu yalnızca ilk görüldüğünde çekilir, böylece resmi sunucuya her gün binlerce istek atılmaz.
- Elle çalıştırmak için: **Actions → Nöbet listesini güncelle → Run workflow**.
- Bir il alınamazsa önceki dosyası kalır; uygulama listenin eski olduğunu tarihinden anlar ve kullanıcıya gitmeden önce aramasını önerir.
- e-Devlet sayfasının yapısı değişirse görev kırmızıya döner; `parseRows` ve `parseMap` fonksiyonlarının güncellenmesi gerekir.

## Nasıl çalışır

- **Konum → il/ilçe:** `expo-location` ile konum alınır, ters geocode ile il ve ilçe bulunur. İzin yoksa il elle seçilir (ilçe isteğe bağlı).
- **Veri:** `src/data/repository.ts` → `api/duty/<il>.json`. Konum varsa ildeki tüm nöbetçiler mesafeye göre sıralanır, yoksa seçilen ilçeye göre süzülür. İnternet yoksa son liste gösterilir.
- **Nöbet günü:** 09:00'da değişir (`src/utils/duty.ts`); gece bakan kişi o gecenin nöbetçisini görür. Kartta eczanenin resmi nöbet saatleri de yazar.
- **Canlılık:** Uygulamaya dönüldüğünde, her 10 dakikada bir ve aşağı çekince yenilenir.
- **Tercih:** En yakın eczane büyük kartta durur; listeden başka birine dokununca kart ona geçer ("En yakına dön" ile geri). Yıldızlanan eczaneler kalıcıdır; favorin nöbetçiyse üstte haber verilir.
- **Eylemler:** "Yol tarifi" Apple/Google Haritalar'ı, "Ara" telefonu açar.

## Yapı

```
App.tsx                     ana ekran
src/components/             HeroCard, PharmacyRow, CityPicker, States, motion (FadeIn, PressableScale, Pulse, Shimmer)
src/data/                   repository (liste + önbellek), demo, cities
scripts/update-duty.mjs     e-Devlet'ten 81 ilin listesini çeken görev
data/coords.json            eczane konumları önbelleği (otomatik)
api/                        illerin nöbet listeleri (otomatik güncellenir)
src/hooks/                  useUserLocation, useDutyPharmacies, usePreferences
src/theme.ts                açık/koyu yumuşak palet
```
