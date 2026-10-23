export interface Database {
  public: {
    Tables: {
      users: { Row: { id: string; full_name: string | null; city: string | null; role: string | null; email: string | null; created_at: string | null } };
      admins: { Row: { user_id: string; added_at: string | null } };
      verifications: { Row: { id: string; user_id: string; type: string | null; doc_url: string | null; selfie_url: string | null; status: string | null; ocr_payload: any | null; face_match_score: number | null; created_at: string | null } };
      bookings: { Row: { id: string; learner_id: string; instructor_id: string | null; slot_start: string | null; status: string | null; created_at: string | null } };
      availability_slots: { Row: { id: string; instructor_id: string; day: string | null; start_time: string | null; end_time: string | null; created_at: string | null } };
      ratings: { Row: { id: string; booking_id: string; reviewer_id: string; stars: number | null; comment: string | null; created_at: string | null } };
      messages: { Row: { id: string; booking_id: string | null; sender_id: string; body: string | null; created_at: string | null } };
      gps_locations: { Row: { id: string; booking_id: string | null; lat: number | null; lng: number | null; updated_at: string | null } };
      sos_logs: { Row: { id: string; user_id: string; lat: number | null; lng: number | null; note: string | null; booking_id: string | null; created_at: string | null } };
      vehicle_logs: { Row: { id: string; user_id: string; event_type: string | null; meta: any | null; created_at: string | null } };
      wallets: { Row: { id: string; user_id: string; balance: number | null; created_at: string | null } };
      transactions: { Row: { id: string; wallet_id: string; kind: string | null; amount: number | null; balance_after: number | null; meta: any | null; created_at: string | null } };
      platform_settings: { Row: { id: string; key: string | null; value: any | null; updated_at: string | null } };
    };
  };
}
