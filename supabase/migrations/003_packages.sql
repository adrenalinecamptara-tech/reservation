-- ============================================================
-- Migration 003: Packages table
-- ============================================================

CREATE TABLE packages (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name         TEXT NOT NULL,
  includes     TEXT NOT NULL,
  description  TEXT,
  weekend_price  NUMERIC(10,2) NOT NULL,
  weekday_price  NUMERIC(10,2) NOT NULL,
  status       TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  sort_order   INTEGER NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE packages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "packages_public_read"  ON packages FOR SELECT USING (true);
CREATE POLICY "packages_admin_write"  ON packages USING (auth.role() = 'authenticated');

-- Index for guest form (only active ones)
CREATE INDEX idx_packages_status ON packages(status, sort_order);

-- Add package_id reference to reservations
ALTER TABLE reservations
  ADD COLUMN package_id UUID REFERENCES packages(id) ON DELETE SET NULL;

-- ============================================================
-- Seed: 7 packages
-- ============================================================

INSERT INTO packages (name, includes, description, weekend_price, weekday_price, status, sort_order) VALUES
(
  'Trodnevni Maj',
  '3 dana, 2 noći (Žurke), 5 obroka + Rafting',
  'Akcija u maju za adrenalinski napon kroz rafting, odmor u prirodi uz specijalitete domaće kuhinje – a onda… Žurke svake večeri, Lajv svirke vikendom!',
  90, 78, 'active', 1
),
(
  'Savršen vikend',
  '3 dana, 2 noći (Žurke), 5 obroka + Rafting',
  'Adrenalinski napon kroz rafting, odmor u prirodi uz specijalitete domaće kuhinje – a onda… Žurke svake večeri, Lajv svirke vikendom!',
  125, 110, 'active', 2
),
(
  'Balans - Rafting i Safari',
  '3 dana, 2 noći (Žurke), 8 obroka + Rafting, Hajking i Jeep Safari',
  'Rafting koji pokreće adrenalin u kombinaciji sa Hajkingom i Jeep Safarijem koji vas upoznaju sa prelepim planinskim predelima, rekama i ostalim prirodnim bogatstvima Tare.',
  155, 140, 'active', 3
),
(
  'Adrenalin - Rafting i Kvadovi',
  '4 dana, 3 noći (Žurke), 8 obroka + 2 Raftinga i Kvadovi',
  'Za prave ljubitelje avantura – paket koji pruža divlju zabavu preko dana, odmor u kampu u pauzama (uz specijalitete domace kuhinje), a onda lude žurke uveče!',
  255, 240, 'active', 4
),
(
  'Rafting plus',
  '4 dana, 3 noći (Žurke), 8 obroka + Rafting i Jahanje/Kanjoning/Bajking/Kvadovi/Izlet',
  'Ovaj paket pruža priliku da odaberete aktivnost koju biste najradije kombinovali sa raftingom – za vaš savršen odmor!',
  155, 140, 'active', 5
),
(
  'Team building',
  '3 dana, 2 noći (Žurke), 5 obroka + Rafting',
  E'Naš kamp je idealno mesto za sjajan team building. Ništa ne spaja ljude kao talas adrenalina, domaća hrana, dobar odmor i žurke za pamćenje!\n\nZa veće grupe nudimo besplatan paket za svaku 10-u osobu.',
  119, 109, 'active', 6
),
(
  'Porodični kombo',
  '3 dana, 2 noći, 5 obroka + Rafting i Jahanje/Jeep Safari/Kvadovi/Izlet',
  E'Želite da probate nešto novo sa vašim najmilijima?\nImamo idealnu kombinaciju za svakog od vas – Adrenalin za najhrabrije, priroda i safari za one koji su došli da se odmore i jedna aktivnost sa spiska dodatnih aktivnosti potpuno besplatno!',
  185, 170, 'active', 7
);
