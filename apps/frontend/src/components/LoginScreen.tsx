import { useState } from 'react';
import { Store, KeyRound, Eraser, Delete, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';

export const LoginScreen = () => {
    const [pin, setPin] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [showPin, setShowPin] = useState(false);
    const { login } = useAuth();

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

    const handleSubmit = async () => {
        if (!pin) return;

        try {
            setIsLoading(true);
            await login(pin);
            toast.success('Login Successful!');
        } catch (error: any) {
            toast.error(error?.response?.data?.message || 'Invalid PIN or Server Error');
            setPin('');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen bg-slate-900 overflow-hidden font-sans">
            {/* Left side branding */}
            <div className="flex-1 bg-gradient-to-br from-blue-700 to-slate-900 hidden md:flex flex-col items-center justify-center p-12 text-white shadow-2xl z-10">
                <div className="bg-white/10 p-6 rounded-3xl backdrop-blur-sm border border-white/20 mb-8 shadow-xl">
                    <Store size={80} className="text-blue-300 drop-shadow-md" />
                </div>
                <h1 className="text-6xl font-black mb-4 tracking-tight drop-shadow-lg text-center">Teddy POS</h1>
                <p className="text-xl text-blue-200 font-medium tracking-wide">Enter PIN to Unlock</p>
                <div className="absolute bottom-8 text-blue-400/50 text-sm">Powered by Premium Nexus</div>
            </div>

            {/* Right side PIN pad */}
            <div className="flex-1 flex flex-col items-center justify-center bg-slate-50 p-6 z-20">
                <div className="w-full max-w-sm bg-white p-8 rounded-[2rem] shadow-2xl border border-slate-100 relative">
                    <div className="text-center mb-8">
                        <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-blue-600 shadow-inner">
                            <KeyRound size={28} />
                        </div>
                        <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Access Terminal</h2>
                        <p className="text-slate-500 font-medium text-sm mt-1">Please enter your secure Cashier PIN</p>
                    </div>

                    {/* PIN Display */}
                    <div className="bg-slate-100 rounded-2xl p-4 mb-6 flex justify-between items-center shadow-inner relative group border border-slate-200">
                        <div className="flex justify-center flex-1 gap-2 tracking-[0.5em] text-3xl font-mono text-slate-800 font-black">
                            {pin.padEnd(6, '*').split('').map((char, idx) => (
                                <span key={idx} className={char !== '*' ? 'text-blue-600' : 'text-slate-300'}>
                                    {showPin && char !== '*' ? char : (char !== '*' ? '•' : '○')}
                                </span>
                            ))}
                        </div>
                        <button
                            onClick={() => setShowPin(!showPin)}
                            className="text-slate-400 hover:text-blue-500 p-2 rounded-xl transition-colors shrink-0 bg-white shadow-sm border border-slate-200"
                        >
                            {showPin ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                    </div>

                    {/* Numpad */}
                    <div className="grid grid-cols-3 gap-3 mb-6">
                        {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
                            <button
                                key={num}
                                onClick={() => handleInput(num)}
                                className="aspect-square bg-slate-50 hover:bg-slate-100 active:bg-slate-200 rounded-xl text-2xl font-bold text-slate-700 shadow-sm border border-slate-200 hover:border-slate-300 transition-all duration-150 active:scale-95 flex items-center justify-center"
                            >
                                {num}
                            </button>
                        ))}

                        <button
                            onClick={handleClear}
                            className="aspect-square bg-red-50 hover:bg-red-100 active:bg-red-200 rounded-xl text-red-600 shadow-sm border border-red-100 transition-all duration-150 active:scale-95 flex items-center justify-center font-semibold"
                        >
                            <Eraser size={24} />
                        </button>

                        <button
                            onClick={() => handleInput('0')}
                            className="aspect-square bg-slate-50 hover:bg-slate-100 active:bg-slate-200 rounded-xl text-2xl font-bold text-slate-700 shadow-sm border border-slate-200 transition-all duration-150 active:scale-95 flex items-center justify-center"
                        >
                            0
                        </button>

                        <button
                            onClick={handleDelete}
                            className="aspect-square bg-slate-100 hover:bg-slate-200 active:bg-slate-300 rounded-xl text-slate-600 shadow-sm border border-slate-200 transition-all duration-150 active:scale-95 flex items-center justify-center"
                        >
                            <Delete size={24} />
                        </button>
                    </div>

                    {/* Submit Button */}
                    <button
                        onClick={handleSubmit}
                        disabled={pin.length === 0 || isLoading}
                        className={`w-full py-4 rounded-xl flex items-center justify-center text-lg font-bold transition-all shadow-md active:scale-95 ${pin.length > 0 && !isLoading
                                ? 'bg-blue-600 text-white hover:bg-blue-700 hover:shadow-lg'
                                : 'bg-slate-200 text-slate-400 cursor-not-allowed border border-slate-300'
                            }`}
                    >
                        {isLoading ? (
                            <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            'Login to System'
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};
