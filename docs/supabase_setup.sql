-- Supabase Database Setup for SABJIWALA 5 MVP (100% Free Tier)

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Create roles enum
create type user_role as enum ('CUSTOMER', 'VENDOR', 'DELIVERY_PARTNER', 'ADMIN');
create type order_status as enum ('PLACED', 'ACCEPTED', 'PACKED', 'OUT_FOR_DELIVERY', 'DELIVERED', 'REJECTED', 'CANCELLED');

-- 1. Profiles Table (Linked to Supabase Auth.users)
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  phone text unique not null,
  full_name text,
  role user_role default 'CUSTOMER'::user_role,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS on Profiles
alter table public.profiles enable row level security;

create policy "Allow public read access to profiles" on public.profiles
  for select using (true);

create policy "Allow users to update their own profile" on public.profiles
  for update using (auth.uid() = id);

-- 2. Vendors Table
create table public.vendors (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade,
  vendor_name text not null,
  shop_name text not null,
  mobile text not null,
  email text not null,
  address text not null,
  status text default 'Active' not null,
  latitude decimal(9, 6) default 28.5284,
  longitude decimal(9, 6) default 77.1028,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.vendors enable row level security;

create policy "Allow public read access to vendors" on public.vendors
  for select using (true);

create policy "Allow vendors to manage their own record" on public.vendors
  for all using (auth.uid() = user_id or auth.uid() is not null);

-- 3. Products Table
create table public.products (
  id uuid default gen_random_uuid() primary key,
  vendor_id uuid references public.vendors(id) on delete cascade,
  name_en text not null,
  name_hi text not null,
  price decimal(10, 2) not null,
  unit text not null,
  image_url text,
  stock_qty decimal(10, 2) default 0.0 not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.products enable row level security;

create policy "Allow public read access to products" on public.products
  for select using (true);

create policy "Allow vendors to edit products" on public.products
  for all using (true);

-- 4. Orders Table
create table public.orders (
  id text primary key, -- Custom formatted id e.g. SBJ50001
  customer_id uuid references public.profiles(id),
  customer_name text default 'Guest Customer',
  customer_mobile text default '',
  vendor_id uuid references public.vendors(id) on delete cascade,
  delivery_partner_id uuid references public.profiles(id),
  order_status text default 'Pending' not null,
  payment_status text default 'Pending' not null,
  payment_method text default 'COD' not null,
  total_amount decimal(10, 2) not null,
  delivery_address text not null,
  latitude decimal(9, 6) not null,
  longitude decimal(9, 6) not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 4.1 Order Items Table
create table public.order_items (
  id uuid default gen_random_uuid() primary key,
  order_id text references public.orders(id) on delete cascade not null,
  product_id uuid references public.products(id) on delete set null,
  product_name text not null,
  quantity decimal(10, 2) not null,
  unit_price decimal(10, 2) not null,
  subtotal decimal(10, 2) not null
);

alter table public.order_items enable row level security;
create policy "Allow public read access to order items" on public.order_items for select using (true);
create policy "Allow insert access to order items" on public.order_items for insert with check (true);


alter table public.orders enable row level security;

create policy "Users can view their own orders" on public.orders
  for select using (
    auth.uid() = customer_id or 
    auth.uid() = delivery_partner_id or
    exists (
      select 1 from public.vendors v 
      where v.id = vendor_id and v.user_id = auth.uid()
    )
  );

create policy "Customers can insert orders" on public.orders
  for insert with check (auth.uid() = customer_id);

create policy "Authorized roles can update order status" on public.orders
  for update using (true);

-- 5. Driver Live Position Tracking (Supabase Realtime target)
create table public.driver_positions (
  id uuid default gen_random_uuid() primary key,
  driver_id uuid references public.profiles(id) on delete cascade not null,
  order_id text references public.orders(id) on delete cascade not null,
  latitude decimal(9, 6) not null,
  longitude decimal(9, 6) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.driver_positions enable row level security;

create policy "Public read access to positions" on public.driver_positions
  for select using (true);

create policy "Drivers can update their position" on public.driver_positions
  for all using (auth.uid() = driver_id);

-- Enable Supabase Realtime for database tracking replication
alter publication supabase_realtime add table public.orders;
alter publication supabase_realtime add table public.driver_positions;

-- Distance Function (Haversine Formula) for nearest vendor matching
create or replace function get_nearby_vendors(
  cust_lat double precision, 
  cust_lon double precision, 
  radius_km double precision
)
returns table (
  id uuid,
  store_name text,
  latitude decimal,
  longitude decimal,
  distance_km double precision
) 
language plpgsql
as $$
begin
  return query
  select 
    v.id,
    v.shop_name as store_name,
    v.latitude,
    v.longitude,
    (6371 * acos(
      cos(radians(cust_lat)) * cos(radians(v.latitude::double precision)) * 
      cos(radians(v.longitude::double precision) - radians(cust_lon)) + 
      sin(radians(cust_lat)) * sin(radians(v.latitude::double precision))
    )) as distance_km
  from public.vendors v
  where v.status = 'Active'
    and (6371 * acos(
      cos(radians(cust_lat)) * cos(radians(v.latitude::double precision)) * 
      cos(radians(v.longitude::double precision) - radians(cust_lon)) + 
      sin(radians(cust_lat)) * sin(radians(v.latitude::double precision))
    )) <= radius_km
  order by distance_km asc;
end;
$$;

-- Trigger function to automatically create profiles and assign sabziwalaa5@gmail.com as ADMIN
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, phone, full_name, role)
  values (
    new.id,
    coalesce(new.phone, ''),
    coalesce(new.raw_user_meta_data->>'full_name', 'User'),
    case 
      when lower(new.email) = 'sabziwalaa5@gmail.com' then 'ADMIN'::user_role
      else 'CUSTOMER'::user_role
    end
  );
  return new;
end;
$$ language plpgsql security definer;

-- Trigger binding
create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 6. Rewards & Loyalty Program tables
create table public.reward_settings (
  id integer primary key default 1,
  earning_rate integer default 5 not null, -- points per ₹100
  point_value decimal(10, 2) default 1.00 not null, -- 1 point value in ₹
  enabled boolean default true not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  constraint singleton_row check (id = 1)
);

-- Insert default settings row
insert into public.reward_settings (id, earning_rate, point_value, enabled)
values (1, 5, 1.00, true)
on conflict (id) do nothing;

create table public.reward_wallet (
  user_id uuid references public.profiles(id) on delete cascade primary key,
  points_balance integer default 0 not null check (points_balance >= 0),
  lifetime_earned integer default 0 not null check (lifetime_earned >= 0),
  lifetime_redeemed integer default 0 not null check (lifetime_redeemed >= 0),
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.reward_wallet enable row level security;
create policy "Allow users to view their own wallet" on public.reward_wallet
  for select using (auth.uid() = user_id);

create table public.reward_transactions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  order_id text references public.orders(id) on delete set null,
  points_earned integer default 0 not null,
  points_redeemed integer default 0 not null,
  balance_after integer not null check (balance_after >= 0),
  transaction_type text not null, -- 'EARNED', 'REDEEMED', 'BONUS', 'DEDUCTION_REFUND', 'MANUAL_ADJUSTMENT'
  campaign_name text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.reward_transactions enable row level security;
create policy "Allow users to view their own reward transactions" on public.reward_transactions
  for select using (auth.uid() = user_id);
