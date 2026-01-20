import React, { useState } from 'react';
import { MessageSquare, Activity, Send } from 'lucide-react';
import { useAppContext } from '../context/AppContext';

const AI: React.FC = () => {
    const { api } = useAppContext();
    const [aiInput, setAiInput] = useState('');
    const [chatHistory, setChatHistory] = useState<{ role: 'user' | 'assistant', content: string }[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);

    const handleAiQuery = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!aiInput.trim()) return;

        const userMsg = aiInput;
        setChatHistory(prev => [...prev, { role: 'user', content: userMsg }]);
        setAiInput('');
        setIsProcessing(true);

        try {
            // Using backend API Agent (Omniscient Mode)
            const response = await api.ai.query(userMsg);

            // Backend returns { type: 'text' | 'error', content: '...' } or just content
            // Need to handle response structure
            const content = response.content || response.answer || JSON.stringify(response);

            setChatHistory(prev => [...prev, { role: 'assistant', content: content }]);
        } catch (error) {
            setChatHistory(prev => [...prev, { role: 'assistant', content: "Lo siento, hubo un error al procesar tu consulta." }]);
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="h-full flex flex-col p-10 animate-in fade-in slide-in-from-bottom-4 duration-500 custom-scrollbar overflow-hidden">
            <div className="max-w-4xl w-full mx-auto flex-1 flex flex-col bg-white rounded-[3rem] shadow-2xl border border-slate-200 overflow-hidden">
                <div className="p-8 border-b border-slate-100 flex items-center bg-slate-900 text-white gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center shadow-lg">
                        <MessageSquare size={24} />
                    </div>
                    <div>
                        <h3 className="text-sm font-black uppercase tracking-widest">ChatControlMed AI</h3>
                        <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Asistente Cognitivo</p>
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto p-10 space-y-6 custom-scrollbar bg-slate-50/30">
                    {chatHistory.length === 0 && (
                        <div className="h-full flex flex-col items-center justify-center opacity-10 text-slate-900">
                            <Activity size={80} className="mb-6" />
                            <p className="text-xs font-black uppercase tracking-[0.5em]">MediBot Esperando Consulta</p>
                        </div>
                    )}
                    {chatHistory.map((m, i) => (
                        <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-2`}>
                            <div className={`max-w-[80%] p-6 rounded-[2rem] text-[13px] font-bold leading-relaxed shadow-sm ${m.role === 'user' ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-white border border-slate-200 text-slate-800 rounded-tl-none'}`}>
                                {m.content}
                            </div>
                        </div>
                    ))}
                    {isProcessing && (
                        <div className="flex justify-start animate-in slide-in-from-bottom-2">
                            <div className="bg-white border border-slate-200 p-6 rounded-[2rem] rounded-tl-none">
                                <div className="flex gap-2">
                                    <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></span>
                                    <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-75"></span>
                                    <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-150"></span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
                <form onSubmit={handleAiQuery} className="p-8 bg-white border-t border-slate-100 flex gap-4">
                    <input
                        type="text"
                        value={aiInput}
                        onChange={e => setAiInput(e.target.value)}
                        placeholder="Ej: ¿Qué pacientes vinieron hoy?"
                        className="flex-1 bg-slate-50 border border-slate-200 rounded-2xl px-8 py-5 text-sm font-bold outline-none focus:ring-4 focus:ring-blue-100 transition-all"
                    />
                    <button type="submit" disabled={isProcessing} className="bg-blue-600 text-white px-8 rounded-2xl hover:bg-blue-700 transition shadow-xl disabled:opacity-50">
                        <Send size={24} />
                    </button>
                </form>
            </div>
        </div>
    );
};

export default AI;
