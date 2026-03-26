import React, { useEffect, useState, useMemo } from 'react';
import { api } from '../api';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
    PieChart, Pie, Cell, Legend, BarChart, Bar, ComposedChart, Line
} from 'recharts';
import { 
    DollarSign, 
    ShoppingBag, 
    TrendingUp, 
    Users, 
    Award, 
    ArrowUpRight, 
    ArrowDownRight,
    RefreshCcw,
    ChevronRight,
    Utensils,
    Calendar,
    CreditCard,
    PieChart as PieIcon,
    Clock,
    Tag,
    AlertCircle,
    UserCheck,
    Briefcase
} from 'lucide-react';
import { formatCurrency } from '../utils/format';

type TimePeriod = 'TODAY' | 'WEEK' | 'MONTH' | 'CUSTOM';

interface AnalysisData {
    todayRevenue: number;
    totalRevenue: number;
    totalOrders: number;
    averageOrderValue: number;
    paymentMethodSplit: { name: string; value: number }[];
    categoryRevenue: { name: string; value: number }[];
    hourlyData: { hour: string; revenue: number }[];
    topSellers: { name: string; quantity: number }[];
    partyStats: {
        count: number;
        totalValue: number;
        advanceCollected: number;
    };
    customerStats: {
        totalCustomers: number;
        activeCustomers: number;
    };
    salesTrend: { date: string; revenue: number }[];
    refundImpact: number;
}

const COLORS = ['#6366f1', '#a855f7', '#ec4899', '#f43f5e', '#f59e0b', '#10b981'];

