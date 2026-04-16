# Adrenaline Camp Tara — Rezervacioni Sistem
## Arhitektura i pregled implementacije

---

## Šta je izgrađeno

Fullstack rezervacioni sistem za Adrenaline Camp Tara koji zamenjuje ručno upravljanje rezervacijama preko Instagram DM-a i WhatsAppa.

### Tok rezervacije

```
1. Admin generiše invite link → /admin/links
2. Šalje link gostu (WhatsApp / Instagram)
3. Gost otvara /register/[token] → popunjava 3-stepnu formu
4. Admin dobija email notifikaciju sa svim podacima
5. Admin pregleda u portalu → klikne "Odobri"
6. Sistem generiše PDF vaučer → šalje gostu na email
```

---

## Tech Stack

| Tehnologija | Uloga |
|---|---|
| **Next.js 16** (App Router) | Fullstack framework |
| **Supabase** | PostgreSQL + Auth (admin) + Storage (dokazi o uplati) |
| **TanStack Query v5** | Server state / data fetching |
| **Zustand** | Client state (multi-step forma, persisted) |
| **Resend + @react-email** | Transakcioni email |
| **@react-pdf/renderer** | Server-side PDF vaučer |
| **shadcn/ui + Tailwind** | UI komponente |
| **Zod + react-hook-form** | Validacija forme |

---

## Arhitekturno pravilo

> Sva biznis logika živi u `lib/services/` — framework-agnostično.
> Next.js routes i komponente su tanki omotači.
> Isti `lib/services/` se može direktno koristiti u React Native mobilnoj aplikaciji.

---

## Struktura projekta

```
reservations/
│
├── app/
│   ├── (guest)/
│   │   └── register/[token]/
│   │       ├── page.tsx              # Validira token server-side, renderuje formu
│   │       └── success/page.tsx      # "Sve je gotovo!" stranica
│   │
│   ├── (admin)/
│   │   └── admin/
│   │       ├── page.tsx              # Dashboard sa statistikama i pending listom
│   │       ├── login/page.tsx        # Supabase Auth login
│   │       ├── reservations/
│   │       │   ├── page.tsx          # Lista svih rezervacija sa filterima
│   │       │   └── [id]/page.tsx     # Detalj rezervacije + akcije
│   │       └── links/page.tsx        # Generisanje invite linkova
│   │
│   └── api/
│       ├── links/route.ts            # GET list, POST generiši link
│       ├── reservations/
│       │   ├── route.ts              # GET list (admin), POST submit (gost)
│       │   └── [id]/
│       │       ├── route.ts          # GET, PATCH, DELETE
│       │       └── approve/route.ts  # POST → PDF + email
│       ├── upload/route.ts           # POST → Supabase signed URL
│       └── voucher/[id]/route.ts     # GET → stream PDF
│
├── lib/
│   ├── services/                     # ⭐ BIZNIS LOGIKA — reusable za React Native
│   │   ├── linkService.ts            # generateInviteLink, validateToken, markTokenUsed
│   │   ├── reservationService.ts     # createReservation, approveReservation, getStats...
│   │   ├── emailService.ts           # notifyAdmin, sendVoucherToGuest
│   │   ├── pdfService.ts             # generateVoucher (server-side @react-pdf)
│   │   ├── storageService.ts         # getSignedUploadUrl, getSignedDownloadUrl
│   │   └── cabinService.ts           # listCabins, getCabinAvailability, assignCabin
│   │
│   ├── db/
│   │   ├── supabase.ts               # Server client (session cookies) + service client
│   │   ├── supabaseClient.ts         # Browser client (admin auth state)
│   │   └── types.ts                  # TypeScript tipovi (zameni sa `supabase gen types`)
│   │
│   ├── email/templates/
│   │   ├── AdminNotificationEmail.tsx  # Email adminu kada gost popuni formu
│   │   └── GuestVoucherEmail.tsx       # Email gostu sa vaučerom u prilogu
│   │
│   ├── pdf/
│   │   ├── VoucherDocument.tsx         # @react-pdf/renderer vaučer (po originalnom dizajnu)
│   │   └── VoucherDocumentOriginal.tsx # Originalni React web component (za referencu)
│   │
│   ├── store/
│   │   └── registrationStore.ts       # Zustand: multi-step forma state (persisted)
│   │
│   └── validations/
│       └── registrationSchema.ts      # Zod: 3 schema-a za 3 koraka forme
│
├── components/
│   ├── guest/
│   │   ├── RegistrationForm.tsx        # Shell: step indicator + layout
│   │   └── steps/
│   │       ├── PersonalInfoStep.tsx    # Korak 1: Ime, Prezime, Email, Telefon, LK
│   │       ├── GroupDetailsStep.tsx    # Korak 2: Datum, Broj osoba, Paket
│   │       └── PaymentStep.tsx        # Korak 3: Depozit, Ostatak, Upload potvrde
│   │
│   └── admin/
│       ├── reservations/
│       │   └── ReservationActions.tsx  # Approve, Cancel, Cabin assign, Notes (client)
│       └── links/
│           └── GenerateLinkForm.tsx    # Generiši link + WhatsApp share (client)
│
├── supabase/
│   └── migrations/
│       └── 001_initial_schema.sql     # Kompletna schema + RLS + triggers
│
├── middleware.ts                       # Route protection: /admin/* zahteva auth
├── CLAUDE.md                          # Brand guide + tech stack za AI asistenta
├── ARCHITECTURE.md                    # Ovaj fajl
└── .env.example                       # Template za environment varijable
```

