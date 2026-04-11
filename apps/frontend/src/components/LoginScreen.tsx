import { useState } from 'react';
import { Store, KeyRound, Eraser, Delete, Eye, EyeOff, User, Lock as LockIcon, Languages, ShieldCheck, ChevronRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';

export const LoginScreen = () => {
    const [mode, setMode] = useState<'PIN' | 'PASSWORD'>('PIN');
    const [pin, setPin] = useState('');
    const [emailOrName, setEmailOrName] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [showPin, setShowPin] = useState(false);
    const [lang, setLang] = useState<'EN' | 'SI'>('EN');
    const { login, loginWithPassword } = useAuth();

    const t = {
        EN: {
            title: 'Teddy POS',
            subtitle: 'Secure Access Terminal',
            pinMode: 'Staff PIN',
            adminMode: 'Admin Login',
            pinPlaceholder: 'Enter your secure PIN',
            adminPlaceholder: 'Email or Username',
            passPlaceholder: 'Password',
            loginBtn: 'Login to System',
            poweredBy: 'Powered by Premium Nexus',
            invalid: 'Invalid Credentials or Server Error',
            welcome: 'Welcome Back',
            selectMode: 'Select Access Method'
        },
        SI: {
            title: 'Teddy POS',
            subtitle: 'ආරක්ෂිත ප්‍රවේශ පද්ධතිය',
            pinMode: 'කාර්ය මණ්ඩල PIN',
            adminMode: 'පරිපාලක පිවිසුම',
            pinPlaceholder: 'ඔබේ PIN අංකය ඇතුළත් කරන්න',
            adminPlaceholder: 'විද්‍යුත් තැපෑල හෝ නම',
            passPlaceholder: 'මුරපදය',
            loginBtn: 'පද්ධතියට පිවිසෙන්න',
            poweredBy: 'Premium Nexus මගින් බලගන්වන ලදී',
            invalid: 'වැරදි දත්ත හෝ සේවාදායක දෝෂයක්',
            welcome: 'නැවත සාදරයෙන් පිළිගනිමු',
            selectMode: 'ප්‍රවේශ ක්‍රමය තෝරන්න'
        }
    }[lang];

    const handleInput = (num: string) => {
        if (pin.length < 6) {
            setPin((prev) => prev + num);
        }
    };

    const handleDelete = () => {
        setPin((prev) => prev.slice(0, -1));
    };

    const handleClear = () => {
        setPin('');
    };

    const handleSubmit = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        
        try {
            setIsLoading(true);
            if (mode === 'PIN') {
                if (!pin) return;
                await login(pin);
            } else {
                if (!emailOrName || !password) {
                    toast.error('Please enter both email and password');
                    return;
                }
                await loginWithPassword(emailOrName, password);
            }
            toast.success('Login Successful!');
        } catch (error: any) {
            toast.error(error?.response?.data?.error || t.invalid);
            if (mode === 'PIN') setPin('');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen bg-[#0f172a] overflow-hidden font-sans relative">
            {/* Background Decorative Elements */}
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/20 blur-[120px] rounded-full pointer-events-none" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-600/20 blur-[120px] rounded-full pointer-events-none" />

            {/* Left side branding */}
            <div className="flex-1 hidden lg:flex flex-col items-center justify-center p-12 text-white z-10 relative overflow-hidden">
                <div className="absolute inset-0 bg-white/[0.02] backdrop-blur-[2px]" />
                <div className="relative group perspective-1000">
                    <div className="bg-gradient-to-br from-blue-500/20 to-indigo-500/20 p-8 rounded-[2.5rem] backdrop-blur-xl border border-white/10 mb-10 shadow-2xl transition-transform duration-500 group-hover:scale-105 group-hover:rotate-3">
                        <Store size={100} className="text-blue-400 drop-shadow-[0_0_15px_rgba(96,165,250,0.5)]" />
                    </div>
                </div>
                <h1 className="text-7xl font-black mb-6 tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-white via-blue-100 to-white/60">
                    {t.title}
                </h1>
                <p className="text-2xl text-blue-200/60 font-medium tracking-widest uppercase mb-12">
                    {t.subtitle}
                </p>
                
                <div className="grid grid-cols-2 gap-4 w-full max-w-md">
                    <div className="p-6 rounded-2xl bg-white/5 border border-white/5 backdrop-blur-sm">
                        <ShieldCheck className="text-green-400 mb-3" size={24} />
                        <div className="text-sm font-bold text-white/80">End-to-End Encryption</div>
                    </div>
                    <div className="p-6 rounded-2xl bg-white/5 border border-white/5 backdrop-blur-sm">
                        <KeyRound className="text-blue-400 mb-3" size={24} />
                        <div className="text-sm font-bold text-white/80">Biometric Ready</div>
                    </div>
                </div>

                <div className="absolute bottom-10 flex items-center gap-3 text-white/30 text-xs font-bold tracking-[0.2em] uppercase">
                    <div className="w-10 h-[1px] bg-white/20" />
                    {t.poweredBy}
                    <div className="w-10 h-[1px] bg-white/20" />
                </div>
            </div>

            {/* Right side Login Form */}
            <div className="flex-1 flex flex-col items-center justify-center p-6 z-20">
                <div className="w-full max-w-[420px] bg-white/[0.03] backdrop-blur-2xl p-10 rounded-[3rem] shadow-[0_20px_50px_rgba(0,0,0,0.3)] border border-white/10 relative overflow-hidden group">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-blue-500 to-transparent opacity-50" />
                    
                    {/* Header */}
                    <div className="flex justify-between items-start mb-10">
                        <div className="text-left">
                            <h2 className="text-3xl font-black text-white tracking-tight leading-none mb-2">{t.welcome}</h2>
                            <p className="text-slate-400 font-medium text-sm">{t.selectMode}</p>
                        </div>
                        <button 
                            onClick={() => setLang(lang === 'EN' ? 'SI' : 'EN')}
                            className="bg-white/5 hover:bg-white/10 p-2.5 rounded-2xl border border-white/10 transition-all flex items-center gap-2 group/btn"
                        >
                            <Languages size={18} className="text-blue-400 transition-transform group-hover/btn:rotate-12" />
                            <span className="text-xs font-bold text-white/70">{lang}</span>
                        </button>
                    </div>

                    {/* Mode Toggle */}
                    <div className="flex p-1.5 bg-black/40 rounded-[1.5rem] mb-8 border border-white/5">
                        <button
                            onClick={() => setMode('PIN')}
                            className={`flex-1 py-3 rounded-2xl text-xs font-black tracking-widest uppercase transition-all flex items-center justify-center gap-2 ${
                                mode === 'PIN' ? 'bg-blue-600 shadow-lg text-white' : 'text-slate-500 hover:text-slate-300'
                            }`}
                        >
                            <KeyRound size={16} />
                            {t.pinMode}
                        </button>
                        <button
                            onClick={() => setMode('PASSWORD')}
                            className={`flex-1 py-3 rounded-2xl text-xs font-black tracking-widest uppercase transition-all flex items-center justify-center gap-2 ${
                                mode === 'PASSWORD' ? 'bg-indigo-600 shadow-lg text-white' : 'text-slate-500 hover:text-slate-300'
                            }`}
                        >
                            <User size={16} />
                            {t.adminMode}
                        </button>
                    </div>

                    {mode === 'PIN' ? (
                        /* PIN UI */
                        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                            {/* PIN Display */}
                            <div className="bg-black/40 rounded-3xl p-6 mb-8 flex justify-between items-center shadow-inner border border-white/5">
                                <div className="flex justify-center flex-1 gap-4 text-4xl font-black">
                                    {pin.padEnd(6, '○').split('').map((char, idx) => (
                                        <span key={idx} className={char !== '○' ? 'text-blue-400 animate-pulse' : 'text-slate-700'}>
                                            {showPin && char !== '○' ? char : (char !== '○' ? '•' : '○')}
                                        </span>
                                    ))}
                                </div>
                                <button
                                    onClick={() => setShowPin(!showPin)}
                                    className="text-slate-500 hover:text-blue-400 p-2.5 rounded-xl transition-all hover:bg-white/5"
                                >
                                    {showPin ? <EyeOff size={20} /> : <Eye size={20} />}
                                </button>
                            </div>

                            {/* Numpad */}
                            <div className="grid grid-cols-3 gap-4 mb-8">
                                {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
                                    <button
                                        key={num}
                                        onClick={() => handleInput(num)}
                                        className="aspect-square bg-white/[0.03] hover:bg-blue-600 hover:shadow-[0_0_20px_rgba(37,99,235,0.4)] hover:scale-105 active:scale-95 rounded-2xl text-2xl font-black text-white/90 border border-white/5 hover:border-blue-400/50 transition-all duration-200 flex items-center justify-center"
                                    >
                                        {num}
                                    </button>
                                ))}
                                <button onClick={handleClear} className="aspect-square bg-red-500/10 hover:bg-red-500 rounded-2xl text-red-400 hover:text-white transition-all duration-200 flex items-center justify-center border border-red-500/20"><Eraser size={24} /></button>
                                <button onClick={() => handleInput('0')} className="aspect-square bg-white/[0.03] hover:bg-blue-600 rounded-2xl text-2xl font-black text-white border border-white/5 flex items-center justify-center transition-all duration-200">0</button>
                                <button onClick={handleDelete} className="aspect-square bg-white/[0.05] hover:bg-white/10 rounded-2xl text-white/80 border border-white/5 flex items-center justify-center transition-all duration-200"><Delete size={24} /></button>
                            </div>
                        </div>
                    ) : (
                        /* Password UI */
                        <form onSubmit={handleSubmit} className="space-y-4 mb-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="relative group/field">
                                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within/field:text-indigo-400 transition-colors" size={20} />
                                <input
                                    type="text"
                                    placeholder={t.adminPlaceholder}
                                    value={emailOrName}
                                    onChange={(e) => setEmailOrName(e.target.value)}
                                    className="w-full bg-black/40 border border-white/10 focus:border-indigo-500/50 focus:ring-4 focus:ring-indigo-500/10 rounded-2xl py-4 pl-12 pr-4 text-white placeholder:text-slate-600 transition-all outline-none"
                                />
                            </div>
                            <div className="relative group/field">
                                <LockIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within/field:text-indigo-400 transition-colors" size={20} />
                                <input
                                    type={showPin ? "text" : "password"}
                                    placeholder={t.passPlaceholder}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full bg-black/40 border border-white/10 focus:border-indigo-500/50 focus:ring-4 focus:ring-indigo-500/10 rounded-2xl py-4 pl-12 pr-12 text-white placeholder:text-slate-600 transition-all outline-none"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPin(!showPin)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
                                >
                                    {showPin ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                        </form>
                    )}

                    {/* Submit Button */}
                    <button
                        onClick={handleSubmit}
                        disabled={isLoading || (mode === 'PIN' ? pin.length === 0 : !emailOrName || !password)}
                        className={`w-full py-5 rounded-[1.5rem] flex items-center justify-center text-sm font-black tracking-widest uppercase transition-all shadow-xl active:scale-95 group/submit ${
                            isLoading || (mode === 'PIN' ? pin.length === 0 : !emailOrName || !password)
                                ? 'bg-white/5 text-slate-600 cursor-not-allowed border border-white/5'
                                : mode === 'PIN' 
                                    ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white hover:from-blue-500 hover:to-blue-400 shadow-blue-600/20'
                                    : 'bg-gradient-to-r from-indigo-600 to-indigo-500 text-white hover:from-indigo-500 hover:to-indigo-400 shadow-indigo-600/20'
                        }`}
                    >
                        {isLoading ? (
                            <div className="w-5 h-5 border-3 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            <>
                                {t.loginBtn}
                                <ChevronRight size={18} className="ml-2 transition-transform group-hover/submit:translate-x-1" />
                            </>
                        )}
                    </button>
                    
                    <div className="mt-8 text-center lg:hidden">
                        <div className="text-white/20 text-[10px] font-bold tracking-[0.2em] uppercase">{t.poweredBy}</div>
                    </div>
                </div>
            </div>
        </div>
    );
};
