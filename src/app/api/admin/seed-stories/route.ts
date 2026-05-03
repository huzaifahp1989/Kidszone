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
        content: "Prophet Nuh (AS) called his people to Allah for 950 years, but they refused to listen. Allah commanded him to build a giant ship on dry land. People laughed at him, but Nuh kept working. When the flood came, water gushed from the earth and fell from the sky. Only those on the ship were saved. It reminds us to always trust Allah's plan, even when others mock us.",
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
        content: "A powerful king wanted people to worship him, but a young boy believed only in Allah. The king tried to harm the boy many times\u2014throwing him from a mountain, drowning him in the sea\u2014but Allah always saved him. Finally, the boy told the king the only way to kill him was to say \"In the name of the Lord of the boy.\" The king did so, and everyone who saw it realized that the boy's God was the true God. The boy sacrificed himself to guide his people to the truth.",
        age_min: 8,
        age_max: 14
      },
      {
        title: 'Prophet Yunus (Jonah) and the Rescue from Darkness',
        summary: 'A Quranic story about patience, sincere dua, and how Allah rescues those who turn back to Him.',
        content: "Prophet Yunus (peace be upon him) called his people to worship Allah, but many refused to listen. Feeling very upset, he left them before Allah had commanded him to go. Soon, he boarded a ship, and a great storm came. To save everyone, the passengers drew lots, and Yunus was chosen. He went into the sea, and Allah caused a huge fish to swallow him. In the deep darkness of the sea and the fish\u2019s belly, Yunus remembered that only Allah can save. He prayed sincerely: \u201cThere is no god except You. You are perfect. I was truly among the wrongdoers.\u201d Allah accepted his prayer and rescued him. Yunus was brought safely to shore, weak but alive, and Allah helped him recover. Yunus learned to be patient and to return to Allah with humility.\n\nReference: Qur\u2019an \u2014 Al-Anbiya (21:87-88) and As-Saffat (37:139-148).\nLesson: When we make mistakes, we should not despair\u2014turn back to Allah, ask forgiveness, and keep doing good.",
        age_min: 7,
        age_max: 12
      },
      {
        title: "The Little Pilgrim's First Hajj",
        summary: 'A young boy experiences the wonder of Hajj for the first time and learns that even small actions done sincerely for Allah are very special.',
        content: `Ali was only 7 years old, but today felt very special.

"Baba, are we really going to Hajj?" he asked, eyes wide with excitement.

His father smiled. "Yes, my son. We are going to the house of Allah."

When they reached Makkah, Ali saw the Kaaba for the first time. He stopped walking.

"It's\u2026 so big," he whispered.

His father held his hand. "Make a dua, Ali."

Ali raised his tiny hands and said, "O Allah, help me be a good boy."

They walked around the Kaaba together. Ali tried his best to keep up.

"Why are we walking in circles?" he asked.

"We are doing Tawaf," his father explained. "Just like the angels circle Allah's throne."

Ali smiled. "So I'm walking like the angels?"

"Yes," his father replied.

Ali felt proud. Even though his legs were tired, he kept going.

Lesson: Even small actions done sincerely for Allah are very special.`,
        age_min: 5,
        age_max: 10
      },
      {
        title: "Hajar's Trust in Allah",
        summary: 'The story of how Hajar ran between Safa and Marwa searching for water, and how Allah blessed her with Zamzam water.',
        content: `Long ago, in a hot desert, there was a mother named Hajar.

She had a little baby, Ismail.

One day, there was no water left.

Ismail began to cry.

Hajar ran to a hill called Safa.

She looked around. No water.

Then she ran to another hill called Marwa.

Still nothing.

She ran again\u2026 and again\u2026 seven times.

"Ya Allah, help us," she cried.

Suddenly, she heard something.

Water began to flow from the ground near Ismail!

It was the blessed Zamzam water.

Hajar smiled with tears in her eyes. Allah had helped her.

Lesson: Always trust Allah, even when things feel difficult.`,
        age_min: 5,
        age_max: 9
      },
      {
        title: 'The Brave Sacrifice',
        summary: "The story of Prophet Ibrahim's great test \u2014 being commanded to sacrifice his beloved son Ismail, and how Allah rewarded his obedience.",
        content: `Prophet Ibrahim loved his son Ismail very much.

One night, he had a dream.

Allah told him to sacrifice his son.

This was a very big test.

Ibrahim told Ismail, "My son, Allah has commanded me."

Ismail replied, "Father, do what Allah has told you. You will find me patient."

They both trusted Allah.

Just as Ibrahim was about to do it, Allah stopped him.

Instead, Allah sent a ram.

"You have passed the test," Allah revealed.

Lesson: Obeying Allah is always the right choice, even when it is hard.`,
        age_min: 5,
        age_max: 9
      },
      {
        title: 'Standing on Arafah',
        summary: 'A young girl learns the importance of the Day of Arafah and discovers that Allah listens to every dua, big or small.',
        content: `Fatimah stood with her mother on the plain of Arafah.

"Why is everyone raising their hands?" she asked.

Her mother replied, "Today is the most important day of Hajj. We ask Allah for forgiveness."

Fatimah looked around. Thousands of people were making dua.

She raised her hands too.

"O Allah, forgive me\u2026 and my family."

Tears rolled down her cheeks.

Her mother hugged her. "Allah loves when we ask Him."

Fatimah felt peaceful inside.

Lesson: Allah listens to every dua, big or small.`,
        age_min: 5,
        age_max: 9
      },
      {
        title: 'Throwing the Stones',
        summary: "A boy learns the meaning of Ramy al-Jamarat \u2014 throwing stones to resist Shaytan and choose what pleases Allah.",
        content: `Yusuf picked up small pebbles.

"Why are we throwing stones?" he asked.

His uncle explained, "We are copying Prophet Ibrahim. He threw stones at Shaytan when Shaytan tried to stop him from obeying Allah."

Yusuf held a pebble tightly.

"I don't like Shaytan," he said.

He threw the pebble.

"This is for when Shaytan tells me to do bad things!"

He threw another.

"And this is for when I don't listen to my parents!"

His uncle smiled.

"Good, Yusuf. We are learning to say NO to Shaytan."

Lesson: We should always resist bad thoughts and choose what pleases Allah.`,
        age_min: 5,
        age_max: 9
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
