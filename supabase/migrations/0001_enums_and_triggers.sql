-- Enums and shared trigger function used across every table in this schema.

create type user_role as enum ('customer', 'partner', 'driver', 'admin');

create type vehicle_approval_status as enum (
  'draft', 'submitted', 'under_review', 'approved', 'rejected'
);

create type fuel_type as enum ('diesel', 'petrol', 'electric', 'hybrid');

create type allocation_method as enum (
  'click_claim', 'express_interest', 'auction', 'reservation', 'route_matcher'
);

create type work_type as enum ('single', 'journey', 'auction');

create type job_status as enum (
  'assigned',
  'en_route_to_collection',
  'arrived_at_collection',
  'documentation_complete_collection',
  'collection_complete',
  'in_transit',
  'arrived_at_delivery',
  'documentation_complete_delivery',
  'delivery_complete'
);

create type bid_status as enum ('pending', 'won', 'lost', 'expired');

create type reservation_type as enum ('full_day', 'custom');

create type reservation_status as enum (
  'pending', 'accepted', 'partially_matched', 'fully_booked', 'expired'
);

create type payment_status as enum ('scheduled', 'pending', 'transferred');

create type photo_stage as enum ('collection', 'delivery');

-- Additional enums for fields the spec described only as a fixed set of
-- string options (e.g. "status (active/inactive)"), not as a named enum.
-- Called out in the phase summary as a minor extension for data integrity.
create type driver_status as enum ('active', 'inactive');
create type route_direction as enum ('outbound', 'return', 'both');
create type vehicle_doc_type as enum ('log_book', 'mot', 'v5');
create type invitation_status as enum ('pending', 'accepted', 'declined', 'expired');
create type job_recommendation_status as enum ('sent', 'accepted', 'declined');
create type status_log_source as enum ('auto', 'manual');
create type dispute_status as enum ('none', 'submitted', 'resolved');
create type pmp_status as enum ('active', 'resolved', 'terminated');

-- Shared updated_at trigger function, attached to every table below.
create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
