import React, { useState, useEffect, useRef } from 'react';
import { Send, User, RotateCcw, LogOut, Loader2, SlidersHorizontal, X, Sun, Moon } from 'lucide-react';
import io from 'socket.io-client';
import AdminLogin from './components/AdminLogin';
import AdminDashboard from './components/AdminDashboard';
import AdRotator from './components/AdRotator';

const socket = io.connect('http://localhost:3001');

const RANDOM_NAMES = ['Stranger', 'Anonymous', 'Someone', 'User'];



const App = () => {
  // Simple view handling
  const [isAdminMode, setIsAdminMode] = useState(window.location.pathname === '/admin');
  const [adminToken, setAdminToken] = useState(localStorage.getItem('adminToken'));

  const [status, setStatus] = useState('idle'); // idle, waiting, in_chat, partner_disconnected
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [roomId, setRoomId] = useState(null);
  const [onlineCount, setOnlineCount] = useState(0);
  const messagesEndRef = useRef(null);

  const [myGender, setMyGender] = useState('any');
  const [prefGender, setPrefGender] = useState('any');
  const [interests, setInterests] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  if (isAdminMode) {
    if (adminToken) {
      return <AdminDashboard socket={socket} token={adminToken} onLogout={() => {
        localStorage.removeItem('adminToken');
        setAdminToken(null);
      }} />;
    }
    return <AdminLogin onLogin={(token) => {
      localStorage.setItem('adminToken', token);
      setAdminToken(token);
    }} />;
  }

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    socket.on('user_count', (count) => setOnlineCount(count));

    socket.on('status', (data) => {
      setStatus(data.status);
      if (data.roomId) setRoomId(data.roomId);
      if (data.status === 'in_chat') {
        setShowFilters(false); // Close filters on connect
        setMessages([]); // Clear previous chat
      }
    });

    socket.on('system', (data) => {
      setMessages(prev => [...prev, { type: 'system', ...data }]);
    });

    socket.on('message', (data) => {
      console.log('Received message:', data);
      setMessages(prev => [...prev, { type: 'received', ...data }]);
    });

    socket.on('message_sent', (data) => {
      console.log('Message sent confirmed:', data);
      setMessages(prev => [...prev, { type: 'sent', ...data }]);
    });

    socket.on('disconnect', () => {
      setStatus('idle');
      setMessages([]);
      setRoomId(null);
    });

    return () => {
      socket.off('user_count');
      socket.off('status');
      socket.off('system');
      socket.off('message');
      socket.off('message_sent');
      socket.off('disconnect');
    };
  }, []);

  const findPartner = () => {
    // If we are currently in a chat, we must leave it first to notify the partner
    if (status === 'in_chat') {
      socket.emit('leave_chat');
    }

    setMessages([]);
    setStatus('waiting');

    // Process tags
    const tags = interests.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);

    socket.emit('find_partner', {
      gender: myGender,
      preference: prefGender,
      interests: tags
    });
  };

  const leaveChat = () => {
    socket.emit('leave_chat');
    setStatus('idle');
    setMessages([]);
  };

  const sendMessage = (e) => {
    e.preventDefault();
    if (inputValue.trim() && status === 'in_chat') {
      socket.emit('send_message', {
        content: inputValue.trim(),
        roomId
      });
      setInputValue('');
    }
  };

  const toggleTheme = () => setIsDarkMode(!isDarkMode);

  // Filter Component
  const FilterPanel = () => (
    <div className="absolute top-16 right-4 sm:right-8 w-80 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-2xl rounded-2xl p-5 z-30 animate-fade-in origin-top-right">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-slate-900 dark:text-white font-bold text-lg">Search Filters</h3>
        <button onClick={() => setShowFilters(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white">
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-500 mb-2 uppercase">I am a</label>
          <div className="flex bg-slate-100 dark:bg-slate-950 rounded-lg p-1 border border-slate-200 dark:border-slate-800">
            {['Male', 'Female'].map((g) => (
              <button
                key={g}
                onClick={() => setMyGender(g.toLowerCase())}
                className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-all ${myGender === g.toLowerCase()
                  ? 'bg-indigo-600 text-white shadow-lg'
                  : 'text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-white'
                  } `}
              >
                {g}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-500 mb-2 uppercase">Looking for</label>
          <select
            value={prefGender}
            onChange={(e) => setPrefGender(e.target.value)}
            className="w-full bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-white text-sm rounded-lg p-2.5 outline-none border border-slate-200 dark:border-slate-800 focus:border-indigo-500 transition-colors"
          >
            <option value="any">Anyone</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-500 mb-2 uppercase">Interests</label>
          <input
            type="text"
            value={interests}
            onChange={(e) => setInterests(e.target.value)}
            placeholder="Coding, Music..."
            className="w-full bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-white text-sm rounded-lg px-3 py-2.5 placeholder-slate-500 dark:placeholder-slate-600 border border-slate-200 dark:border-slate-800 focus:border-indigo-500 focus:outline-none transition-colors"
          />
        </div>

        <p className="text-[10px] text-slate-500 italic">
          Changes apply to next search.
        </p>
      </div>
    </div>
  );

  // Effect to apply theme class
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  return (
    <div className={`flex flex-col h-screen bg-slate-50 dark:bg-slate-950 transition-colors duration-300 relative text-slate-900 dark:text-white`}>

      {/* Chat Header */}
      <header className="h-16 bg-white/80 dark:bg-slate-900/80 backdrop-blur border-b border-slate-200 dark:border-white/5 flex items-center justify-between px-4 lg:px-8 relative z-20 transition-colors duration-300">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center border border-slate-200 dark:border-white/5">
            <User className="w-5 h-5 text-indigo-500 dark:text-indigo-400" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 dark:text-white transition-colors">
              {(status === 'in_chat' || status === 'waiting') ? 'Stranger' : 'AnonChat'}
            </h3>
            <span className="text-xs text-slate-500 dark:text-slate-500">
              {status === 'in_chat' ? 'Online' : status === 'waiting' ? 'Searching...' : 'Idle'}
            </span>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg transition-colors border border-slate-200 dark:border-white/5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-white"
            title="Toggle Theme"
          >
            {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
          {(status === 'in_chat' || status === 'waiting' || status === 'partner_disconnected') && (
            <>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`p-2 rounded-lg transition-colors border border-slate-200 dark:border-white/5 ${showFilters ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-white'}`}
                title="Filters"
              >
                <SlidersHorizontal className="w-5 h-5" />
              </button>
              <button
                onClick={findPartner}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                Next
              </button>
              <button
                onClick={leaveChat}
                className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-white/5 rounded-lg transition-colors"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </>
          )}
        </div>
      </header>

      {/* Filter Overlay Panel */}
      {showFilters && <FilterPanel />}

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50 dark:bg-slate-950 transition-colors duration-300" onClick={() => setShowFilters(false)}>

        {status === 'idle' && (
          <div className="flex items-center justify-center h-full animate-fade-in gap-8 px-4">
            {/* Left Ad Box */}
            <AdRotator />

            {/* Main Content */}
            <div className="max-w-md w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-8 rounded-2xl shadow-xl dark:shadow-2xl text-center transition-colors relative z-10">
              <div className="w-20 h-20 bg-indigo-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <User className="w-10 h-10 text-indigo-500" />
              </div>
              <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">AnonChat</h1>
              <p className="text-slate-500 dark:text-slate-400 mb-8">Talk to strangers randomly.</p>

              <div className="text-left bg-slate-50 dark:bg-slate-950/50 p-4 rounded-xl border border-slate-200 dark:border-slate-800 mb-6 cursor-pointer hover:border-indigo-500/50 transition-colors" onClick={(e) => { e.stopPropagation(); setShowFilters(true); }}>
                <div className="flex items-center justify-between text-slate-700 dark:text-slate-300">
                  <span className="text-sm font-medium">Configure Filters</span>
                  <SlidersHorizontal className="w-4 h-4" />
                </div>
                <div className="mt-2 text-xs text-slate-500 flex flex-wrap gap-2">
                  <span className="bg-slate-200 dark:bg-slate-800 px-2 py-1 rounded">I am: {myGender}</span>
                  <span className="bg-slate-200 dark:bg-slate-800 px-2 py-1 rounded">Seek: {prefGender}</span>
                  {interests && <span className="bg-slate-200 dark:bg-slate-800 px-2 py-1 rounded">Tags: {interests}</span>}
                </div>
              </div>

              <button
                onClick={findPartner}
                className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white text-lg font-bold rounded-xl shadow-lg shadow-indigo-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                Start Chatting
              </button>

              <div className="mt-6 flex justify-center items-center gap-2 text-slate-500 text-xs font-medium">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                {onlineCount} users online
              </div>
            </div>

            {/* Right Ad Box */}
            <AdRotator />
          </div>
        )}

        {status === 'waiting' && (
          <div className="flex flex-col items-center justify-center h-full">
            <div className="flex flex-col items-center gap-6 animate-pulse">
              <Loader2 className="w-16 h-16 text-indigo-500 animate-spin" />
              <h2 className="text-2xl font-semibold text-slate-900 dark:text-white">Looking for a partner...</h2>
              <div className="flex gap-2 text-slate-500 text-sm">
                <span>{myGender === 'any' ? 'Unknown' : myGender}</span>
                <span>→</span>
                <span>{prefGender === 'any' ? 'Anyone' : prefGender}</span>
              </div>
            </div>
            <button
              onClick={leaveChat}
              className="mt-12 px-6 py-2 bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors"
            >
              Cancel
            </button>
          </div>
        )}

        {(status === 'in_chat' || status === 'partner_disconnected') && messages.map((msg, i) => {
          if (msg.type === 'system') {
            const isDisconnect = msg.content.includes('disconnected') || msg.content.includes('Error');
            return (
              <div key={i} className="flex justify-center my-4">
                <span className={`px-3 py-1 text-xs rounded-full border ${isDisconnect
                  ? 'bg-red-500/10 text-red-500 dark:text-red-400 border-red-500/20 font-medium'
                  : 'bg-slate-200 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 border-slate-300 dark:border-white/5'
                  }`}>
                  {msg.content}
                </span>
              </div>
            );
          }

          const isOwn = msg.type === 'sent';

          return (
            <div key={i} className={`flex w-full ${isOwn ? 'justify-end' : 'justify-start'}`}>
              <div className={`
                            max-w-[80%] px-4 py-3 rounded-2xl text-sm leading-relaxed break-words shadow-sm transition-colors
                            ${isOwn
                  ? 'bg-indigo-600 text-white rounded-tr-sm shadow-indigo-500/10'
                  : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-tl-sm border border-slate-200 dark:border-white/5'
                }
                        `}>
                {msg.content}
                <div className={`text-[10px] mt-1 ${isOwn ? 'text-indigo-200' : 'text-slate-400 dark:text-slate-500'} text-right`}>
                  {msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />

        {status === 'partner_disconnected' && (
          <div className="flex flex-col items-center justify-center mt-8 pb-4 animate-fade-in text-center">
            <p className="text-slate-500 text-sm mb-4">The stranger has left the chat.</p>
            <button
              onClick={findPartner}
              className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl shadow-lg shadow-indigo-500/20 hover:scale-105 transition-all flex items-center gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              Find New Partner
            </button>
          </div>
        )}
      </div>

      {/* Input */}
      {(status === 'in_chat' || status === 'partner_disconnected') && (
        <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-white/5 z-10 transition-colors duration-300">
          <form onSubmit={sendMessage} className="max-w-4xl mx-auto flex items-center gap-3">
            <input
              type="text"
              value={inputValue}
              onChange={e => setInputValue(e.target.value)}
              disabled={status !== 'in_chat'}
              placeholder={status === 'in_chat' ? "Type a message..." : "Partner disconnected"}
              className="flex-1 bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 disabled:opacity-50 transition-colors"
            />
            <button
              type="submit"
              disabled={!inputValue.trim() || status !== 'in_chat'}
              className="p-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Send className="w-5 h-5" />
            </button>
          </form>
        </div>
      )}
    </div>
  );
};

export default App;
