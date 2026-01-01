import React, { useState, useEffect, useRef } from 'react';
import { Send, User, LogOut } from 'lucide-react';

const Chat = ({ socket, username, onLeave }) => {
    const [messages, setMessages] = useState([]);
    const [inputValue, setInputValue] = useState('');
    const [userCount, setUserCount] = useState(1);
    const [isConnected, setIsConnected] = useState(socket.connected);
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        setIsConnected(socket.connected);

        const onConnect = () => setIsConnected(true);
        const onDisconnect = () => setIsConnected(false);

        // Listen for messages
        const onReceiveMessage = (data) => {
            setMessages((prev) => [...prev, data]);
        };

        // Listen for system messages
        const onSystemMessage = (data) => {
            setMessages((prev) => [...prev, { ...data, type: 'system' }]);
        };

        // Listen for user count
        const onUserCount = (count) => {
            setUserCount(count);
        };

        socket.on('connect', onConnect);
        socket.on('disconnect', onDisconnect);
        socket.on('receive_message', onReceiveMessage);
        socket.on('system_message', onSystemMessage);
        socket.on('user_count', onUserCount);

        // Load initial messages if server provides them
        fetch('http://localhost:3001/messages')
            .then(res => res.json())
            .then(data => setMessages(data))
            .catch(err => console.error(err));

        return () => {
            socket.off('connect', onConnect);
            socket.off('disconnect', onDisconnect);
            socket.off('receive_message', onReceiveMessage);
            socket.off('system_message', onSystemMessage);
            socket.off('user_count', onUserCount);
        };
    }, [socket]);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const sendMessage = (e) => {
        e.preventDefault();
        if (inputValue.trim() && isConnected) {
            const messageData = {
                username,
                content: inputValue.trim(),
                time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            };

            socket.emit('send_message', messageData);
            setInputValue('');
        }
    };

    return (
        <div className="flex flex-col h-screen bg-slate-950">
            {/* Header */}
            <header className="h-16 bg-slate-900/50 backdrop-blur-md border-b border-white/5 flex items-center justify-between px-6 z-20">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-full flex items-center justify-center shadow-lg shadow-indigo-500/20">
                        <span className="font-bold text-white text-lg">{username[0].toUpperCase()}</span>
                    </div>
                    <div>
                        <h2 className="font-bold text-white">AnonChat</h2>
                        <div className="flex items-center gap-2">
                            <div className={`flex items-center gap-1.5 ${isConnected ? 'text-green-400' : 'text-red-400'}`}>
                                <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
                                <span className="text-xs">{isConnected ? 'Online' : 'Reconnecting...'}</span>
                            </div>
                            <span className="text-xs text-slate-500">•</span>
                            <div className="flex items-center gap-1 text-slate-400">
                                <User className="w-3 h-3" />
                                <span className="text-xs">{userCount} Online</span>
                            </div>
                        </div>
                    </div>
                </div>

                <button
                    onClick={onLeave}
                    className="p-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                    title="Leave Chat"
                >
                    <LogOut className="w-5 h-5" />
                </button>
            </header>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6 scroll-smooth">
                {messages.map((msg, index) => {
                    if (msg.type === 'system') {
                        return (
                            <div key={index} className="flex justify-center my-4">
                                <span className="px-3 py-1 bg-white/5 rounded-full text-xs text-slate-400 border border-white/5">
                                    {msg.content}
                                </span>
                            </div>
                        );
                    }

                    const isOwn = msg.username === username;

                    return (
                        <div
                            key={index}
                            className={`flex items-end gap-2 ${isOwn ? 'flex-row-reverse' : 'flex-row'} animate-fade-in`}
                        >
                            {!isOwn && (
                                <div className="w-8 h-8 bg-paper rounded-full flex items-center justify-center border border-white/5 text-xs font-bold text-slate-400 shrink-0">
                                    {msg.username[0].toUpperCase()}
                                </div>
                            )}

                            <div className={`max-w-[70%] flex flex-col ${isOwn ? 'items-end' : 'items-start'}`}>
                                <div
                                    className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed shadow-sm break-words
                    ${isOwn
                                            ? 'bg-gradient-to-br from-indigo-500 to-purple-500 text-white rounded-tr-sm shadow-indigo-500/10'
                                            : 'bg-slate-800 text-slate-200 border border-white/5 rounded-tl-sm'
                                        }`}
                                >
                                    {msg.content}
                                </div>
                                {msg.created_at && (
                                    <span className="text-[10px] text-slate-500 mt-1 px-1">
                                        {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                )}
                            </div>
                        </div>
                    );
                })}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-4 bg-slate-800/30 border-t border-white/5">
                <form onSubmit={sendMessage} className="max-w-4xl mx-auto relative flex items-center gap-2">
                    <input
                        type="text"
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        placeholder="Type your message..."
                        className="flex-1 bg-slate-900/50 border border-white/10 rounded-xl px-4 py-3.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
                        disabled={!isConnected}
                    />
                    <button
                        type="submit"
                        disabled={!inputValue.trim() || !isConnected}
                        className="p-3.5 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-xl shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/30 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:scale-100 transition-all"
                    >
                        <Send className="w-5 h-5" />
                    </button>
                </form>
            </div>
        </div>
    );
};

export default Chat;
