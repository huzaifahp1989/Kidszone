import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function POST() {
  try {
    const stories = [
      {
        title: 'The Honest Merchant',
        summary: 'A story about the importance of honesty in business, inspired by the Prophet Muhammad (PBUH).',
        content: 'Once upon a time, there was a merchant who always told the truth. Even when he could make more money by lying about his goods, he refused. One day, a man came to buy a camel. The merchant showed him a camel but pointed out a small limp it had. "Why did you tell me?" asked the buyer. "Because honesty is better than gold," replied the merchant. The buyer was so impressed that he bought the camel and told everyone about the honest merchant.',
        age_min: 6,
        age_max: 10
      },
      {
        title: 'The Crying Camel',
        summary: 'How the Prophet (PBUH) showed kindness to animals and taught us to treat them well.',
        content: 'One day, the Prophet Muhammad (PBUH) entered a garden and saw a camel. When the camel saw the Prophet, it started to cry. The Prophet went to the camel, wiped its tears, and patted it gently. He asked, "Who owns this camel?" A young man came forward. The Prophet told him, "Fear Allah with regard to this animal! It has complained to me that you starve it and overwork it." The young man promised to treat the camel better from that day on.',
        age_min: 5,
        age_max: 9
      },
      {
        title: 'The Boy Who Threw Stones',
        summary: 'A lesson on patience and teaching with kindness instead of anger.',
        content: 'A young boy was throwing stones at date palm trees to make the dates fall. The owner of the garden was angry and took the boy to the Prophet (PBUH). instead of scolding him, the Prophet gently asked, "Why do you throw stones?" The boy said, "I am hungry." The Prophet said, "Do not throw stones, but eat what falls on the ground." Then he prayed for the boy, "O Allah, fill his stomach." The boy learned a lesson and never threw stones again.',
        age_min: 7,
        age_max: 12
      },
      {
        title: 'The Ant and the Prophet Sulaiman',
        summary: 'A story about the greatness of Prophet Sulaiman and his respect for even the smallest creatures.',
        content: 'Prophet Sulaiman (AS) was marching with his great army. They came to a valley of ants. One ant cried out, "O ants! Enter your homes so Sulaiman and his army do not crush you without knowing!" Prophet Sulaiman heard this and smiled. He thanked Allah for his ability to understand animals and ordered his entire army to change their path to save the tiny ants.',
        age_min: 6,
        age_max: 11
      },
      {
        title: 'The Woman Who Fed the Dog',
        summary: 'How a simple act of kindness can lead to Jannah.',
        content: 'A woman was walking in the desert and was very thirsty. She found a well and drank. Then she saw a dog panting from thirst, licking the mud. She thought, "This dog is as thirsty as I was." She climbed down the well, filled her shoe with water, and gave it to the dog. Allah was pleased with her kindness and forgave her sins.',
        age_min: 8,
        age_max: 14
      },
      {
        title: 'The Ship of Nuh (Noah)',
        summary: 'The story of the great flood and the ark that saved the believers and animals.',
        content: 'Prophet Nuh (AS) called his people to Allah for 950 years, but they refused to listen. Allah commanded him to build a giant ship on dry land. People laughed at him, but Nuh kept working. When the flood came, water gushed from the earth and fell from the sky. Only those on the ship were saved. It reminds us to always trust Allah’s plan, even when others mock us.',
        age_min: 5,
        age_max: 10
      },
      {
        title: 'The Spider and the Cave',
        summary: 'How a tiny spider helped save the Prophet (PBUH) during the Hijrah.',
        content: 'When Prophet Muhammad (PBUH) and Abu Bakr were migrating to Madinah, they hid in the Cave of Thawr. The enemies were chasing them and came right to the mouth of the cave. But Allah sent a spider to spin a web across the entrance and a bird to lay eggs there. The enemies saw the web and thought, "No one could have entered here without breaking this web." They left, and the Prophet was safe. Even the smallest soldier of Allah can make a big difference.',
        age_min: 6,
        age_max: 12
      },
      {
        title: 'The Boy and the King',
        summary: 'The story of a brave boy whose faith was stronger than a powerful king.',
        content: 'A powerful king wanted people to worship him, but a young boy believed only in Allah. The king tried to harm the boy many times—throwing him from a mountain, drowning him in the sea—but Allah always saved him. Finally, the boy told the king the only way to kill him was to say "In the name of the Lord of the boy." The king did so, and everyone who saw it realized that the boy’s God was the true God. The boy sacrificed himself to guide his people to the truth.',
        age_min: 8,
        age_max: 14
      },
      {
        title: 'Prophet Yunus (Jonah) and the Rescue from Darkness',
        summary: 'A Quranic story about patience, sincere dua, and how Allah rescues those who turn back to Him.',
        content:
          'Prophet Yunus (peace be upon him) called his people to worship Allah, but many refused to listen. Feeling very upset, he left them before Allah had commanded him to go. Soon, he boarded a ship, and a great storm came. To save everyone, the passengers drew lots, and Yunus was chosen. He went into the sea, and Allah caused a huge fish to swallow him. In the deep darkness of the sea and the fish’s belly, Yunus remembered that only Allah can save. He prayed sincerely: “There is no god except You. You are perfect. I was truly among the wrongdoers.” Allah accepted his prayer and rescued him. Yunus was brought safely to shore, weak but alive, and Allah helped him recover. Yunus learned to be patient and to return to Allah with humility.\n\nReference: Qur’an — Al-Anbiya (21:87-88) and As-Saffat (37:139-148).\nLesson: When we make mistakes, we should not despair—turn back to Allah, ask forgiveness, and keep doing good.\n\nComplete the quiz to earn 100 points!',
        age_min: 7,
        age_max: 12
      }
    ];

    const { error } = await supabaseAdmin
      .from('stories')
      .upsert(stories, { onConflict: 'title' });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, count: stories.length });
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
