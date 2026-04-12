-- Create stories table
CREATE TABLE IF NOT EXISTS stories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  summary TEXT,
  content TEXT NOT NULL, -- The full story text for reading
  age_min INTEGER DEFAULT 4,
  age_max INTEGER DEFAULT 12,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create recordings table
CREATE TABLE IF NOT EXISTS recordings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  story_id UUID REFERENCES stories(id),
  audio_path TEXT NOT NULL, -- Path in storage bucket
  duration INTEGER, -- In seconds
  status TEXT DEFAULT 'submitted' CHECK (status IN ('submitted', 'approved', 'rejected')),
  points_awarded INTEGER DEFAULT 0,
  admin_feedback TEXT,
  is_published BOOLEAN DEFAULT false, -- If approved and good enough to be public
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE recordings ENABLE ROW LEVEL SECURITY;

-- Stories Policies
CREATE POLICY "Anyone can view active stories" 
ON stories FOR SELECT 
USING (is_active = true);

-- Recordings Policies
CREATE POLICY "Users can insert their own recordings" 
ON recordings FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own recordings" 
ON recordings FOR SELECT 
TO authenticated 
USING (auth.uid() = user_id);

CREATE POLICY "Everyone can view published recordings" 
ON recordings FOR SELECT 
USING (is_published = true);

-- Storage Bucket Setup (This usually needs to be done in UI or via specific storage API, but we can try SQL if extension is enabled)
-- Note: Creating buckets via SQL is not standard in all Supabase setups, but policies are.
-- We assume the bucket 'story-recordings' will be created.

-- Storage Policies (pseudo-SQL for Supabase Storage)
-- These need to be applied in the storage.objects table
-- INSERT INTO storage.buckets (id, name, public) VALUES ('story-recordings', 'story-recordings', true) ON CONFLICT DO NOTHING;

-- Seed Data (Authentic Stories)
INSERT INTO stories (title, summary, content, age_min, age_max)
VALUES 
(
  'The Prophet and the Crying Camel',
  'A beautiful story about kindness to animals from the life of Prophet Muhammad (SAW).',
  'One day, the Prophet Muhammad (peace be upon him) entered a garden belonging to a man from the Ansar. Inside, there was a camel. When the camel saw the Prophet, it began to cry, and tears flowed from its eyes. The Prophet went to it and gently rubbed its head until it calmed down. He then asked, "Who is the owner of this camel?" A young man from the Ansar came and said, "It belongs to me, O Messenger of Allah." The Prophet said to him, "Do you not fear Allah regarding this animal which He has placed in your care? It has complained to me that you starve it and overwork it." This story teaches us that we must be kind to all of Allah''s creatures.',
  5,
  10
),
(
  'The Story of the Ant and Prophet Sulaiman',
  'A story about how even the smallest creatures praise Allah and have feelings.',
  'Prophet Sulaiman (peace be upon him) was a great king who could talk to animals. One day, he was marching with his huge army of humans, jinn, and birds. They were passing through a valley of ants. One little ant saw the army coming and got scared. She called out to the other ants, "O ants! Enter your homes quickly, so that Sulaiman and his soldiers do not crush you without knowing!" Prophet Sulaiman heard this and smiled. He thanked Allah for his blessings and ordered his army to be careful not to hurt the ants. This shows us that we should be merciful to everyone, no matter how small.',
  4,
  8
),
(
  'The Three Men in the Cave',
  'Three men get trapped in a cave and ask Allah for help by mentioning their good deeds.',
  'Three men from the past were traveling when a heavy storm began. They took shelter in a cave. Suddenly, a huge rock rolled down the mountain and blocked the entrance of the cave! They were trapped. They realized that no one could save them except Allah. So, they decided to ask Allah for help by mentioning their sincere good deeds. The first man mentioned how he was kind to his old parents. The rock moved a little! The second man mentioned how he stayed away from a sin out of fear of Allah. The rock moved a little more! The third man mentioned how he was honest with a worker''s money and gave him all his earnings. The rock moved completely away, and they were able to leave! This teaches us that sincere good deeds save us in difficult times.',
  7,
  12
),
(
  'The Boy and the King',
  'A story of a brave boy whose faith was stronger than a powerful king.',
  'Long ago, there was a wicked king who had a magician. As the magician grew old, he asked for a boy to teach magic to. The boy started learning, but on his way, he met a monk (a worshipper of Allah) and learned about the true faith. One day, a huge beast blocked the people''s path. The boy threw a stone saying "O Allah, if the monk is more beloved to You than the magician, kill this beast." The beast died, and people were safe. The boy became famous for healing the blind and lepers by Allah''s permission. The king tried to kill the boy many times but failed. Finally, the boy told the king, "You can only kill me if you say ''In the name of Allah, the Lord of the boy'' before shooting an arrow." The king did so, and the boy died a martyr. Seeing this, all the people shouted, "We believe in the Lord of the boy!" The boy''s sacrifice brought the whole nation to the truth.',
  8,
  14
)
ON CONFLICT DO NOTHING;
