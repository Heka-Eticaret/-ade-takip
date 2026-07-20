# İade Takip Sistemi

İki veya daha fazla personelin internet üzerinden ortak kullanabileceği iade operasyon uygulaması.

## Özellikler

- Kullanıcı adı ve şifre ile giriş
- Müşteri adı, ürün, adet ve not ile yeni iade girişi
- Kargo durumu: **Bekleniyor / Geldi / Gelmedi**
- Kontrol sonucu: **Kontrol Bekliyor / Onaylandı / Reddedildi**
- İadeyi giren, teslim alan ve kontrol eden personelin otomatik kaydı
- Her değişikliğin tarih, saat ve kullanıcı bilgisiyle işlem geçmişine yazılması
- Müşteri ve ürün arama
- Durum filtreleri
- CSV dışa aktarma
- İki kullanıcının ekranında değişikliklerin anlık yenilenmesi
- Yönetici rolü için kayıt silme yetkisi
- Mobil, tablet ve masaüstü uyumlu arayüz

## Kullanılan teknoloji

- Next.js
- Supabase PostgreSQL
- Supabase Auth
- Supabase Realtime
- Vercel

## İş akışı

1. İade kaydı oluşturulur ve kargo durumu otomatik olarak **Bekleniyor** olur.
2. Kargoyu takip eden kişi **Geldi** veya **Gelmedi** durumunu seçer.
3. İade yalnızca **Geldi** durumundaysa **Onaylandı** veya **Reddedildi** olarak işaretlenebilir.
4. İşlemi yapan kullanıcı ve işlem zamanı veritabanına otomatik kaydedilir.
5. Geliş durumu sonradan **Gelmedi** veya **Bekleniyor** yapılırsa daha önce verilmiş kontrol kararı otomatik sıfırlanır.

---

# Kurulum

## 1. Supabase projesi oluşturun

Supabase hesabınızdan yeni bir proje oluşturun.

## 2. Veritabanını kurun

Supabase panelinde:

1. **SQL Editor** bölümünü açın.
2. `supabase/schema.sql` dosyasının tamamını yapıştırın.
3. **Run** düğmesine basın.

Bu işlem tabloları, güvenlik politikalarını, işlem geçmişini ve canlı güncellemeyi kurar.

## 3. Supabase anahtarlarını alın

Supabase panelinde **Project Settings > API** alanından aşağıdaki değerleri alın:

- Project URL
- Anon / Publishable Key
- Service Role Key

> `Service Role Key` yüksek yetkilidir. Yalnızca bilgisayarınızda kullanıcı oluştururken kullanın. Tarayıcı koduna, GitHub'a veya Vercel'e eklemeyin.

## 4. Ortam değişkenlerini hazırlayın

`.env.example` dosyasını `.env.local` adıyla kopyalayın:

```env
NEXT_PUBLIC_SUPABASE_URL=https://PROJE_KODUNUZ.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=SUPABASE_ANON_KEY
NEXT_PUBLIC_LOGIN_DOMAIN=iade.local
SUPABASE_SERVICE_ROLE_KEY=SUPABASE_SERVICE_ROLE_KEY
```

`NEXT_PUBLIC_LOGIN_DOMAIN` hem uygulamada hem kullanıcı oluşturma komutunda aynı kalmalıdır.

## 5. Paketleri kurun

```bash
npm install
```

## 6. İki kullanıcıyı oluşturun

Yönetici kullanıcı:

```bash
npm run create-user -- --username yonetici --password "GucluBirSifre123!" --name "Yönetici" --role admin
```

İade teslim ve kontrol personeli:

```bash
npm run create-user -- --username depo --password "GucluBirSifre456!" --name "Depo Personeli" --role operator
```

Giriş ekranında e-posta değil yalnızca `yonetici` veya `depo` kullanıcı adı yazılır.

Aynı komutu mevcut bir kullanıcı için tekrar çalıştırırsanız şifre, isim ve rol güncellenir.

## 7. Bilgisayarda çalıştırın

```bash
npm run dev
```

Tarayıcıda `http://localhost:3000` adresini açın.

---

# Vercel'e yayınlama

## Seçenek A: GitHub üzerinden

1. Proje klasörünü GitHub'a yükleyin.
2. Vercel'de **Add New > Project** seçeneğini açın.
3. GitHub reposunu seçin.
4. Vercel ortam değişkenlerine yalnızca şunları ekleyin:

```env
NEXT_PUBLIC_SUPABASE_URL=https://PROJE_KODUNUZ.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=SUPABASE_ANON_KEY
NEXT_PUBLIC_LOGIN_DOMAIN=iade.local
```

5. **Deploy** düğmesine basın.

`SUPABASE_SERVICE_ROLE_KEY` değerini Vercel'e eklemeyin; uygulamanın çalışması için gerekli değildir.

## Seçenek B: Vercel Marketplace üzerinden Supabase

Vercel projenizde Marketplace bölümünden Supabase entegrasyonu bağlanabilir. Bağlantıdan sonra oluşan URL ve anahtarların uygulamadaki ortam değişkeni adlarıyla eşleştiğini kontrol edin.

---

# Veritabanı yapısı

## `profiles`

Kullanıcı adı, personel adı ve rol bilgisini tutar.

## `returns`

İadenin müşteri, ürün, adet, geliş durumu, kontrol sonucu ve personel bilgilerini tutar.

## `return_logs`

Her ekleme ve güncellemenin işlem geçmişini tutar. Bu tablo kullanıcı arayüzünden değiştirilemez.

---

# Roller

## `admin`

- İade ekleyebilir
- Durumları değiştirebilir
- Notları değiştirebilir
- İşlem geçmişini görebilir
- Kayıt silebilir

## `operator`

- İade ekleyebilir
- Durumları değiştirebilir
- Notları değiştirebilir
- İşlem geçmişini görebilir
- Kayıt silemez

---

# Güvenlik notları

- Tüm iade tablolarında Supabase Row Level Security aktiftir.
- Oturum açmamış kişiler verilere erişemez.
- Teslim alan ve kontrol eden kullanıcı bilgileri tarayıcıdan gönderilen değere güvenilerek değil, veritabanındaki aktif kullanıcı oturumundan belirlenir.
- Kontrol sonucu, ürün fiziksel olarak **Geldi** durumuna alınmadan kaydedilemez.
- Yönetici olmayan kullanıcıların silme işlemi veritabanı seviyesinde engellenir.
- Kullanıcı kaydı için herkese açık bir kayıt ekranı bulunmaz; kullanıcılar yalnızca yönetici betiğiyle oluşturulur.

# Dosya yapısı

```text
app/
  globals.css
  layout.tsx
  page.tsx
components/
  LoginForm.tsx
  ReturnDashboard.tsx
lib/
  supabase/client.ts
  types.ts
scripts/
  create-user.mjs
supabase/
  schema.sql
.env.example
README.md
```
