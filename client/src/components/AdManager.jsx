import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Link as LinkIcon, Clock, ToggleLeft, ToggleRight, Upload } from 'lucide-react';

const AdManager = ({ token }) => {
    const [ads, setAds] = useState([]);
    const [loading, setLoading] = useState(false);

    // Form State
    const [file, setFile] = useState(null);
    const [linkUrl, setLinkUrl] = useState('');
    const [duration, setDuration] = useState(10);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [position, setPosition] = useState('banner1');

    useEffect(() => {
        fetchAds();
    }, [token]);

    const fetchAds = async () => {
        setLoading(true);
        try {
            const res = await fetch('http://localhost:3001/api/admin/ads', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setAds(data);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async (e) => {
        e.preventDefault();
        if (!file) return;

        setIsSubmitting(true);
        const formData = new FormData();
        formData.append('image', file);
        formData.append('link_url', linkUrl);
        formData.append('duration', duration);
        formData.append('active', 'true');
        formData.append('position', position);

        try {
            const res = await fetch('http://localhost:3001/api/admin/ads', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData
            });
            if (res.ok) {
                setFile(null);
                setLinkUrl('');
                setDuration(10);
                setPosition('banner1');
                fetchAds();
            }
        } catch (err) {
            console.error(err);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('Are you sure?')) return;
        try {
            await fetch(`http://localhost:3001/api/admin/ads/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            setAds(ads.filter(a => a.id !== id));
        } catch (err) {
            console.error(err);
        }
    };

    const handleToggle = async (id, currentStatus) => {
        try {
            await fetch(`http://localhost:3001/api/admin/ads/${id}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ active: !currentStatus })
            });
            setAds(ads.map(a => a.id === id ? { ...a, active: !currentStatus } : a));
        } catch (err) {
            console.error(err);
        }
    };

    const AdList = ({ title, adsList }) => (
        <div className="space-y-4">
            <h4 className="font-semibold text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700 pb-2">{title}</h4>
            {adsList.map(ad => (
                <div key={ad.id} className="flex items-center gap-4 p-4 bg-slate-50 dark:bg-slate-900/30 rounded-xl border border-slate-100 dark:border-slate-700/50">
                    <img
                        src={`http://localhost:3001${ad.image_url}`}
                        alt="Ad"
                        className="w-24 h-16 object-cover rounded-lg bg-slate-200"
                    />
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                            <LinkIcon className="w-3 h-3 text-slate-400" />
                            <a href={ad.link_url} target="_blank" rel="noreferrer" className="text-sm text-indigo-500 hover:underline truncate">
                                {ad.link_url || 'No Link'}
                            </a>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                            <Clock className="w-3 h-3" />
                            {ad.duration}s display
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => handleToggle(ad.id, ad.active)}
                            className={`p-2 rounded-lg transition-colors ${ad.active ? 'text-green-500 hover:bg-green-50' : 'text-slate-400 hover:bg-slate-100'}`}
                            title={ad.active ? "Active" : "Inactive"}
                        >
                            {ad.active ? <ToggleRight className="w-6 h-6" /> : <ToggleLeft className="w-6 h-6" />}
                        </button>
                        <button
                            onClick={() => handleDelete(ad.id)}
                            className="p-2 text-red-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        >
                            <Trash2 className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            ))}
            {adsList.length === 0 && !loading && (
                <div className="text-center py-8 text-slate-400 text-sm">No ads created for this section.</div>
            )}
        </div>
    );

    return (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
                <Upload className="w-5 h-5 text-indigo-500" />
                Ad Management
            </h3>

            {/* Create Form */}
            <form onSubmit={handleCreate} className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl mb-8 border border-slate-200 dark:border-slate-700">
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
                    <div className="space-y-1">
                        <label className="text-xs font-semibold text-slate-500 uppercase">Ad Image</label>
                        <input
                            type="file"
                            accept="image/*"
                            onChange={e => setFile(e.target.files[0])}
                            className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                            required
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs font-semibold text-slate-500 uppercase">Target URL</label>
                        <input
                            type="text"
                            value={linkUrl}
                            onChange={e => setLinkUrl(e.target.value)}
                            placeholder="https://example.com"
                            className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm"
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs font-semibold text-slate-500 uppercase">Duration (sec)</label>
                        <input
                            type="number"
                            value={duration}
                            onChange={e => setDuration(e.target.value)}
                            min="3"
                            className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm"
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs font-semibold text-slate-500 uppercase">Position</label>
                        <select
                            value={position}
                            onChange={e => setPosition(e.target.value)}
                            className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm"
                        >
                            <option value="banner1">Last Banner (Left)</option>
                            <option value="banner2">First Banner (Right)</option>
                        </select>
                    </div>
                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 text-sm font-medium transition-colors"
                    >
                        {isSubmitting ? 'Uploading...' : 'Add Ad'}
                    </button>
                </div>
            </form>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <AdList
                    title="Banner 1 (Left Side - Default)"
                    adsList={ads.filter(a => !a.position || a.position === 'banner1')}
                />
                <AdList
                    title="Banner 2 (Right Side)"
                    adsList={ads.filter(a => a.position === 'banner2')}
                />
            </div>
        </div>
    );
};

export default AdManager;
