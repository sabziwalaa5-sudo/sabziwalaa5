-- PostgreSQL database initialization script for SABJIWALA 5

-- Create Roles Enum if they don't exist
CREATE TYPE "Role" AS ENUM ('CUSTOMER', 'VENDOR', 'DELIVERY_PARTNER', 'ADMIN');
CREATE TYPE "OrderStatus" AS ENUM ('PLACED', 'ACCEPTED', 'PACKED', 'OUT_FOR_DELIVERY', 'DELIVERED', 'REJECTED', 'CANCELLED');
CREATE TYPE "PaymentMethod" AS ENUM ('COD', 'UPI', 'CARD', 'WALLET');
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'PAID', 'FAILED', 'REFUNDED');

-- Helper function to calculate distance using the Haversine formula
-- Useful when standard PostgreSQL is used without PostGIS
CREATE OR REPLACE FUNCTION get_distance_km(
  lat1 double precision,
  lon1 double precision,
  lat2 double precision,
  lon2 double precision
) RETURNS double precision AS $$
DECLARE
  r double precision := 6371; -- Earth radius in KM
  dlat double precision;
  dlon double precision;
  a double precision;
  c double precision;
BEGIN
  dlat := radians(lat2 - lat1);
  dlon := radians(lon2 - lon1);
  a := sin(dlat/2) * sin(dlat/2) +
       cos(radians(lat1)) * cos(radians(lat2)) *
       sin(dlon/2) * sin(dlon/2);
  c := 2 * atan2(sqrt(a), sqrt(1-a));
  RETURN r * c;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Query to find active vendors within 5 KM of client location:
-- SELECT id, "storeName", get_distance_km(latitude, longitude, $1, $2) as distance 
-- FROM "Vendor"
-- WHERE "isActive" = true AND get_distance_km(latitude, longitude, $1, $2) <= 5.0
-- ORDER BY distance ASC;