---

## Baza podataka

### Tabele

#### `cabins` — 4 bungalova
| Kolona | Tip | Opis |
|---|---|---|
| id | UUID | Primary key |
| name | TEXT | "Bungalov 1"... "Bungalov 4" |
| ground_beds | INTEGER | 6 (prizemlje) |
| upper_beds | INTEGER | 4 (sprat) |
| active | BOOLEAN | Da li je aktivan |

#### `invite_links` — Generisani linkovi
| Kolona | Tip | Opis |
|---|---|---|
| id | UUID | Primary key |
| token | TEXT UNIQUE | URL-safe random token (24 bajta) |
| created_by | UUID | Admin koji je generisao |
| notes | TEXT | Interna napomena (ko je gost) |
| used | BOOLEAN | Da li je već iskorišćen |
| expires_at | TIMESTAMPTZ | Opcioni rok isteka |

#### `reservations` — Rezervacije
| Kolona | Tip | Opis |
|---|---|---|
| id | UUID | Primary key |
| invite_link_id | UUID FK | Koji link je korišćen |
| first_name, last_name | TEXT | Lični podaci |
| email, phone | TEXT | Kontakt |
| id_card_number | TEXT | Broj lične karte |
| number_of_people | INTEGER | Broj osoba u grupi |
| arrival_date | DATE | Datum dolaska |
| package_type | TEXT | Odabrani paket |
| deposit_amount | NUMERIC | Plaćeni depozit |
| remaining_amount | NUMERIC | Ostatak za platiti |
| payment_proof_path | TEXT | Supabase Storage path |
| cabin_id | UUID FK | Dodeljeni bungalov |
| floor | ENUM | 'ground' ili 'upper' |
| status | ENUM | pending/approved/cancelled/modified |
| voucher_number | TEXT | Auto-generirani ACT-2026-0001 |
| voucher_sent_at | TIMESTAMPTZ | Kada je vaučer poslat |

### Status flow
```
[link generisan]
       ↓
   pending  ← gost popuni formu
       ↓
  approved  ← admin odobri (+ PDF vaučer poslat)
       ↓
  modified  ← admin izmeni post-approval
       ↘
  cancelled ← admin otkaže
```

### Trigeri
- **`set_updated_at`** — auto-update `updated_at` pri svakom UPDATE
- **`generate_voucher_number`** — auto-generiše `ACT-YYYY-NNNN` pri INSERT

---

## API Routes

| Metoda | Ruta | Auth | Opis |
|---|---|---|---|
| `GET` | `/api/links` | Admin JWT | Lista svih linkova |
| `POST` | `/api/links` | Admin JWT | Generiši novi link |
| `GET` | `/api/reservations` | Admin JWT | Lista rezervacija (filteri: status, datum, search) |
| `POST` | `/api/reservations?token=` | Token validation | Gost submit forme |
| `GET` | `/api/reservations/[id]` | Admin JWT | Jedna rezervacija |
| `PATCH` | `/api/reservations/[id]` | Admin JWT | Izmeni (cabin, notes, status...) |
| `DELETE` | `/api/reservations/[id]` | Admin JWT | Otkaži rezervaciju |
| `POST` | `/api/reservations/[id]/approve` | Admin JWT | Odobri → PDF → email |
| `POST` | `/api/upload?token=` | Token validation | Signed URL za upload |
| `GET` | `/api/voucher/[id]` | Admin JWT | Preuzmi PDF vaučer |

