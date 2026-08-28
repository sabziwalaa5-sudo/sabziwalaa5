-- Optional RLS hardening. Review before applying to production.
-- Tightens overly-permissive policies from supabase_setup.sql.

drop policy if exists "Allow vendors to edit products" on public.products;
create policy "Vendors manage own products" on public.products
  for all
  using (
    exists (
      select 1 from public.vendors v
      where v.id = vendor_id and v.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.vendors v
      where v.id = vendor_id and v.user_id = auth.uid()
    )
  );

drop policy if exists "Allow insert access to order items" on public.order_items;
create policy "Customers insert own order items" on public.order_items
  for insert
  with check (
    exists (
      select 1 from public.orders o
      where o.id = order_id and o.customer_id = auth.uid()
    )
  );

drop policy if exists "Authorized roles can update order status" on public.orders;
create policy "Staff update orders" on public.orders
  for update
  using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('ADMIN','VENDOR','DELIVERY_PARTNER'))
    or auth.uid() = customer_id
  );
