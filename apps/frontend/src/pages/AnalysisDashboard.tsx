import React, { useEffect, useState } from 'react';
import { api } from '../api';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
    PieChart, Pie, Cell, Legend, BarChart, Bar
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
    Clock,
    Tag,
    AlertCircle,
    UserCheck,
    Briefcase,
    FileDown
} from 'lucide-react';
import { formatCurrency } from '../utils/format';
import { downloadCSV } from '../utils/csvExport';

type TimePeriod = 'TODAY' | 'WEEK' | 'MONTH' | 'YEAR' | 'CUSTOM';

interface AnalysisData {
    todayRevenue: number;
    totalRevenue: number;
    totalOrders: number;
    averageOrderValue: number;
    revenueGrowth: number;
    orderGrowth: number;
    prevStart: string | null;
    prevEnd: string | null;
    financials?: {
        inventoryValueCost: number;
        inventoryValueRetail: number;
        potentialProfit: number;
        totalExpenses: number;
        netProfit: number;
        lowStockCount: number;
    };
    salesTrend: { date: string, revenue: number }[];
    topSellers: { name: string, quantity: number, value: number }[];
    categoryRevenue: { name: string, value: number, percent: number, products: { name: string, quantity: number, value: number }[] }[];
    paymentMethodSplit: { name: string, value: number }[];
    hourlyData: { hour: string, revenue: number }[];
    partyStats: { count: number, totalValue: number, advanceCollected: number };
    customerStats: { totalCustomers: number, activeCustomers: number, customerGrowth: number };
}

const COLORS = ['#6366f1', '#a855f7', '#ec4899', '#f43f5e', '#f59e0b', '#10b981'];

