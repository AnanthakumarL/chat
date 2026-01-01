import React, { useState, useEffect } from 'react';

const AdRotator = () => {
    const [ads, setAds] = useState([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchAds = async () => {
            try {
                const res = await fetch('http://localhost:3001/api/public/ads');
                if (res.ok) {
                    const data = await res.json();
                    setAds(data);
                }
            } catch (err) {
                console.error("Failed to load ads", err);
            } finally {
                setLoading(false);
            }
        };
        fetchAds();
    }, []);

    useEffect(() => {
        if (ads.length <= 1) return;

        const currentAd = ads[currentIndex];
        const duration = (currentAd?.duration || 10) * 1000;

        const timer = setTimeout(() => {
            setCurrentIndex((prev) => (prev + 1) % ads.length);
        }, duration);

        return () => clearTimeout(timer);
    }, [currentIndex, ads]);

    if (loading) return <div className="w-64 h-[300px] bg-slate-200 dark:bg-slate-800 animate-pulse rounded-xl" />;

    // Fallback if no ads
    if (ads.length === 0) {
        return (
            <div className="hidden xl:flex w-64 h-[300px] bg-slate-200 dark:bg-slate-800 rounded-xl border border-slate-300 dark:border-slate-700 items-center justify-center shrink-0 overflow-hidden relative">
                <span className="text-slate-400 text-xs">Advertise Here</span>
            </div>
        );
    }

    const currentAd = ads[currentIndex];

    // Wrap in link if exists
    const Content = (
        <div className="w-64 h-[300px] relative group cursor-pointer overflow-hidden rounded-xl shadow-lg hover:shadow-xl transition-all bg-slate-800">
            <img
                src={`http://localhost:3001${currentAd.image_url}`}
                alt="Ad"
                className="absolute inset-0 w-full h-full object-cover opacity-90 group-hover:scale-105 transition-transform duration-700"
            />
            <span className="absolute top-2 right-2 bg-black/50 px-2 py-0.5 text-[10px] text-white rounded backdrop-blur-sm">Ad</span>
            {ads.length > 1 && (
                <div className="absolute bottom-2 right-2 flex gap-1">
                    {ads.map((_, i) => (
                        <div key={i} className={`w-1.5 h-1.5 rounded-full transition-colors ${i === currentIndex ? 'bg-white' : 'bg-white/30'}`} />
                    ))}
                </div>
            )}
        </div>
    );

    return (
        <div className="hidden xl:block">
            {currentAd.link_url ? (
                <a href={currentAd.link_url} target="_blank" rel="noopener noreferrer">
                    {Content}
                </a>
            ) : Content}
        </div>
    );
};

export default AdRotator;
