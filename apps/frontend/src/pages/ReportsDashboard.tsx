import React, { useEffect, useState } from 'react';
import { api } from '../api';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
    PieChart, Pie, Cell, Legend
} from 'recharts';
import { DollarSign, ShoppingBag, TrendingUp, AlertCircle } from 'lucide-react';
import { formatCurrency } from '../utils/format';

interface ReportSummary {
    todayRevenue: number;
    totalOrders: number;
    averageOrderValue: number;
    revenueSplit: { name: string; value: number }[];
    salesTrend: { date: string; revenue: number }[];
    topSellers: { name: string; quantity: number }[];
}

const COLORS = ['#2563eb', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

export const ReportsDashboard: React.FC = () => {
    const [data, setData] = useState<ReportSummary | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const summary = await api.getReportsSummary();
            setData(summary);
            setError(null);
        } catch (err: any) {
            console.error('Error fetching reports:', err);
            setError('Failed to load report data. Please ensure backend services are running.');
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex-1 p-8 flex items-center justify-center bg-gray-50">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    if (error || !data) {
        return (
            <div className="flex-1 p-8 bg-gray-50 flex flex-col items-center justify-center text-center">
                <AlertCircle className="w-16 h-16 text-red-500 mb-4" />
                <h2 className="text-xl font-bold text-gray-900 mb-2">Failed to load reports</h2>
                <p className="text-gray-500 mb-4">{error}</p>
                <button onClick={fetchData} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">
                    Retry
                </button>
            </div>
        );
    }

    return (
        <div className="flex-1 overflow-auto bg-gray-50 p-6 md:p-8">
            <div className="max-w-7xl mx-auto space-y-6">

                {/* Header */}
                <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Reports & Analytics</h1>
                        <p className="text-gray-500 mt-1">Real-time performance metrics</p>
                    </div>
                    <button onClick={fetchData} className="text-blue-600 hover:text-blue-700 font-medium">
                        Refresh Data
                    </button>
                </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center space-x-4">
                        <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                            <DollarSign className="w-8 h-8" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-500 font-medium mb-1">Today's Revenue</p>
                            <h3 className="text-2xl font-bold text-gray-900">{formatCurrency(data.todayRevenue)}</h3>
                        </div>
                    </div>
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center space-x-4">
                        <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
                            <ShoppingBag className="w-8 h-8" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-500 font-medium mb-1">Total Orders</p>
                            <h3 className="text-2xl font-bold text-gray-900">{data.totalOrders}</h3>
                        </div>
                    </div>
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center space-x-4">
                        <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
                            <TrendingUp className="w-8 h-8" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-500 font-medium mb-1">Avg Order Value</p>
                            <h3 className="text-2xl font-bold text-gray-900">{formatCurrency(data.averageOrderValue)}</h3>
                        </div>
                    </div>
                </div>

                {/* Charts Row */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                    {/* Revenue Split */}
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                        <h3 className="text-lg font-bold text-gray-900 mb-6">Revenue Split (All Time)</h3>
                        <div className="h-[300px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={data.revenueSplit}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={80}
                                        outerRadius={110}
                                        paddingAngle={5}
                                        dataKey="value"
                                    >
                                        {data.revenueSplit.map((_entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <RechartsTooltip formatter={(value: number | undefined) => formatCurrency(value || 0)} />
                                    <Legend verticalAlign="bottom" height={36} />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Sales Trend */}
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                        <h3 className="text-lg font-bold text-gray-900 mb-6">Sales Trend (Last 7 Days)</h3>
                        <div className="h-[300px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={data.salesTrend}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                    <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#64748b' }} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b' }} tickFormatter={(value) => `Rs. ${value / 1000}k`} />
                                    <RechartsTooltip
                                        formatter={(value: number | undefined) => formatCurrency(value || 0)}
                                        cursor={{ fill: '#f8fafc' }}
                                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                    />
                                    <Bar dataKey="revenue" fill="#2563eb" radius={[6, 6, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                </div>

                {/* Top Sellers Table */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <h3 className="text-lg font-bold text-gray-900 mb-6">Top Sellers</h3>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="border-b border-gray-100 text-gray-500 text-sm">
                                    <th className="pb-3 font-medium">Rank</th>
                                    <th className="pb-3 font-medium">Product Name</th>
                                    <th className="pb-3 font-medium text-right">Quantity Sold</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.topSellers.length === 0 ? (
                                    <tr>
                                        <td colSpan={3} className="py-8 text-center text-gray-500">No sales data available yet.</td>
                                    </tr>
                                ) : (
                                    data.topSellers.map((product, index) => (
                                        <tr key={index} className="border-b border-gray-50 last:border-0 hover:bg-gray-50 transition">
                                            <td className="py-4">
                                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold
                          ${index === 0 ? 'bg-yellow-100 text-yellow-700' :
                                                        index === 1 ? 'bg-slate-100 text-slate-700' :
                                                            index === 2 ? 'bg-orange-100 text-orange-700' : 'bg-gray-50 text-gray-600'}`
                                                }>
                                                    {index + 1}
                                                </div>
                                            </td>
                                            <td className="py-4 font-medium text-gray-900">{product.name}</td>
                                            <td className="py-4 text-right font-medium text-blue-600">{product.quantity}</td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

            </div>
        </div>
    );
};
