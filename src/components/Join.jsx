import React, { useState } from 'react';
import { MessageSquare, ArrowRight } from 'lucide-react';

const Join = ({ onJoin }) => {
    const [username, setUsername] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        if (username.trim()) {
            onJoin(username);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-darker via-dark to-slate-900 overflow-hidden relative">
            {/* Background decoration */}
            <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] bg-primary/20 rounded-full blur-[120px] animate-pulse" />
            <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] bg-secondary/20 rounded-full blur-[120px] animate-pulse" />

            <div className="relative z-10 w-full max-w-md p-8 bg-paper/50 backdrop-blur-xl rounded-2xl border border-white/10 shadow-2xl animate-slide-up">
                <div className="flex flex-col items-center mb-8">
                    <div className="w-16 h-16 bg-gradient-to-tr from-primary to-secondary rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-primary/30">
                        <MessageSquare className="w-8 h-8 text-white" />
                    </div>
                    <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
                        AnonChat
                    </h1>
                    <p className="text-slate-400 mt-2 text-center">
                        Join the conversation anonymously.
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1.5 ml-1">
                            Choose a Username
                        </label>
                        <input
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            className="w-full px-4 py-3 bg-dark/50 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 text-white placeholder-slate-500 transition-all hover:bg-dark/70"
                            placeholder="e.g. CyberNinja"
                            autoFocus
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={!username.trim()}
                        className="w-full py-3.5 bg-gradient-to-r from-primary to-secondary text-white font-bold rounded-xl shadow-lg shadow-primary/25 hover:shadow-primary/40 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 group"
                    >
                        Start Chatting
                        <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </button>
                </form>
            </div>
        </div>
    );
};

export default Join;
