export type AiOcr = {
  full_name?: string | null;
  cnic_number?: string | null;
  dob?: string | null;
};

export type AiResult = {
  status: 'verified' | 'needs_review' | 'rejected' | 'unavailable';
  face_match_score?: number | null;
  ocr?: AiOcr | null;
  ai_unavailable?: true;
};
