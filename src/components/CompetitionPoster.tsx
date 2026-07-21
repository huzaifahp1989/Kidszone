/* eslint-disable @next/next/no-img-element */

import React from 'react';
import Link from 'next/link';

type Props = {
  src: string;
  alt: string;
  href?: string;
};

export function CompetitionPoster({ src, alt, href }: Props) {
  const content = (
    <div className="rounded-3xl overflow-hidden border border-[#5eead4]/30 bg-white shadow-lg hover:shadow-xl transition-shadow">
      <div className="w-full bg-[#ccfbf1] flex items-center justify-center">
        <img
          src={src}
          alt={alt}
          className="w-full h-auto max-h-[75vh] object-contain block"
          loading="lazy"
        />
      </div>
    </div>
  );

  if (!href) return content;

  return (
    <Link href={href} className="block">
      {content}
    </Link>
  );
}
