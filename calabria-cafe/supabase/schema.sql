-- ═══════════════════════════════════════════════
--  Calábria Café — Schema Supabase
--  Rode este script no SQL Editor do Supabase
-- ═══════════════════════════════════════════════

-- ── PRODUCTS ──────────────────────────────────
create table if not exists products (
  id          text primary key,
  name        text not null,
  cat         text not null default 'Outros',
  price       numeric(10,2) not null default 0,
  cost        numeric(10,2) not null default 0,
  track_stock boolean not null default false,
  stock       integer not null default 999,
  unit        text not null default 'un',
  min_stock   integer not null default 0,
  created_at  timestamptz default now()
);

-- ── CLIENTS ───────────────────────────────────
create table if not exists clients (
  id           text primary key,
  name         text not null,
  phone        text default '',
  notes        text default '',
  total_spent  numeric(10,2) default 0,
  visits       integer default 0,
  created_at   timestamptz default now()
);

-- ── SALES ─────────────────────────────────────
create table if not exists sales (
  id         text primary key,
  date       date not null default current_date,
  time       timestamptz default now(),
  items      jsonb not null default '[]',
  total      numeric(10,2) not null default 0,
  payment    text not null default 'Dinheiro',
  client_id  text references clients(id) on delete set null,
  source     text default 'Balcão',
  created_at timestamptz default now()
);

-- ── TABLES (mesas) ────────────────────────────
create table if not exists tables (
  id    text primary key,
  label text not null
);

-- ── ORDERS (comandas abertas) ─────────────────
create table if not exists orders (
  table_id   text primary key references tables(id) on delete cascade,
  items      jsonb not null default '[]',
  updated_at timestamptz default now()
);

-- ══════════════════════════════════════════════
--  ROW LEVEL SECURITY
-- ══════════════════════════════════════════════
alter table products enable row level security;
alter table clients  enable row level security;
alter table sales    enable row level security;
alter table tables   enable row level security;
alter table orders   enable row level security;

-- Permite leitura e escrita anônima (app interno — todos os operadores usam a anon key)
create policy "anon_all_products" on products for all to anon using (true) with check (true);
create policy "anon_all_clients"  on clients  for all to anon using (true) with check (true);
create policy "anon_all_sales"    on sales    for all to anon using (true) with check (true);
create policy "anon_all_tables"   on tables   for all to anon using (true) with check (true);
create policy "anon_all_orders"   on orders   for all to anon using (true) with check (true);

-- ══════════════════════════════════════════════
--  REALTIME
-- ══════════════════════════════════════════════
-- Habilita realtime nas tabelas principais
alter publication supabase_realtime add table products;
alter publication supabase_realtime add table clients;
alter publication supabase_realtime add table orders;

-- ══════════════════════════════════════════════
--  SEED — Mesas
-- ══════════════════════════════════════════════
insert into tables (id, label) values
  ('t1','Mesa 1'),('t2','Mesa 2'),('t3','Mesa 3'),('t4','Mesa 4'),
  ('t5','Mesa 5'),('t6','Mesa 6'),('t7','Mesa 7'),('t8','Mesa 8')
on conflict do nothing;

-- ══════════════════════════════════════════════
--  SEED — Produtos
-- ══════════════════════════════════════════════
insert into products (id,name,cat,price,cost,track_stock,stock,unit,min_stock) values
  ('p1','Café Espresso','Bebidas',6.50,1.80,false,999,'un',0),
  ('p2','Cappuccino','Bebidas',9.50,3.20,false,999,'un',0),
  ('p3','Café com Leite','Bebidas',7.00,2.00,false,999,'un',0),
  ('p4','Suco Natural','Bebidas',8.00,2.50,true,30,'un',5),
  ('p5','Pão de Queijo','Salgados',5.00,1.50,true,40,'un',10),
  ('p6','Croissant','Salgados',9.00,3.00,true,18,'un',5),
  ('p7','Bolo de Chocolate','Doces',12.00,4.00,true,12,'fatia',4),
  ('p8','Brigadeiro','Doces',4.00,1.00,true,50,'un',10)
on conflict do nothing;
