# Session Changes - 2026-04-20

Ovaj dokument sumira sve promene koje su uradjene tokom sesije, ukljucujuci i one koje su kasnije vracene (undo).

## 1) Projektno upoznavanje i analiza

- Procitana struktura projekta i glavni tokovi rezervacija.
- Proverena arhitektura: Next.js App Router + Supabase + servisni sloj u `lib/services`.
- Potvrdjeno razumevanje baze i flow-a rezervacije.

## 2) Nova polja u guest registraciji

Dodato end-to-end:

- `date_of_birth`
- `referral_source`
- `referral_source_other` (obavezno kada je `referral_source = Drugo`)

### Zahvaceni delovi

- `supabase/migrations/010_referral_and_dob.sql`
- `lib/db/types.ts`
- `lib/validations/registrationSchema.ts`
- `lib/store/registrationStore.ts`
- `components/guest/steps/PersonalInfoStep.tsx`
- `app/api/reservations/route.ts`
- `lib/services/reservationService.ts`
- `app/(admin)/admin/reservations/[id]/page.tsx`

### Dodatno

- U migraciji dodat backfill za postojece zapise:
  - `referral_source = 'Instagram'` gde je bilo `NULL`.

## 3) Fix parser greske

- Ispravljena sintaksna greska u:
  - `lib/validations/registrationSchema.ts`
- Uzrok: visak `});` nakon `refine` bloka.

## 4) Admin edit rezervacije - datum rodjenja

- U admin edit formi dodat prikaz/izmena `date_of_birth`.
- PATCH payload prosiren novim poljem.

### Fajl

- `components/admin/reservations/ReservationActions.tsx`

## 5) Ispravka status logike rezervacije

Problem:

- Promena bungalova/soba je menjala status na `modified` i prerano otkljucavala voucher akcije.

Resenje:

- Uklonjena promena statusa pri smestaju/sobama.
- `modified` se postavlja samo kroz edit flow i samo ako je rezervacija prethodno odobrena.
- Voucher resend/download vezan za `approved_at`.

### Fajlovi

- `lib/services/cabinService.ts`
- `components/admin/reservations/ReservationActions.tsx`

## 6) Dashboard statistika - referral wheel

Dodat donut/wheel prikaz koji pokazuje:

- kanal dolaska,
- broj rezervacija,
- procenat,
- hover/click detalje.

### Fajlovi

- `components/admin/dashboard/ReferralWheel.tsx` (nov)
- `lib/services/reservationService.ts` (agregacija `referralStats`)
- `app/(admin)/admin/page.tsx` (sekcija na dashboardu)

## 7) Novi tip rezervacije - HOLD (odvojena tabela)

Implementiran poseban subsystem za cuvanje mesta, odvojeno od glavne `reservations` tabele.

### Faza 1 - baza + servis + kalendar/availability

- Migracija: `supabase/migrations/011_reservation_holds.sql`
- Dodati tipovi za hold:
  - `HoldStatus`
  - `ReservationHold`, `ReservationHoldInsert`
- Dodata servisna logika:
  - kreiranje/listanje/izmena/status/brisanje
  - efektivni `expired` po datumu (`hold_until_date`)
  - overlap provere
- Integracija u kalendar i availability:
  - hold rezervacije blokiraju termine
  - posebne boje/statusi u kalendaru

### Fajlovi

- `lib/db/types.ts`
- `lib/services/holdService.ts`
- `lib/services/calendarService.ts`
- `components/admin/calendar/CalendarView.tsx`

## 8) HOLD admin UI + API

Dodato:

- Stranica: `/admin/holds`
- Forma za unos hold rezervacije
- Lista hold rezervacija sa filterima i akcijama
- API rute za hold CRUD

### Fajlovi

- `app/(admin)/admin/holds/page.tsx` (nov)
- `components/admin/holds/HoldBookingForm.tsx` (nov)
- `components/admin/holds/HoldBookingList.tsx` (nov)
- `app/api/holds/route.ts` (nov)
- `app/api/holds/[id]/route.ts` (nov)
- `app/(admin)/admin/page.tsx` (dashboard link + hold KPI)
- `lib/services/reservationService.ts` (hold KPI agregacija)

## 9) HOLD multi-room podrska

Prosireno da jedna hold rezervacija moze zauzeti vise soba.

### Baza

- Migracija: `supabase/migrations/012_reservation_hold_units.sql`
- Nova junction tabela: `reservation_hold_units`
- Backfill iz postojecih hold zapisa.

### Backend

- Tipovi za hold units dodati u `lib/db/types.ts`.
- `holdService` refaktorisan da koristi `units[]`:
  - validacije kapaciteta,
  - deduplikacija sobe,
  - zbir ljudi po sobama == `number_of_people`,
  - conflict check prema zauzecu.
- `calendarService` emituje po jedan bar po hold jedinici.
- `app/api/holds/route.ts` prosiren da prima `units`.

### Frontend

- `HoldBookingForm` prepravljen na multi-room raspodelu:
  - dinamicni redovi soba,
  - prikaz `Rasporedjeno X/Y`,
  - dugme `+ Dodaj jos jednu sobu`,
  - lokalne validacije.

## 10) Kritican bug fix - insert `units` u pogresnu tabelu

Problem:

- Supabase greska: ne postoji kolona `units` u `reservation_holds`.

Uzrok:

- `createReservationHold` je sirio ceo input (`...input`) u insert hold tabele.

Resenje:

- `units` izdvojen pre inserta:
  - hold insert koristi samo kolone `reservation_holds`
  - `units` se posebno upisuju u `reservation_hold_units`

### Fajl

- `lib/services/holdService.ts`

## 11) Date picker icon styling pokusaji (kasnije undo)

- Radjen pokusaj da ikonica datuma bude bela kroz globalni i lokalni CSS.
- Korisnik je kasnije uradio undo ovih poslednjih styling izmena.

### Fajlovi koji su vraceni (undo)

- `components/guest/steps/PersonalInfoStep.tsx`
- `components/admin/reservations/ReservationActions.tsx`
- `components/admin/holds/HoldBookingForm.tsx`
- `components/guest/steps/GroupDetailsStep.tsx`
- `components/admin/partners/PartnerBookingForm.tsx`
- `components/guest/RegistrationForm.tsx`

## 12) Trenutni rezime

- Funkcionalne biznis promene iz sesije (fields, status fix, referral wheel, hold subsystem, multi-room hold, bug fix) su implementirane.
- Poslednji CSS styling pokusaji za date icon su vraceni unazad.

## 13) Brza lista novih migracija ove sesije

- `supabase/migrations/010_referral_and_dob.sql`
- `supabase/migrations/011_reservation_holds.sql`
- `supabase/migrations/012_reservation_hold_units.sql`
