import React, { useState, useEffect } from 'react';
import { Users, MessageSquare, Activity, ExternalLink, LogOut } from 'lucide-react';
import AdManager from './AdManager';

const AdminDashboard = ({ socket, token, onLogout }) => {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const res = await fetch('http://localhost:3001/api/admin/stats', {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });
                if (res.ok) {
                    const data = await res.json();
                    setStats(data);
                } else {
                    // If auth fails, force logout
                    onLogout();
                }
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        // Initial fetch
        fetchStats();

        // Socket Setup
        if (socket) {
            // Authenticate socket for admin room
            socket.emit('admin_join', token);

            // Listen for real-time stats
            socket.on('admin_stats', (data) => {
                setStats(data);
                setLoading(false);
            });
        }

        return () => {
            if (socket) {
                socket.off('admin_stats');
            }
        };
    }, [socket, token, onLogout]);

    const StatCard = ({ icon, label, value, color }) => (
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-all">
            <div className="flex items-center justify-between mb-4">
                <div className={`p-3 rounded-xl ${color} bg-opacity-10 text-opacity-100`}>
                    {icon}
                </div>
                <Activity className="w-5 h-5 text-slate-300 dark:text-slate-600" />
            </div>
            <h3 className="text-3xl font-bold text-slate-900 dark:text-white mb-1">{value}</h3>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{label}</p>
        </div>
    );

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-6">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <header className="flex items-center justify-between mb-8 pb-6 border-b border-slate-200 dark:border-slate-800">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Dashboard Overview</h1>
                        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Real-time statistics and monitoring</p>
                    </div>
                    <div className="flex gap-3">
                        <a href="/" target="_blank" className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg text-sm font-medium hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
                            <ExternalLink className="w-4 h-4" />
                            View Site
                        </a>
                        <button
                            onClick={onLogout}
                            className="flex items-center gap-2 px-4 py-2 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg text-sm font-medium hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                        >
                            <LogOut className="w-4 h-4" />
                            Logout
                        </button>
                    </div>
                </header>

                {loading ? (
                    <div className="flex justify-center py-20">
                        <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                ) : (
                    <>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-fade-in mb-8">
                            <StatCard
                                icon={<Users className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />}
                                label="Online Users"
                                value={stats?.onlineUsers || 0}
                                color="bg-indigo-500"
                            />
                            <StatCard
                                icon={<MessageSquare className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />}
                                label="Total Messages"
                                value={stats?.totalMessages || 0}
                                color="bg-emerald-500"
                            />
                            <StatCard
                                icon={<Activity className="w-6 h-6 text-amber-600 dark:text-amber-400" />}
                                label="Total Views"
                                value={stats?.totalViews || 0}
                                color="bg-amber-500"
                            />
                        </div>

                        {/* Active Tags Section */}
                        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
                            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-4">Top Active Tags</h3>
                            {!stats?.activeTags || stats.activeTags.length === 0 ? (
                                <p className="text-slate-500 dark:text-slate-400 text-sm">No active tags found.</p>
                            ) : (
                                <div className="flex flex-wrap gap-3">
                                    {stats.activeTags.map((tagObj, i) => (
                                        <div key={i} className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 dark:bg-slate-700 rounded-full border border-slate-200 dark:border-slate-600">
                                            <span className="font-medium text-slate-700 dark:text-slate-200 text-sm">{tagObj.tag}</span>
                                            <span className="bg-indigo-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">{tagObj.count}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </>
                )}

                {/* Ad Management Section */}
                {!loading && <div className="mt-8"><AdManager token={token} /></div>}

            </div>
        </div>
    );
};

export default AdminDashboard;
