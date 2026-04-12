'use client';

import React from 'react';

export function WeeklyWinnerDisplay() {
  const [today, setToday] = React.useState<string>('');
  React.useEffect(() => {
    setToday(new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }));
  }, []);

  return (
    <div className="w-full max-w-4xl mx-auto p-4">
      <div className="bg-gradient-to-r from-sky-100 to-blue-100 rounded-xl p-8 shadow-lg border-2 border-sky-300 relative overflow-hidden text-center">
        {/* Confetti Background Effect */}
        <div className="absolute inset-0 opacity-10 pointer-events-none" style={{
            backgroundImage: 'radial-gradient(circle, #7DD3FC 10%, transparent 10%)',
            backgroundSize: '20px 20px'
        }}></div>

        <div className="relative z-10 flex flex-col items-center gap-6">
          <div className="text-6xl animate-bounce drop-shadow-md">
            🏆
          </div>

          <div className="space-y-4 max-w-2xl">
            <div className="bg-white/70 rounded-2xl border border-sky-200 p-4">
              <p className="text-sm font-bold text-slate-600 uppercase tracking-wider">
                Winners{today ? ` • ${today}` : ''}
              </p>
              <p className="mt-2 text-2xl md:text-3xl font-black text-sky-900">Ammaan &amp; Sara</p>
            </div>

            <h2 className="text-3xl md:text-4xl font-extrabold text-sky-900">
              Enter Our Competitions!
            </h2>
            
            <p className="text-xl md:text-2xl font-bold text-sky-800 leading-relaxed">
              To enter our competitions please fill in this form so we can easily update the winners.
            </p>
            
            <p className="text-lg md:text-xl font-semibold text-red-600 bg-white/50 p-2 rounded-lg inline-block">
              ⚠️ If you don't fill in then your answers won't be counted.
            </p>

            <div className="pt-4">
              <a 
                href="https://docs.google.com/forms/d/e/1FAIpQLSeEVZHFkbYB6isXFrKrdsJszF3rho_3_NqlMHFYdIQ5SypKXg/viewform?usp=publish-editor"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block bg-sky-600 hover:bg-sky-700 text-white text-xl font-bold py-4 px-8 rounded-full transition-transform hover:scale-105 shadow-md border-b-4 border-sky-800"
              >
                📝 Fill Out Entry Form
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
