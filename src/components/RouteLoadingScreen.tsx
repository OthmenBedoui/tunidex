import React from 'react';

const RouteLoadingScreen: React.FC<{ title: string; message: string }> = ({ title, message }) => (
  <div className="mx-auto max-w-3xl rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm">
    <div className="inline-flex rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-black uppercase tracking-[0.22em] text-indigo-700">
      Chargement
    </div>
    <h1 className="mt-4 text-3xl font-black text-slate-950">{title}</h1>
    <p className="mt-3 text-sm leading-7 text-slate-600">{message}</p>
  </div>
);

export default RouteLoadingScreen;
