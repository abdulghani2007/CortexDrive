// Shared types for the vendor services module (V1).
// Note: `price` is numeric(10,2) in Postgres, which supabase-js may return
// as a string — always coerce with Number() before using it in math.

export type VendorService = {
  id: string;
  vendor_id: string;
  title: string;
  description: string | null;
  category: string;
  mode: 'in_person' | 'mobile' | 'both';
  price: number | string;
  duration_minutes: number;
  is_active: boolean;
  created_at: string;
};

export type ServiceRow = {
  id: string;
  vendor_id: string;
  title: string;
  description: string | null;
  category: string;
  mode: string;
  price: number | string;
  duration_minutes: number;
  vendor_name: string | null;
  vendor_city: string | null;
  avg_rating?: number | string | null;
  rating_count?: number | null;
};