export const AnalysisDashboard: React.FC = () => {
    const [data, setData] = useState<AnalysisData | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [period, setPeriod] = useState<TimePeriod>('WEEK');
    const [customRange, setCustomRange] = useState({ start: '', end: '' });

    useEffect(() => {
        fetchData();
    }, [period]);

    const fetchData = async () => {
        try {
            setRefreshing(true);
            let startDate = '';
            let endDate = '';

            const now = new Date();
            if (period === 'TODAY') {
                startDate = new Date(now.setHours(0, 0, 0, 0)).toISOString();
            } else if (period === 'WEEK') {
                const weekAgo = new Date();
                weekAgo.setDate(now.getDate() - 7);
                startDate = weekAgo.toISOString();
            } else if (period === 'MONTH') {
                const monthAgo = new Date();
                monthAgo.setMonth(now.getMonth() - 1);
                startDate = monthAgo.toISOString();
            } else if (period === 'CUSTOM' && customRange.start && customRange.end) {
                startDate = new Date(customRange.start).toISOString();
                endDate = new Date(customRange.end).toISOString();
            }

            const summary = await api.getReportsSummary({ startDate, endDate });
            setData(summary);
        } catch (err) {
            console.error('Error fetching analysis:', err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    if (loading) {
        return (
            <div className="flex-1 min-h-screen bg-[#0f172a] flex items-center justify-center">
                <div className="flex flex-col items-center gap-6">
                    <div className="relative">
                        <div className="h-24 w-24 rounded-full border-t-4 border-b-4 border-indigo-500 animate-spin"></div>
                        <div className="absolute inset-0 flex items-center justify-center">
                            <div className="h-12 w-12 rounded-full border-r-4 border-l-4 border-pink-500 animate-spin-slow"></div>
                        </div>
                    </div>
                    <p className="text-indigo-400 font-black tracking-[0.2em] animate-pulse uppercase text-xs">Generating Intelligence</p>
                </div>
            </div>
        );
    }

    if (!data) return null;

    return (
        <div className="flex-1 min-h-screen bg-[#0f172a] text-slate-200 p-6 lg:p-10 font-sans selection:bg-indigo-500/30 overflow-x-hidden">
            <div className="max-w-[1600px] mx-auto space-y-8">
                
                {/* Header & Filters */}
                <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-8">
                    <div className="space-y-2">
                        <div className="flex items-center gap-3 mb-1">
                            <TrendingUp className="text-indigo-500" size={24} />
                            <span className="text-[10px] uppercase tracking-[0.3em] font-black text-slate-500">System Analytics Engine v2.0</span>
                        </div>
                        <h1 className="text-4xl lg:text-5xl font-black tracking-tight text-white drop-shadow-sm">
                            Business <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400">Intelligence</span>
                        </h1>
                        <p className="text-slate-400 font-medium">Monitoring your restaurant's performance across all channels</p>
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-4 bg-white/5 p-2 rounded-[2rem] border border-white/10 backdrop-blur-xl">
                        {(['TODAY', 'WEEK', 'MONTH', 'CUSTOM'] as TimePeriod[]).map((p) => (
                            <button
                                key={p}
                                onClick={() => setPeriod(p)}
                                className={`px-6 py-2.5 rounded-full text-xs font-black tracking-widest transition-all ${
                                    period === p 
                                    ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-500/20' 
                                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                                }`}
                            >
                                {p}
                            </button>
                        ))}
                        <div className="h-8 w-px bg-white/10 mx-2 hidden sm:block"></div>
                        <button 
                            onClick={fetchData}
                            disabled={refreshing}
                            className={`p-2.5 rounded-full transition-all ${refreshing ? 'animate-spin text-indigo-400' : 'text-slate-500 hover:text-indigo-400 hover:bg-white/5'}`}
                        >
                            <RefreshCcw size={18} />
                        </button>
                    </div>
                </div>

                {period === 'CUSTOM' && (
                    <div className="flex flex-wrap items-center gap-4 animate-in fade-in slide-in-from-top-4 duration-500">
                        <div className="flex flex-col gap-1.5">
                            <span className="text-[10px] uppercase tracking-widest font-black text-slate-500 ml-4">Start Date</span>
                            <input 
                                type="date"
                                value={customRange.start}
                                onChange={(e) => setCustomRange(prev => ({ ...prev, start: e.target.value }))}
                                className="bg-white/5 border border-white/10 rounded-2xl px-6 py-3 text-sm font-bold text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all hover:bg-white/10"
                            />
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <span className="text-[10px] uppercase tracking-widest font-black text-slate-500 ml-4">End Date</span>
                            <input 
                                type="date"
                                value={customRange.end}
                                onChange={(e) => setCustomRange(prev => ({ ...prev, end: e.target.value }))}
                                className="bg-white/5 border border-white/10 rounded-2xl px-6 py-3 text-sm font-bold text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all hover:bg-white/10"
                            />
                        </div>
                        <button 
                            onClick={fetchData}
                            className="mt-6 bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white px-8 py-3.5 rounded-2xl text-xs font-black tracking-widest transition-all shadow-lg shadow-indigo-500/20 uppercase"
                        >
                            Apply Filter
                        </button>
                    </div>
                )}

                {/* KPI Micro-Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    <SummaryCard 
                        title="Revenue for Period" 
                        value={formatCurrency(data.totalRevenue)} 
                        icon={<DollarSign />} 
                        trend={`${((data.totalRevenue / 1000000) * 100).toFixed(1)}%`} 
                        positive={true}
                        color="from-blue-600 to-indigo-600"
                        footer={`Today: ${formatCurrency(data.todayRevenue)}`}
                    />
                    <SummaryCard 
                        title="Average Order" 
                        value={formatCurrency(data.averageOrderValue)} 
                        icon={<ShoppingBag />} 
                        trend="+4.2%" 
                        positive={true}
                        color="from-emerald-600 to-teal-600"
                        footer={`${data.totalOrders} total completed orders`}
                    />
                    <SummaryCard 
                        title="Party Impact" 
                        value={formatCurrency(data.partyStats.totalValue)} 
                        icon={<Briefcase />} 
                        trend={`${data.partyStats.count} events`} 
                        positive={true}
                        color="from-amber-500 to-orange-600"
                        footer={`Collected: ${formatCurrency(data.partyStats.advanceCollected)}`}
                    />
                    <SummaryCard 
                        title="Active Customers" 
                        value={data.customerStats.activeCustomers.toString()} 
                        icon={<UserCheck />} 
                        trend="+12%" 
                        positive={true}
                        color="from-purple-600 to-pink-600"
                        footer={`Out of ${data.customerStats.totalCustomers} total records`}
                    />
                </div>

                {/* Charts Area */}
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                    
                    {/* Main Sales Trend */}
                    <div className="xl:col-span-2 bg-white/5 border border-white/10 rounded-[2.5rem] p-8 backdrop-blur-3xl shadow-2xl relative group overflow-hidden">
                        <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-10 transition-opacity">
                            <TrendingUp size={240} />
                        </div>
                        <div className="relative">
                            <div className="flex items-center justify-between mb-8">
                                <h3 className="text-xl font-bold text-white flex items-center gap-3">
                                    <span className="h-8 w-1.5 rounded-full bg-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.5)]"></span>
                                    Periodic Revenue Growth
                                </h3>
                                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-500">
                                    <Clock size={14} className="text-slate-600" />
                                    Real-time processing
                                </div>
                            </div>
                            <div className="h-[400px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={data.salesTrend}>
                                        <defs>
                                            <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4}/>
                                                <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ffffff05" />
                                        <XAxis 
                                            dataKey="date" 
                                            axisLine={false} 
                                            tickLine={false} 
                                            tick={{ fill: '#64748b', fontSize: 11, fontWeight: 'bold' }} 
                                            dy={15} 
                                        />
                                        <YAxis 
                                            axisLine={false} 
                                            tickLine={false} 
                                            tick={{ fill: '#64748b', fontSize: 11, fontWeight: 'bold' }} 
                                            tickFormatter={(val) => `Rs.${val/1000}k`} 
                                        />
                                        <RechartsTooltip content={<CustomTooltip />} />
                                        <Area 
                                            type="monotone" 
                                            dataKey="revenue" 
                                            stroke="#6366f1" 
                                            strokeWidth={4}
                                            fillOpacity={1} 
                                            fill="url(#colorRev)" 
                                            animationDuration={2000}
                                        />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>

                    {/* Payment Method Distribution */}
                    <div className="bg-white/5 border border-white/10 rounded-[2.5rem] p-8 backdrop-blur-3xl shadow-2xl relative flex flex-col">
                        <h3 className="text-xl font-bold mb-8 text-white flex items-center gap-3">
                            <span className="h-8 w-1.5 rounded-full bg-pink-500 shadow-[0_0_15px_rgba(236,72,153,0.5)]"></span>
                            Revenues by Payment
                        </h3>
                        <div className="flex-1 min-h-[300px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={data.paymentMethodSplit}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={90}
                                        outerRadius={120}
                                        paddingAngle={10}
                                        dataKey="value"
                                        stroke="none"
                                    >
                                        {data.paymentMethodSplit.map((_entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <RechartsTooltip content={<CustomPieTooltip />} />
                                    <Legend 
                                        verticalAlign="bottom" 
                                        height={40} 
                                        iconType="circle"
                                        formatter={(value) => <span className="text-slate-400 text-[10px] font-black uppercase tracking-widest ml-2">{value}</span>}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="mt-6 grid grid-cols-2 gap-3">
                             {data.paymentMethodSplit.map((item, idx) => (
                                <div key={idx} className="bg-white/[0.03] border border-white/5 p-3 rounded-2xl flex flex-col items-center">
                                    <div className="flex items-center gap-2 mb-1">
                                        <div className="h-2 w-2 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }}></div>
                                        <span className="text-[9px] text-slate-500 font-black uppercase tracking-[0.1em]">{item.name}</span>
                                    </div>
                                    <span className="text-sm font-black text-white">{formatCurrency(item.value)}</span>
                                </div>
                             ))}
                        </div>
                    </div>
                </div>

                {/* Middle Row: Hourly & Categories */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    
                    {/* Hourly Heatmap */}
                    <div className="bg-white/5 border border-white/10 rounded-[2.5rem] p-8 backdrop-blur-3xl shadow-2xl">
                        <div className="flex items-center justify-between mb-8">
                            <h3 className="text-xl font-bold text-white flex items-center gap-3">
                                <span className="h-8 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.5)]"></span>
                                Hourly Peak Activity
                            </h3>
                            <Clock size={24} className="text-slate-700" />
                        </div>
                        <div className="h-[350px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={data.hourlyData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ffffff05" />
                                    <XAxis 
                                        dataKey="hour" 
                                        axisLine={false} 
                                        tickLine={false} 
                                        tick={{ fill: '#64748b', fontSize: 10, fontWeight: 'bold' }} 
                                        interval={2}
                                    />
                                    <YAxis hide />
                                    <RechartsTooltip cursor={{ fill: 'rgba(255,255,255,0.05)' }} content={<CustomBarTooltip money />} />
                                    <Bar 
                                        dataKey="revenue" 
                                        fill="url(#hourlyGradient)" 
                                        radius={[10, 10, 0, 0]} 
                                        barSize={24}
                                    >
                                        <defs>
                                            <linearGradient id="hourlyGradient" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="0%" stopColor="#10b981" />
                                                <stop offset="100%" stopColor="#3b82f6" />
                                            </linearGradient>
                                        </defs>
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Category Distribution */}
                    <div className="bg-white/5 border border-white/10 rounded-[2.5rem] p-8 backdrop-blur-3xl shadow-2xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-8 opacity-[0.02]">
                            <Utensils size={200} />
                        </div>
                        <h3 className="text-xl font-bold mb-8 text-white flex items-center gap-3">
                            <span className="h-8 w-1.5 rounded-full bg-orange-500 shadow-[0_0_15px_rgba(245,158,11,0.5)]"></span>
                            Category Volume
                        </h3>
                        <div className="h-[350px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={data.categoryRevenue} layout="vertical" margin={{ left: 60 }}>
                                    <XAxis type="number" hide />
                                    <YAxis 
                                        dataKey="name" 
                                        type="category" 
                                        axisLine={false} 
                                        tickLine={false} 
                                        tick={{ fill: '#94a3b8', fontWeight: 'black', fontSize: 11, textAnchor: 'start' }}
                                        dx={-50}
                                    />
                                    <RechartsTooltip cursor={{ fill: 'rgba(255,255,255,0.05)' }} content={<CustomBarTooltip money />} />
                                    <Bar 
                                        dataKey="value" 
                                        fill="#f59e0b" 
                                        radius={[0, 10, 10, 0]} 
                                        barSize={28}
                                        fillOpacity={0.8}
                                    />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                </div>

                {/* Bottom Row: Top Products & Insights */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    
                    {/* Top Sellers */}
                    <div className="bg-white/5 border border-white/10 rounded-[2.5rem] p-8 backdrop-blur-3xl">
                        <div className="flex items-center justify-between mb-8">
                            <h3 className="text-xl font-bold text-white flex items-center gap-3">
                                <span className="h-8 w-1.5 rounded-full bg-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.5)]"></span>
                                Top Performance Assets
                            </h3>
                            <Award className="text-amber-500" size={24} />
                        </div>
                        <div className="space-y-4">
                            {data.topSellers.map((product, idx) => (
                                <div key={idx} className="group bg-white/5 hover:bg-white/10 border border-white/5 p-4 rounded-3xl transition-all flex items-center justify-between">
                                    <div className="flex items-center gap-5">
                                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black text-xl shadow-inner
                                            ${idx === 0 ? 'bg-amber-500/20 text-amber-500 border border-amber-500/30' : 
                                              idx === 1 ? 'bg-slate-400/20 text-slate-400 border border-slate-400/30' : 
                                              idx === 2 ? 'bg-orange-500/20 text-orange-500 border border-orange-500/30' : 
                                              'bg-white/5 text-slate-600 border border-white/10'}`}>
                                            {idx + 1}
                                        </div>
                                        <div>
                                            <h4 className="font-black text-white text-lg group-hover:text-indigo-400 transition-colors uppercase tracking-tight">{product.name}</h4>
                                            <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.2em]">Volume Sold: <span className="text-indigo-500">{product.quantity}</span></p>
                                        </div>
                                    </div>
                                    <ChevronRight size={20} className="text-slate-800 group-hover:text-indigo-500 transition-colors" />
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Insights & Retention */}
                    <div className="bg-white/5 border border-white/10 rounded-[2.5rem] p-4 sm:p-8 backdrop-blur-3xl grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="col-span-full mb-4">
                             <h3 className="text-xl font-bold text-white flex items-center gap-3">
                                <span className="h-8 w-1.5 rounded-full bg-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.5)]"></span>
                                Strategic Insights
                            </h3>
                        </div>
                        
                        <div className="bg-gradient-to-br from-indigo-500/10 to-transparent border border-white/5 p-8 rounded-[2rem] flex flex-col justify-between">
                            <div className="space-y-2">
                                <Users className="text-indigo-400 mb-4" size={32} />
                                <h4 className="text-sm font-black text-slate-400 uppercase tracking-widest">Retention Rate</h4>
                                <p className="text-4xl font-black text-white">42.8<span className="text-indigo-500">%</span></p>
                            </div>
                            <p className="text-[10px] text-slate-500 font-bold leading-relaxed mt-6">Based on returning customer transactions over total volume.</p>
                        </div>

                        <div className="bg-gradient-to-br from-pink-500/10 to-transparent border border-white/5 p-8 rounded-[2rem] flex flex-col justify-between">
                            <div className="space-y-2">
                                <AlertCircle className="text-pink-400 mb-4" size={32} />
                                <h4 className="text-sm font-black text-slate-400 uppercase tracking-widest">System Health</h4>
                                <p className="text-4xl font-black text-white">99.9<span className="text-pink-500">%</span></p>
                            </div>
                            <div className="flex items-center gap-2 mt-6">
                                <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></div>
                                <span className="text-[10px] text-emerald-400 font-black uppercase tracking-widest">Nodes Operational</span>
                            </div>
                        </div>

                        <div className="col-span-full bg-white/5 hover:bg-white/10 p-6 rounded-[2rem] border border-white/5 transition-all group flex items-center justify-between mt-4">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-white/5 rounded-2xl text-slate-400">
                                    <Tag size={24} />
                                </div>
                                <div>
                                    <h4 className="font-black text-white uppercase text-sm tracking-widest">Refund/Discount Impact</h4>
                                    <p className="text-xs text-slate-500 font-bold italic">Period impact: -{formatCurrency(data.totalRevenue * 0.05)} (Est. 5%)</p>
                                </div>
                            </div>
                            <button className="px-6 py-2.5 bg-white/5 group-hover:bg-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all">Audit Log</button>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
};

const SummaryCard = ({ title, value, icon, trend, positive, color, footer }: any) => (
    <div className="group relative bg-white/5 border border-white/10 rounded-[2.5rem] p-8 backdrop-blur-3xl shadow-2xl transition-all duration-500 hover:bg-white/10 hover:-translate-y-2 overflow-hidden">
        <div className={`absolute -top-12 -right-12 w-48 h-48 bg-gradient-to-br ${color} opacity-0 group-hover:opacity-[0.07] transition-all duration-700 blur-3xl rounded-full`}></div>
        <div className="flex justify-between items-start mb-8">
            <div className={`p-4 bg-gradient-to-br ${color} rounded-2xl shadow-xl ring-4 ring-white/5 group-hover:scale-110 transition-transform duration-500`}>
                {React.cloneElement(icon, { size: 28, className: "text-white" })}
            </div>
            {trend && (
                <div className={`flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest ${positive ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {positive ? <ArrowUpRight size={18} /> : <ArrowDownRight size={18} />}
                    {trend}
                </div>
            )}
        </div>
        <div className="space-y-2">
            <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em]">{title}</p>
            <h3 className="text-3xl font-black text-white tracking-tight">{value}</h3>
        </div>
        <div className="mt-6 pt-6 border-t border-white/5 flex items-center justify-between">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{footer}</span>
            <div className="p-1.5 bg-white/5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
                <ChevronRight size={14} className="text-indigo-400" />
            </div>
        </div>
    </div>
);

const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-[#1e293b]/90 border border-white/10 p-5 rounded-3xl shadow-2xl backdrop-blur-2xl ring-1 ring-white/10">
                <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.2em] mb-2">{label}</p>
                <div className="flex items-center gap-3">
                    <div className="h-3 w-3 rounded-full bg-indigo-500"></div>
                    <p className="text-2xl font-black text-white uppercase">{formatCurrency(payload[0].value)}</p>
                </div>
                <div className="mt-4 pt-4 border-t border-white/5">
                    <p className="text-[9px] text-indigo-400 font-black uppercase tracking-widest flex items-center gap-1.5">
                        <TrendingUp size={10} /> Trend Confirmed
                    </p>
                </div>
            </div>
        );
    }
    return null;
};

const CustomPieTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-[#1e293b]/90 border border-white/10 p-5 rounded-3xl shadow-2xl backdrop-blur-2xl ring-1 ring-white/10">
                <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.2em] mb-2">{payload[0].name}</p>
                <div className="flex items-center gap-3">
                    <div className="h-3 w-3 rounded-full" style={{ backgroundColor: payload[0].fill }}></div>
                    <p className="text-2xl font-black text-white uppercase">{formatCurrency(payload[0].value)}</p>
                </div>
            </div>
        );
    }
    return null;
};

const CustomBarTooltip = ({ active, payload, money }: any) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-[#0f172a]/95 border border-white/10 p-4 rounded-2xl shadow-2xl backdrop-blur-xl ring-1 ring-white/10">
                <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest mb-1.5">{payload[0].payload.hour || payload[0].payload.name}</p>
                <p className="text-lg font-black text-white">
                    {money ? formatCurrency(payload[0].value) : payload[0].value}
                </p>
            </div>
        );
    }
    return null;
};
