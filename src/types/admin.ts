
export interface AdminRecording {
  id: string;
  user_id: string | null;
  story_id: string | null;
  category?: string | null;
  status: 'submitted' | 'approved' | 'rejected';
  duration?: number;
  duration_seconds?: number | null;
  submitted_at?: string;
  created_at?: string;
  reviewed_at?: string | null;
  reviewed_by?: string | null;
  audio_path: string;
  audio_url?: string; // Signed URL
  points_awarded?: number | null;
  admin_notes?: string | null;
  admin_feedback?: string | null;
  is_published: boolean;
  
  // Studio fields
  title?: string;
  description?: string;
  child_name?: string;
  
  // Joins
  story?: {
    title: string;
    summary?: string;
  };
  profile?: {
    name: string;
    email?: string;
  };
}

export interface AdminStory {
  id: string;
  title: string;
  summary: string;
}
