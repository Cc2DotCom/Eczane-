# Nöbetçi

O gün nöbetçi olan eczaneleri konuma göre sıralayan, en yakını öne çıkaran Expo (React Native) uygulaması. iOS ve Android.

## Çalıştırma

```bash
npm install
npx expo start        # Expo Go ile QR'ı okut
```

Uygulama nöbet listesini bu reponun `api/duty/<il>.json` dosyalarından okur. Liste olmayan bir il seçilirse "yakında" ekranı çıkar. Arayüzü sahte veriyle denemek için `.env` dosyasına `EXPO_PUBLIC_DEMO=1` yaz.

## Nöbet listesi nasıl güncellenir (ücretsiz)

`.github/workflows/update-duty.yml` her sabah Türkiye saatiyle 09:05'te çalışır, `scripts/update-duty.mjs` ile CollectAPI'den listeyi çeker ve `api/` klasörüne kaydeder. Uygulama bu dosyaları okuduğu için kullanıcı sayısı API kotasını etkilemez.

1. collectapi.com'a ücretsiz kayıt ol, "Nöbetçi Eczane" API'sine abone ol ve anahtarını kopyala.
2. GitHub'da repo sayfasında **Settings → Secrets and variables → Actions → New repository secret**. Ad: `COLLECTAPI_KEY`, değer: anahtar.
3. **Actions → Nöbet listesini güncelle → Run workflow** ile ilk listeyi hemen oluştur.
4. Yeni il eklemek için `api/cities.json` içindeki listeye ilin adını yaz. Her il ayda yaklaşık 30 istek harcar.

Bugünün listesi gelmezse uygulama eski listeyi uyarıyla gösterir; kullanıcıya gitmeden önce eczaneyi aramasını önerir.

## Nasıl çalışır

- **Konum → il/ilçe:** `expo-location` ile konum alınır, ters geocode ile il ve ilçe bulunur. İzin yoksa il elle seçilir (ilçe isteğe bağlı).
- **Veri:** `src/data/repository.ts` → `api/duty/<il>.json`. Konum varsa ildeki tüm nöbetçiler mesafeye göre sıralanır, yoksa seçilen ilçeye göre süzülür. İnternet yoksa son liste gösterilir.
- **Nöbet günü:** 08:30'da değişir kabul edilir (`src/utils/duty.ts`); gece bakan kişi önceki günün nöbetçisini görür.
- **Canlılık:** Uygulamaya dönüldüğünde, her 10 dakikada bir ve aşağı çekince yenilenir.
- **Tercih:** En yakın eczane büyük kartta durur; listeden başka birine dokununca kart ona geçer ("En yakına dön" ile geri). Yıldızlanan eczaneler kalıcıdır; favorin nöbetçiyse üstte haber verilir.
- **Eylemler:** "Yol tarifi" Apple/Google Haritalar'ı, "Ara" telefonu açar.

## Yapı

```
App.tsx                     ana ekran
src/components/             HeroCard, PharmacyRow, CityPicker, States, motion (FadeIn, PressableScale, Pulse, Shimmer)
src/data/                   repository (liste + önbellek), demo, cities
scripts/update-duty.mjs     CollectAPI'den listeyi çeken görev
api/                        illerin nöbet listeleri (otomatik güncellenir)
src/hooks/                  useUserLocation, useDutyPharmacies, usePreferences
src/theme.ts                açık/koyu yumuşak palet
```