---

## Guest forma — Dizajn

Estetika: **dark teal (#0a1f1f → #1e4d4d)**, stakleni card efekat, Cormorant Garamond serif font za naslove, DM Sans za body, noise tekstura u pozadini.

**Korak 1 — Lični podaci:**
Ime, Prezime, Email, Telefon, Broj lične karte

**Korak 2 — Detalji dolaska:**
Datum dolaska, Broj osoba, Paket (opciono)

**Korak 3 — Uplata:**
Depozit, Ostatak, Upload potvrde o uplati (drag-drop, JPEG/PNG/PDF/WebP, max 10MB)
→ Upload ide direktno na Supabase Storage via signed URL (ne prolazi kroz Next.js server)

---

## PDF Vaučer

Baziran na originalnom `VoucherDocumentOriginal.tsx` dizajnu:
- Pozadinska slika: `public/voucher-assets/voucher-background.png`
- Boje: `#1e4d4d` (dark teal), `#c41e3a` (crvena za cenu)
- Polja: Email, Telefon, Ime i prezime, JMBG, Broj vaučera, Datum izdavanja, Važi do, Kamp menadžer
- Footer: Adresa, Email, Telefon, SWIFT, IBAN, Nova Banka
- Generisanje: `@react-pdf/renderer` server-side, bez headless Chrome

---

## Email notifikacije

### Admin notifikacija (pri submit forme)
- Subject: `Nova rezervacija — Ana Petrović, 2026-05-15, 4 osoba`
- Sadrži: sve podatke gosta, finansije, link ka portalu
- CTA button: "Pregledaj rezervaciju" → direktan link

### Gost vaučer email (pri odobravanju)
- Subject: `Vaš vaučer — Adrenaline Camp Tara (ACT-2026-0001)`
- Sadrži: rezime rezervacije, raspored (petak/subota/nedelja), šta poneti
- PDF vaučer u prilogu
- Završava sa: *"Vidimo se na reci."*

---

## Sigurnost

- **Service role key** nikad ne izlazi iz server-side koda
- **Token validacija** pre svakog guest API poziva (validateToken u linkService)
- **RLS (Row Level Security)** na svim tabelama
- **File upload** — browser uploaduje direktno na Supabase (signed URL), Next.js server ne prima fajlove
- **Admin auth** — Supabase Auth, zaštićen middleware-om
- **Allowed file types** — samo JPEG, PNG, WebP, PDF za upload potvrde

---

## Pokretanje projekta

### 1. Supabase setup
1. Napravi projekat na [supabase.com](https://supabase.com)
2. Pokreni migraciju: kopiraj sadržaj `supabase/migrations/001_initial_schema.sql` u SQL Editor
3. Napravi Storage bucket: `payment-proofs` (private)
4. Napravi admin korisnika: Authentication → Add User

### 2. Environment varijable
```bash
cp .env.example .env.local
# Popuni vrednosti iz Supabase dashboard-a i Resend-a
```

### 3. Resend setup
1. Napravi nalog na [resend.com](https://resend.com)
2. Dodaj i verifikuj domen `adrenalinetara.com`
3. Napravi API key

### 4. Pokretanje
```bash
npm run dev
```

### 5. Generisanje Supabase TypeScript tipova (opciono, poboljšava type safety)
```bash
npx supabase gen types typescript --project-id <project-id> > lib/db/types.ts
```

---

## Buduće faze

| Faza | Opis |
|---|---|
| **Faza 2** | Kalendar stranica + iFrame embed za WordPress (`/api/calendar/availability`) |
| **Faza 3** | Booking.com + Airbnb iCal sync (`ical_imports` tabela + cron) |
| **Faza 4** | Monri payment gateway — webhook → auto-generiši invite link |
| **Faza 5** | AI bot koji komunicira na Instagramu/WhatsAppu i rezerviše direktno |
| **Faza 6** | React Native mobilna aplikacija (koristi isti `lib/services/` layer) |