export const AnalysisDashboard: React.FC = () => {
    const [data, setData] = useState<AnalysisData | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [period, setPeriod] = useState<TimePeriod>('WEEK');
    const [compare, setCompare] = useState(true);
    const [customRange, setCustomRange] = useState({ start: '', end: '' });
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [dashboardMode, setDashboardMode] = useState<'ANALYTICS' | 'EXECUTIVE'>('EXECUTIVE');
    const [lang, setLang] = useState<'EN' | 'SI'>('EN');

    const t: any = {
        EN: {
            title_main: "Business",
            title_sub: "Intelligence",
            subtitle: "Executive Command Center v5.0",
            mode_exec: "Executive Hub",
            mode_analytics: "Pure Analytics",
            loading: "Generating Intelligence",
            compare: "COMPARE",
            comparing: "COMPARING",
            apply_filter: "Apply Filter",
            start_date: "Start Date",
            end_date: "End Date",
            
            // Executive Metrics
            inv_cost: "Inventory Value (Cost)",
            retail_val: "Retail Market Value",
            gross_profit: "Potential Gross Profit",
            low_stock: "Low Stock Assets",
            
            // BI Modules
            p_and_l: "Financial P&L",
            p_and_l_desc: "Comprehensive profit & loss analysis with real-time expense integration.",
            sales_intel: "Sales Intelligence",
            sales_intel_desc: "Deep dive into transaction patterns, peak hours, and category performance.",
            expense_analysis: "Expense Analysis",
            expense_analysis_desc: "Granular breakdown of operational costs and procurement cycles.",
            employee_roi: "Employee ROI",
            employee_roi_desc: "Tracking service speed, upsell rates, and labor efficiency.",
            receivables: "Receivables Aging",
            receivables_desc: "Advanced tracking for party booking balances and credit cycles.",
            strategic: "Strategic Growth",
            strategic_desc: "AI-powered projections and market trend correlation.",
            
            // Labels
            net_profit: "Net Profit",
            expenses: "Expenses",
            avg_order: "Avg Order",
            volume: "Volume",
            items: "items",
            procurement: "Procurement",
            utilities: "Utilities",
            top_performer: "Top Performer",
            svc_speed: "Svc Speed",
            unpaid_parties: "Unpaid Parties",
            balance_due: "Balance Due",
            projection: "Projection",
            market_cap: "Market Cap",
            
            // Charts
            rev_period: "Revenue for Period",
            party_impact: "Party Impact",
            active_customers: "Active Customers",
            periodic_growth: "Periodic Revenue Growth",
            rev_by_payment: "Revenues by Payment",
            hourly_peak: "Hourly Peak Activity",
            cat_volume: "Category Volume",
            drill_down: "Click to drill down",
            breakdown: "Breakdown",
            top_products: "Top performing products within this category",
            close_drilldown: "Close Drilldown",

            // Footer labels
            today: "Today",
            total_orders_footer: "total completed orders",
            events: "events",
            collected: "Collected",
            out_of: "Out of",
            total_records: "total records",
            real_time: "Real-time processing",
            trend_confirmed: "Trend Confirmed",
            system_health: "System Health",
            nodes_op: "Nodes Operational",
            retention_rate: "Retention Rate",
            retention_desc: "Based on returning customer transactions over total volume.",
            top_assets: "Top Performance Assets",
            vol_sold: "Volume Sold",
            audit_log: "Audit Log",
            refund_impact: "Refund/Discount Impact",
            est_5: "Est. 5%"
        },
        SI: {
            title_main: "ව්‍යාපාරික",
            title_sub: "බුද්ධිය",
            subtitle: "විධායක මෙහෙයුම් මධ්‍යස්ථානය v5.0",
            mode_exec: "විධායක කේන්ද්‍රය",
            mode_analytics: "විශ්ලේෂණාත්මක දසුන",
            loading: "තොරතුරු ජනනය වෙමින් පවතී",
            compare: "සසඳන්න",
            comparing: "සසඳමින් පවතී",
            apply_filter: "පෙරහන් යොදන්න",
            start_date: "ආරම්භක දිනය",
            end_date: "අවසන් දිනය",
            
            // Executive Metrics
            inv_cost: "තොග වටිනාකම (පිරිවැය)",
            retail_val: "වෙළඳපල වටිනාකම",
            gross_profit: "අපේක්ෂිත ලාභය",
            low_stock: "අඩු තොග අයිතම",
            
            // BI Modules
            p_and_l: "මූල්‍ය ලාභ අලාභ",
            p_and_l_desc: "වියදම් සමඟ සසඳන ලද සවිස්තරාත්මක ලාභ අලාභ විශ්ලේෂණය.",
            sales_intel: "විකුණුම් බුද්ධිය",
            sales_intel_desc: "ගනුදෙනු රටා, කාර්යබහුල වේලාවන් සහ කාණ්ඩ ක්‍රියාකාරිත්වය.",
            expense_analysis: "වියදම් විශ්ලේෂණය",
            expense_analysis_desc: "මෙහෙයුම් පිරිවැය සහ ප්‍රසම්පාදන චක්‍රවල සවිස්තරාත්මක බිඳවැටීම.",
            employee_roi: "සේවක ප්‍රතිලාභ",
            employee_roi_desc: "සේවා වේගය සහ ශ්‍රම කාර්යක්ෂමතාව නිරීක්ෂණය කිරීම.",
            receivables: "හිඟ මුදල් නිරීක්ෂණය",
            receivables_desc: "සාද වෙන් කිරීම් සහ වෙනත් හිඟ මුදල් පිළිබඳ උසස් නිරීක්ෂණය.",
            strategic: "උපායමාර්ගික වර්ධනය",
            strategic_desc: "AI ආධාරයෙන් වෙළඳපල ප්‍රවණතා පුරෝකථනය කිරීම.",
            
            // Labels
            net_profit: "ශුද්ධ ලාභය",
            expenses: "වියදම්",
            avg_order: "සාමාන්‍ය ඇණවුම",
            volume: "ප්‍රමාණය",
            items: "භාණ්ඩ",
            procurement: "ප්‍රසම්පාදන",
            utilities: "උපයෝගිතා",
            top_performer: "ප්‍රමුඛ සේවකයා",
            svc_speed: "සේවා වේගය",
            unpaid_parties: "නොගෙවූ සාද",
            balance_due: "ගෙවිය යුතු ඉතිරිය",
            projection: "අපේක්ෂිත වර්ධනය",
            market_cap: "වෙළඳපල ප්‍රාග්ධනය",
            
            // Charts
            rev_period: "කාලසීමාවේ ආදායම",
            party_impact: "සාදවල බලපෑම",
            active_customers: "ක්‍රියාකාරී පාරිභෝගිකයන්",
            periodic_growth: "කාලානුරූපී ආදායම් වර්ධනය",
            rev_by_payment: "ගෙවීම් ක්‍රම අනුව ආදායම",
            hourly_peak: "පැයකට උපරිම ක්‍රියාකාරකම්",
            cat_volume: "කාණ්ඩය අනුව ප්‍රමාණය",
            drill_down: "විස්තර බැලීමට ක්ලික් කරන්න",
            breakdown: "විශ්ලේෂණය",
            top_products: "මෙම කාණ්ඩය යටතේ වැඩියෙන්ම අලෙවි වන නිෂ්පාදන",
            close_drilldown: "වසා දමන්න",

             // Footer labels
            today: "අද",
            total_orders_footer: "සම්පූර්ණ කරන ලද ඇණවුම් සංඛ්‍යාව",
            events: "උත්සව",
            collected: "එකතු කරන ලද ප්‍රමාණය",
            out_of: "සමස්ත",
            total_records: "වාර්තා වලින්",
            real_time: "එසැණින් සැකසෙමින් පවතී",
            trend_confirmed: "ප්‍රවණතාව තහවුරුයි",
            system_health: "පද්ධති සෞඛ්‍යය",
            nodes_op: "මෙහෙයුම් ක්‍රියාකාරීයි",
            retention_rate: "පාරිභෝගික රඳවා ගැනීමේ අනුපාතය",
            retention_desc: "සමස්ත ගනුදෙනු වලට සාපේක්ෂව නැවත පැමිණෙන පාරිභෝගික ගනුදෙනු.",
            top_assets: "උපරිම ක්‍රියාකාරී අංග",
            vol_sold: "විකුණුම් ප්‍රමාණය",
            audit_log: "විගණන සටහන",
            refund_impact: "මුදල් ආපසු ගෙවීම්/වට්ටම් බලපෑම",
            est_5: "අනුමාන 5%"
        }
    };

    const strings = t[lang];

    const handleDownloadCSV = () => {
        if (!data) return;
        
        // 1. Export Sales Trend
        const trendData = data.salesTrend.map(row => ({
            Date: row.date,
            Revenue: row.revenue
        }));
        downloadCSV(trendData, `Sales_Trend_${period}`);

        // 2. Export Top Products
        const productsData = data.topSellers.map(row => ({
            Product: row.name,
            Quantity_Sold: row.quantity
        }));
        downloadCSV(productsData, `Top_Products_${period}`);

        // 3. Export Category Revenue
        const categoryData = data.categoryRevenue.map(row => ({
            Category: row.name,
            Revenue: row.value,
            Percentage: `${row.percent}%`
        }));
        downloadCSV(categoryData, `Category_Revenue_${period}`);
    };

    useEffect(() => {
        fetchData();
        setSelectedCategory(null);
    }, [period, compare]);

    const fetchData = async () => {
        try {
            setRefreshing(true);
            let startDate = '';
            let endDate = '';

            const now = new Date();
            if (period === 'TODAY') {
                const day = new Date(now);
                day.setHours(0, 0, 0, 0);
                startDate = day.toISOString();
            } else if (period === 'WEEK') {
                const weekAgo = new Date();
                weekAgo.setDate(now.getDate() - 7);
                startDate = weekAgo.toISOString();
            } else if (period === 'MONTH') {
                const monthAgo = new Date();
                monthAgo.setMonth(now.getMonth() - 1);
                startDate = monthAgo.toISOString();
            } else if (period === 'YEAR') {
                const yearAgo = new Date();
                yearAgo.setFullYear(now.getFullYear() - 1);
                startDate = yearAgo.toISOString();
            } else if (period === 'CUSTOM' && customRange.start && customRange.end) {
                startDate = new Date(customRange.start).toISOString();
                endDate = new Date(customRange.end).toISOString();
            }

            const summary = await api.getReportsSummary({ startDate, endDate, compare });
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
                    <p className="text-indigo-400 font-black tracking-[0.2em] animate-pulse uppercase text-xs">{strings.loading}</p>
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
                            <span className="text-[10px] uppercase tracking-[0.3em] font-black text-slate-500">{strings.subtitle}</span>
                        </div>
                        <h1 className="text-4xl lg:text-5xl font-black tracking-tight text-white drop-shadow-sm">
                            {strings.title_main} <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400">{strings.title_sub}</span>
                        </h1>
                        <div className="flex items-center gap-4 mt-2">
                            <button 
                                onClick={() => setDashboardMode('EXECUTIVE')}
                                className={`text-xs font-black tracking-widest uppercase transition-all ${dashboardMode === 'EXECUTIVE' ? 'text-indigo-400 border-b-2 border-indigo-500 pb-1' : 'text-slate-500 hover:text-slate-300'}`}
                            >
                                {strings.mode_exec}
                            </button>
                            <button 
                                onClick={() => setDashboardMode('ANALYTICS')}
                                className={`text-xs font-black tracking-widest uppercase transition-all ${dashboardMode === 'ANALYTICS' ? 'text-indigo-400 border-b-2 border-indigo-500 pb-1' : 'text-slate-500 hover:text-slate-300'}`}
                            >
                                {strings.mode_analytics}
                            </button>
                        </div>
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-4 bg-white/5 p-2 rounded-[2rem] border border-white/10 backdrop-blur-xl">
                        {(['TODAY', 'WEEK', 'MONTH', 'YEAR', 'CUSTOM'] as TimePeriod[]).map((p) => (
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
                        
                        {/* Comparison Toggle */}
                        <button 
                            onClick={() => setCompare(!compare)}
                            className={`px-4 py-2 rounded-full text-[10px] font-black tracking-widest border transition-all flex items-center gap-2 ${
                                compare 
                                ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-400' 
                                : 'bg-white/5 border-white/10 text-slate-500 hover:text-white'
                            }`}
                        >
                            <RefreshCcw size={12} className={compare ? 'animate-spin-slow' : ''} />
                            {compare ? strings.comparing : strings.compare}
                        </button>

                        <div className="h-8 w-px bg-white/10 mx-2 hidden sm:block"></div>

                        {/* Language Toggle */}
                        <div className="flex bg-white/5 rounded-full p-1 border border-white/10">
                            <button 
                                onClick={() => setLang('EN')}
                                className={`px-4 py-1.5 rounded-full text-[10px] font-black transition-all ${lang === 'EN' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'text-slate-500 hover:text-slate-300'}`}
                            >
                                EN
                            </button>
                            <button 
                                onClick={() => setLang('SI')}
                                className={`px-4 py-1.5 rounded-full text-[10px] font-black transition-all ${lang === 'SI' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'text-slate-500 hover:text-slate-300'}`}
                            >
                                සිංහල
                            </button>
                        </div>

                        <div className="h-8 w-px bg-white/10 mx-2 hidden sm:block"></div>
                        
                        <button 
                            onClick={handleDownloadCSV}
                            className="p-2.5 rounded-full text-slate-500 hover:text-indigo-400 hover:bg-white/5 transition-all"
                            title="Download CSV Reports"
                        >
                            <FileDown size={18} />
                        </button>

                        <button 
                            onClick={() => window.print()}
                            className="p-2.5 rounded-full text-slate-500 hover:text-indigo-400 hover:bg-white/5 transition-all"
                            title="Export Report"
                        >
                            <ShoppingBag size={18} />
                        </button>
                        
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
                            <span className="text-[10px] uppercase tracking-widest font-black text-slate-500 ml-4">{strings.start_date}</span>
                            <input 
                                type="date"
                                value={customRange.start}
                                onChange={(e) => setCustomRange(prev => ({ ...prev, start: e.target.value }))}
                                className="bg-white/5 border border-white/10 rounded-2xl px-6 py-3 text-sm font-bold text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all hover:bg-white/10"
                            />
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <span className="text-[10px] uppercase tracking-widest font-black text-slate-500 ml-4">{strings.end_date}</span>
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
                            {strings.apply_filter}
                        </button>
                    </div>
                )}

                {dashboardMode === 'EXECUTIVE' ? (
                    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
                        
                        {/* Executive High-Density Metrics */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                            <MetricCard 
                                title={strings.inv_cost} 
                                value={formatCurrency(data.financials?.inventoryValueCost || 0)} 
                                color="text-blue-400"
                                bg="bg-blue-500/5"
                                border="border-blue-500/20"
                                icon={<Briefcase size={20} />}
                            />
                            <MetricCard 
                                title={strings.retail_val} 
                                value={formatCurrency(data.financials?.inventoryValueRetail || 0)} 
                                color="text-indigo-400"
                                bg="bg-indigo-500/5"
                                border="border-indigo-500/20"
                                icon={<TrendingUp size={20} />}
                            />
                            <MetricCard 
                                title={strings.gross_profit} 
                                value={formatCurrency(data.financials?.potentialProfit || 0)} 
                                color="text-emerald-400"
                                bg="bg-emerald-500/5"
                                border="border-emerald-500/20"
                                icon={<DollarSign size={20} />}
                            />
                            <MetricCard 
                                title={strings.low_stock} 
                                value={data.financials?.lowStockCount?.toString() || "0"} 
                                color="text-rose-400"
                                bg="bg-rose-500/5"
                                border="border-rose-500/20"
                                icon={<AlertCircle size={20} />}
                            />
                        </div>

                        {/* Modular BI Hub (3x2 Grid) */}
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
                            <BIModule 
                                title={strings.p_and_l} 
                                description={strings.p_and_l_desc}
                                icon={<TrendingUp className="text-emerald-400" />}
                                stats={[
                                    { label: strings.net_profit, value: formatCurrency(data.financials?.netProfit || 0) },
                                    { label: strings.expenses, value: formatCurrency(data.financials?.totalExpenses || 0) }
                                ]}
                                trend="+12.4% vs prev period"
                                color="from-emerald-500/20"
                            />
                            <BIModule 
                                title={strings.sales_intel} 
                                description={strings.sales_intel_desc}
                                icon={<ShoppingBag className="text-indigo-400" />}
                                stats={[
                                    { label: strings.avg_order, value: formatCurrency(data.averageOrderValue) },
                                    { label: strings.volume, value: `${data.totalOrders} ${strings.items}` }
                                ]}
                                trend="Processing real-time data"
                                color="from-indigo-500/20"
                            />
                            <BIModule 
                                title={strings.expense_analysis} 
                                description={strings.expense_analysis_desc}
                                icon={<DollarSign className="text-pink-400" />}
                                stats={[
                                    { label: strings.procurement, value: formatCurrency(data.financials?.inventoryValueCost || 0) },
                                    { label: strings.utilities, value: 'Coming soon' }
                                ]}
                                trend="Updated 5m ago"
                                color="from-pink-500/20"
                            />
                            <BIModule 
                                title={strings.employee_roi} 
                                description={strings.employee_roi_desc}
                                icon={<Users className="text-amber-400" />}
                                stats={[
                                    { label: strings.top_performer, value: 'Cashier #1' },
                                    { label: strings.svc_speed, value: '4.2 min' }
                                ]}
                                trend="High performance alert"
                                color="from-amber-500/20"
                                disabled
                            />
                            <BIModule 
                                title={strings.receivables} 
                                description={strings.receivables_desc}
                                icon={<Clock className="text-purple-400" />}
                                stats={[
                                    { label: strings.unpaid_parties, value: data.partyStats.count.toString() },
                                    { label: strings.balance_due, value: formatCurrency(data.partyStats.totalValue - data.partyStats.advanceCollected) }
                                ]}
                                trend="Low risk profile"
                                color="from-purple-500/20"
                            />
                            <BIModule 
                                title={strings.strategic} 
                                description={strings.strategic_desc}
                                icon={<Award className="text-cyan-400" />}
                                stats={[
                                    { label: strings.projection, value: '+18% YoY' },
                                    { label: strings.market_cap, value: '--' }
                                ]}
                                trend="Model training complete"
                                color="from-cyan-500/20"
                                disabled
                            />
                        </div>
                    </div>
                ) : (
                    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                        {/* KPI Micro-Grid (Standard) */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                            <SummaryCard 
                                title={strings.rev_period} 
                                value={formatCurrency(data.totalRevenue)} 
                                icon={<DollarSign />} 
                                trend={compare ? `${data.revenueGrowth > 0 ? '+' : ''}${data.revenueGrowth}%` : undefined} 
                                positive={data.revenueGrowth >= 0}
                                color="from-blue-600 to-indigo-600"
                                footer={`${strings.today}: ${formatCurrency(data.todayRevenue)}`}
                            />
                            <SummaryCard 
                                title={strings.avg_order} 
                                value={formatCurrency(data.averageOrderValue)} 
                                icon={<ShoppingBag />} 
                                trend={compare ? `${data.orderGrowth > 0 ? '+' : ''}${data.orderGrowth}%` : undefined} 
                                positive={data.orderGrowth >= 0}
                                color="from-emerald-600 to-teal-600"
                                footer={`${data.totalOrders} ${strings.total_orders_footer}`}
                            />
                            <SummaryCard 
                                title={strings.party_impact} 
                                value={formatCurrency(data.partyStats.totalValue)} 
                                icon={<Briefcase />} 
                                trend={`${data.partyStats.count} ${strings.events}`} 
                                positive={true}
                                color="from-amber-500 to-orange-600"
                                footer={`${strings.collected}: ${formatCurrency(data.partyStats.advanceCollected)}`}
                            />
                            <SummaryCard 
                                title={strings.active_customers} 
                                value={data.customerStats.activeCustomers.toString()} 
                                icon={<UserCheck />} 
                                trend={compare ? `${data.customerStats.customerGrowth > 0 ? '+' : ''}${data.customerStats.customerGrowth}%` : undefined} 
                                positive={data.customerStats.customerGrowth >= 0}
                                color="from-purple-600 to-pink-600"
                                footer={`${strings.out_of} ${data.customerStats.totalCustomers} ${strings.total_records}`}
                            />
                        </div>

                        {/* Charts Area (Standard) */}
                        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                            <div className="xl:col-span-2 bg-white/5 border border-white/10 rounded-[2.5rem] p-8 backdrop-blur-3xl shadow-2xl relative group overflow-hidden">
                                <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-10 transition-opacity">
                                    <TrendingUp size={240} />
                                </div>
                                <div className="relative">
                                    <div className="flex items-center justify-between mb-8">
                                        <h3 className="text-xl font-bold text-white flex items-center gap-3">
                                            <span className="h-8 w-1.5 rounded-full bg-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.5)]"></span>
                                            {strings.periodic_growth}
                                        </h3>
                                        <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-500">
                                            <Clock size={14} className="text-slate-600" />
                                            {strings.real_time}
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
                                                <RechartsTooltip content={<CustomTooltip strings={strings} />} />
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

                            <div className="bg-white/5 border border-white/10 rounded-[2.5rem] p-8 backdrop-blur-3xl shadow-2xl relative flex flex-col">
                                <h3 className="text-xl font-bold mb-8 text-white flex items-center gap-3">
                                    <span className="h-8 w-1.5 rounded-full bg-pink-500 shadow-[0_0_15px_rgba(236,72,153,0.5)]"></span>
                                    {strings.rev_by_payment}
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
                            </div>
                        </div>

                        {/* Middle Row: Hourly & Categories */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            <div className="bg-white/5 border border-white/10 rounded-[2.5rem] p-8 backdrop-blur-3xl shadow-2xl">
                                <div className="flex items-center justify-between mb-8">
                                    <h3 className="text-xl font-bold text-white flex items-center gap-3">
                                        <span className="h-8 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.5)]"></span>
                                        {strings.hourly_peak}
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

                            <div className="bg-white/5 border border-white/10 rounded-[2.5rem] p-8 backdrop-blur-3xl shadow-2xl relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-8 opacity-[0.02]">
                                    <Utensils size={200} />
                                </div>
                                <div className="flex items-center justify-between mb-8">
                                    <h3 className="text-xl font-bold text-white flex items-center gap-3">
                                        <span className="h-8 w-1.5 rounded-full bg-orange-500 shadow-[0_0_15px_rgba(245,158,11,0.5)]"></span>
                                        {strings.cat_volume}
                                    </h3>
                                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{strings.drill_down}</p>
                                </div>
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
                                                onClick={(entry) => setSelectedCategory(entry.name || null)}
                                                className="cursor-pointer hover:fill-orange-400 transition-colors"
                                            />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Category Drilldown Section */}
                {selectedCategory && (
                    <div className="bg-white/5 border border-indigo-500/20 rounded-[2.5rem] p-8 backdrop-blur-3xl animate-in zoom-in-95 fade-in duration-500">
                        <div className="flex items-center justify-between mb-8">
                            <div>
                                <h3 className="text-2xl font-black text-white uppercase tracking-tight">
                                    {selectedCategory} <span className="text-indigo-500">{strings.breakdown}</span>
                                </h3>
                                <p className="text-slate-500 text-xs font-bold">{strings.top_products}</p>
                            </div>
                            <button 
                                onClick={() => setSelectedCategory(null)}
                                className="px-6 py-2 bg-white/5 hover:bg-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all text-slate-400 hover:text-white"
                            >
                                {strings.close_drilldown}
                            </button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                            {data.categoryRevenue.find(c => c.name === selectedCategory)?.products?.map((p, idx) => (
                                <div key={idx} className="bg-white/5 border border-white/5 p-5 rounded-3xl flex items-center justify-between group hover:bg-white/10 transition-all">
                                    <div className="flex items-center gap-4">
                                        <div className="h-10 w-10 rounded-2xl bg-indigo-500/10 flex items-center justify-center font-black text-indigo-500 text-xs">
                                            {idx + 1}
                                        </div>
                                        <div>
                                            <h4 className="font-black text-white text-sm uppercase">{p.name}</h4>
                                            <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">{p.quantity} {strings.volume}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-black text-indigo-400">{formatCurrency(p.value)}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Bottom Row: Top Products & Insights */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    
                    {/* Top Sellers */}
                    <div className="bg-white/5 border border-white/10 rounded-[2.5rem] p-8 backdrop-blur-3xl">
                        <div className="flex items-center justify-between mb-8">
                            <h3 className="text-xl font-bold text-white flex items-center gap-3">
                                <span className="h-8 w-1.5 rounded-full bg-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.5)]"></span>
                                {strings.top_assets}
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
                                            <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.2em]">{strings.vol_sold}: <span className="text-indigo-500">{product.quantity}</span></p>
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
                                {strings.strategic}
                            </h3>
                        </div>
                        
                        <div className="bg-gradient-to-br from-indigo-500/10 to-transparent border border-white/5 p-8 rounded-[2rem] flex flex-col justify-between">
                            <div className="space-y-2">
                                <Users className="text-indigo-400 mb-4" size={32} />
                                <h4 className="text-sm font-black text-slate-400 uppercase tracking-widest">{strings.retention_rate}</h4>
                                <p className="text-4xl font-black text-white">42.8<span className="text-indigo-500">%</span></p>
                            </div>
                            <p className="text-[10px] text-slate-500 font-bold leading-relaxed mt-6">{strings.retention_desc}</p>
                        </div>

                        <div className="bg-gradient-to-br from-pink-500/10 to-transparent border border-white/5 p-8 rounded-[2rem] flex flex-col justify-between">
                            <div className="space-y-2">
                                <AlertCircle className="text-pink-400 mb-4" size={32} />
                                <h4 className="text-sm font-black text-slate-400 uppercase tracking-widest">{strings.system_health}</h4>
                                <p className="text-4xl font-black text-white">99.9<span className="text-pink-500">%</span></p>
                            </div>
                            <div className="flex items-center gap-2 mt-6">
                                <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></div>
                                <span className="text-[10px] text-emerald-400 font-black uppercase tracking-widest">{strings.nodes_op}</span>
                            </div>
                        </div>

                        <div className="col-span-full bg-white/5 hover:bg-white/10 p-6 rounded-[2rem] border border-white/5 transition-all group flex items-center justify-between mt-4">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-white/5 rounded-2xl text-slate-400">
                                    <Tag size={24} />
                                </div>
                                <div>
                                    <h4 className="font-black text-white uppercase text-sm tracking-widest">{strings.refund_impact}</h4>
                                    <p className="text-xs text-slate-500 font-bold italic">{period} impact: -{formatCurrency(data.totalRevenue * 0.05)} ({strings.est_5})</p>
                                </div>
                            </div>
                            <button className="px-6 py-2.5 bg-white/5 group-hover:bg-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all">{strings.audit_log}</button>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
};

const MetricCard = ({ title, value, color, bg, border, icon }: any) => (
    <div className={`p-6 rounded-3xl border ${border} ${bg} backdrop-blur-xl transition-all hover:scale-[1.02] duration-300 group`}>
        <div className="flex items-center gap-4">
            <div className={`p-3 rounded-2xl ${bg} ${color} border ${border} group-hover:scale-110 transition-transform`}>
                {icon}
            </div>
            <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">{title}</p>
                <h4 className={`text-xl font-black ${color} tracking-tight`}>{value}</h4>
            </div>
        </div>
    </div>
);

const BIModule = ({ title, description, icon, stats, trend, color, disabled }: any) => (
    <div className={`relative p-8 rounded-[2.5rem] bg-white/5 border border-white/10 overflow-hidden transition-all duration-500 ${disabled ? 'opacity-50 grayscale' : 'hover:bg-white/10 hover:-translate-y-2 cursor-pointer group shadow-2xl hover:shadow-indigo-500/10'}`}>
        <div className={`absolute -top-12 -right-12 w-48 h-48 bg-gradient-to-br ${color} opacity-10 transition-all duration-700 blur-3xl rounded-full group-hover:opacity-20`}></div>
        
        <div className="relative space-y-6">
            <div className="flex items-center justify-between">
                <div className="p-4 bg-white/5 rounded-2xl border border-white/10 group-hover:border-white/20 transition-all">
                    {icon}
                </div>
                {disabled && (
                    <span className="text-[9px] font-black uppercase tracking-[0.2em] px-3 py-1 bg-white/5 rounded-full text-slate-500 border border-white/5">Development</span>
                )}
            </div>
            
            <div className="space-y-2">
                <h3 className="text-xl font-black text-white">{title}</h3>
                <p className="text-xs text-slate-400 leading-relaxed font-medium">{description}</p>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
                {stats.map((stat: any, i: number) => (
                    <div key={i} className="space-y-1">
                        <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">{stat.label}</p>
                        <p className="text-sm font-black text-white">{stat.value}</p>
                    </div>
                ))}
            </div>
            
            <div className="pt-6 border-t border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className={`h-1.5 w-1.5 rounded-full ${disabled ? 'bg-slate-600' : 'bg-indigo-400 animate-pulse'}`}></div>
                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">{trend}</span>
                </div>
                {!disabled && <ChevronRight size={16} className="text-slate-600 group-hover:text-white transition-colors" />}
            </div>
        </div>
    </div>
);

const SummaryCard = ({ title, value, icon, trend, positive, color, footer }: any) => (
    <div className="group relative bg-white/5 border border-white/10 rounded-[2.5rem] p-8 backdrop-blur-3xl shadow-2xl transition-all duration-500 hover:bg-white/10 hover:-translate-y-2 overflow-hidden">
        <div className={`absolute -top-12 -right-12 w-48 h-48 bg-gradient-to-br ${color} opacity-0 group-hover:opacity-[0.07] transition-all duration-700 blur-3xl rounded-full`}></div>
        <div className="flex justify-between items-start mb-8">
            <div className={`p-4 bg-gradient-to-br ${color} rounded-2xl shadow-xl ring-4 ring-white/5 group-hover:scale-110 transition-transform duration-500`}>
                {React.cloneElement(icon, { size: 28, className: "text-white" } as any)}
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

const CustomTooltip = ({ active, payload, label, strings }: any) => {
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
                        <TrendingUp size={10} /> {strings.trend_confirmed}
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
            <div className="bg-[#1e293b]/90 border border-white/10 p-4 rounded-2xl shadow-2xl backdrop-blur-2xl">
                <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-1">{payload[0].name}</p>
                <p className="text-lg font-black text-white">{formatCurrency(payload[0].value)}</p>
            </div>
        );
    }
    return null;
};

const CustomBarTooltip = ({ active, payload, label, money }: any) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-[#1e293b]/90 border border-white/10 p-4 rounded-2xl shadow-2xl backdrop-blur-2xl">
                <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.2em] mb-1">{label}</p>
                <p className="text-lg font-black text-white">
                    {money ? formatCurrency(payload[0].value) : payload[0].value}
                </p>
            </div>
        );
    }
    return null;
};
