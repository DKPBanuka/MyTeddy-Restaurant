export function PlaceholderPage({ title }: { title: string }) {
    return (
        <main className="flex-1 flex flex-col h-full overflow-hidden bg-slate-50 items-center justify-center">
            <div className="bg-white p-12 rounded-3xl shadow-sm border border-slate-100 text-center max-w-md w-full">
                <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
                </div>
                <h1 className="text-2xl font-black text-slate-800 tracking-tight mb-2">{title}</h1>
                <p className="text-slate-500 font-medium">This module is part of the integrated POS Business Management System and is currently under construction.</p>
            </div>
        </main>
    );
}
