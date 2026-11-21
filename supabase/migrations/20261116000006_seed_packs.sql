-- 0006 : packs par défaut (modifiables par l'admin). TODO : renseigner chariow_url et valider les prix EUR.
insert into public.credit_packs (name, credits, price_xof, price_eur, chariow_url, sort_order) values
  ('Starter',   5,   2500,  3.90, null, 1),
  ('Standard',  20,  8000, 12.20, null, 2),
  ('Pro',       50, 18000, 27.50, null, 3),
  ('Business', 120, 38000, 58.00, null, 4);
