-- ============================================================
-- Migration 005: Add "Prilagodjena Ponuda" custom package
-- weekend_price = 0 and weekday_price = 0 signals a custom
-- arrangement — the guest manually enters the agreed price.
-- ============================================================

INSERT INTO packages (name, includes, description, weekend_price, weekday_price, status, sort_order)
VALUES (
  'Prilagodjena Ponuda',
  'Sve po specijalnom dogovoru',
  E'Kreiraj sam svoj aranžman i svoje aktivnosti — ponuda koja ti omogućuje totalnu slobodu i užitak!',
  0, 0, 'active', 99
);
