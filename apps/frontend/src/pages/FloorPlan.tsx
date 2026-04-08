import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import { toast } from 'sonner';
import { Layers, Coffee, Loader2 } from 'lucide-react';
import { useSocket } from '../context/SocketContext';

interface TableStatus {
    tableNo: string;
    status: 'AVAILABLE' | 'OCCUPIED';
    orderId: string | null;
}

export function FloorPlan() {
    const navigate = useNavigate();
    const [tables, setTables] = useState<TableStatus[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const { socket } = useSocket();

    const fetchTables = async () => {
        try {
            setIsLoading(true);
            const data = await api.getTableStatus();
            setTables(data);
        } catch (error) {
            toast.error('Failed to fetch table statuses.');
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchTables();
    }, []);

    // --- Real-time Listeners ---
    useEffect(() => {
        if (!socket) return;

        const handleUpdate = () => {
            console.log('Real-time: Order/Table status updated, refreshing...');
            fetchTables();
        };

        socket.on('ORDER_UPDATED', handleUpdate);

        return () => {
            socket.off('ORDER_UPDATED', handleUpdate);
        };
    }, [socket]);

    const handleTableClick = (table: TableStatus) => {
        if (table.status === 'AVAILABLE') {
            // Navigate to POS and pre-fill table details
            navigate('/', { state: { tableNo: table.tableNo } });
        } else if (table.status === 'OCCUPIED' && table.orderId) {
            // Navigate to POS and instruct it to load this order
            navigate('/', { state: { orderId: table.orderId } });
        }
    };

    return (
        <div className="flex flex-col h-full bg-slate-50 overflow-hidden w-full relative">
            {/* Header */}
            <header className="px-4 md:px-8 py-6 bg-white border-b border-slate-200 z-10 shrink-0 flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-black text-slate-800 flex items-center gap-2 tracking-tight">
                        <Layers className="text-blue-600" /> Floor Plan
                    </h1>
                    <p className="text-slate-500 text-sm font-medium mt-1">Manage Dine-In tables and check occupancy</p>
                </div>
                <div className="flex items-center gap-4 text-sm font-bold">
                    <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.4)]"></span>
                        <span className="text-slate-600">Available</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full bg-rose-500 shadow-[0_0_12px_rgba(244,63,94,0.4)]"></span>
                        <span className="text-slate-600">Occupied</span>
                    </div>
                </div>
            </header>

            {/* Grid Area */}
            <main className="flex-1 overflow-y-auto p-4 md:p-8">
                {isLoading && tables.length === 0 ? (
                    <div className="flex items-center justify-center h-full">
                        <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
                    </div>
                ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-6 max-w-7xl mx-auto">
                        {tables.map(table => {
                            const isOccupied = table.status === 'OCCUPIED';
                            return (
                                <button
                                    key={table.tableNo}
                                    onClick={() => handleTableClick(table)}
                                    className={`relative flex flex-col items-center justify-center aspect-square rounded-3xl transition-all duration-300 md:hover:scale-105 active:scale-95 shadow-sm border-2 ${
                                        isOccupied
                                            ? 'bg-gradient-to-br from-rose-500 to-rose-600 border-rose-600 text-white shadow-[0_8px_24px_rgba(244,63,94,0.3)] md:hover:shadow-[0_12px_32px_rgba(244,63,94,0.4)]'
                                            : 'bg-white border-slate-200 text-slate-700 hover:border-emerald-500 hover:text-emerald-600 hover:shadow-[0_8px_24px_rgba(16,185,129,0.15)]'
                                    }`}
                                >
                                    {/* Table Icon */}
                                    <div className={`p-4 rounded-full mb-2 border ${
                                        isOccupied ? 'bg-white/20 border-white/30 backdrop-blur-md' : 'bg-slate-50 border-slate-200 text-slate-400'
                                    }`}>
                                        <Coffee size={32} className={isOccupied ? "text-white" : ""} />
                                    </div>
                                    
                                    {/* Table Number */}
                                    <span className="text-xl font-black tracking-tight tracking-wider">
                                        T-{table.tableNo.padStart(2, '0')}
                                    </span>
                                    
                                    {/* Status Label */}
                                    <span className={`text-[10px] uppercase font-bold tracking-widest mt-1 ${
                                        isOccupied ? 'text-rose-100' : 'text-slate-400'
                                    }`}>
                                        {isOccupied ? 'Occupied' : 'Ready'}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                )}
            </main>
        </div>
    );
}
