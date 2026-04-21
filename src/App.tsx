/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Plus, 
  Trash2, 
  BarChart3, 
  Users, 
  History, 
  Calendar,
  Zap,
  Info,
  ChevronRight,
  TrendingUp,
  FileText
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Cell,
  LineChart,
  Line,
  AreaChart,
  Area
} from 'recharts';
import { format, parseISO } from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { parseSolitaireText, type ParsedData, type ParsedEntry } from './lib/gemini';

/**
 * Utility for Tailwind class merging
 */
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Interfaces
interface LogEntry extends ParsedData {
  id: string;
  timestamp: number;
}

export default function App() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [inputText, setInputText] = useState('');
  const [isParsing, setIsParsing] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'history' | 'people'>('overview');
  const [editingLogId, setEditingLogId] = useState<string | null>(null);
  const [editingData, setEditingData] = useState<LogEntry | null>(null);

  // Load from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('solitaire_logs');
    if (saved) {
      try {
        setLogs(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to load logs', e);
      }
    }
  }, []);

  // Save to localStorage
  useEffect(() => {
    localStorage.setItem('solitaire_logs', JSON.stringify(logs));
  }, [logs]);

  // Statistics
  const stats = useMemo(() => {
    const personMap = new Map<string, number>();
    const personCountMap = new Map<string, number>();
    let totalSum = 0;
    
    logs.forEach(log => {
      log.entries.forEach(entry => {
        const current = personMap.get(entry.name) || 0;
        personMap.set(entry.name, current + entry.value);
        
        const count = personCountMap.get(entry.name) || 0;
        personCountMap.set(entry.name, count + 1);
        
        totalSum += entry.value;
      });
    });

    const personalRanks = Array.from(personMap.entries())
      .map(([name, value]) => ({ 
        name, 
        value, 
        count: personCountMap.get(name) || 0,
        average: (value / (personCountMap.get(name) || 1)).toFixed(1)
      }))
      .sort((a, b) => b.value - a.value);

    const dailyTrends = logs
      .map(log => ({
        date: log.date,
        total: log.entries.reduce((sum, e) => sum + e.value, 0),
        count: log.entries.length
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return {
      totalSum,
      participantCount: personMap.size,
      entryCount: logs.length,
      personalRanks,
      dailyTrends
    };
  }, [logs]);

  const handleParse = async () => {
    if (!inputText.trim()) return;
    setIsParsing(true);
    try {
      const data = await parseSolitaireText(inputText);
      if (data) {
        const newLog: LogEntry = {
          ...data,
          id: crypto.randomUUID(),
          timestamp: Date.now()
        };
        setLogs(prev => [newLog, ...prev]);
        setInputText('');
      } else {
        alert('无法解析该接龙数据，请检查格式是否正确。');
      }
    } finally {
      setIsParsing(false);
    }
  };

  const startEditing = (log: LogEntry) => {
    setEditingLogId(log.id);
    setEditingData(JSON.parse(JSON.stringify(log))); // Deep copy
  };

  const cancelEditing = () => {
    setEditingLogId(null);
    setEditingData(null);
  };

  const saveEdit = () => {
    if (!editingData) return;
    setLogs(prev => prev.map(l => l.id === editingData.id ? editingData : l));
    cancelEditing();
  };

  const updateEditEntry = (index: number, field: keyof ParsedEntry, value: string | number) => {
    if (!editingData) return;
    const newEntries = [...editingData.entries];
    newEntries[index] = { ...newEntries[index], [field]: field === 'value' ? Number(value) : value };
    setEditingData({ ...editingData, entries: newEntries });
  };

  const removeEditEntry = (index: number) => {
    if (!editingData) return;
    const newEntries = editingData.entries.filter((_, i) => i !== index);
    setEditingData({ ...editingData, entries: newEntries });
  };

  const addEditEntry = () => {
    if (!editingData) return;
    setEditingData({
      ...editingData,
      entries: [...editingData.entries, { name: '新人员', value: 0 }]
    });
  };

  const deleteLog = (id: string) => {
    if (confirm('确定要删除这条记录吗？')) {
      setLogs(prev => prev.filter(l => l.id !== id));
    }
  };

  const clearAll = () => {
    if (confirm('确定要清空所有记录吗？此操作不可撤销。')) {
      setLogs([]);
      localStorage.removeItem('solitaire_logs');
    }
  };

  return (
    <div className="min-h-screen bg-natural-bg text-natural-ink font-sans selection:bg-natural-accent/20">
      {/* Header */}
      <header className="border-b border-natural-line bg-natural-bg/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-end justify-between pb-4">
          <div className="flex items-center gap-3">
            <div>
              <h1 className="serif text-3xl font-light tracking-tight flex items-baseline gap-2">
                每日接龙统计 <span className="text-lg italic opacity-40">Daily Statistics</span>
              </h1>
              <p className="text-[10px] opacity-60 uppercase tracking-[0.2em] mt-1 font-medium">Automatic chain data parsing & insights</p>
            </div>
          </div>
          
          <nav className="flex gap-2 bg-natural-tag/50 p-1 rounded-xl border border-natural-line">
            <button 
              onClick={() => setActiveTab('overview')}
              className={cn(
                "px-5 py-1.5 rounded-lg text-sm font-medium transition-all duration-300",
                activeTab === 'overview' ? "bg-natural-accent text-white shadow-md shadow-natural-accent/20" : "text-natural-ink/60 hover:text-natural-ink"
              )}
            >
              数据分析
            </button>
            <button 
              onClick={() => setActiveTab('people')}
              className={cn(
                "px-5 py-1.5 rounded-lg text-sm font-medium transition-all duration-300",
                activeTab === 'people' ? "bg-natural-accent text-white shadow-md shadow-natural-accent/20" : "text-natural-ink/60 hover:text-natural-ink"
              )}
            >
              人员汇总
            </button>
            <button 
              onClick={() => setActiveTab('history')}
              className={cn(
                "px-5 py-1.5 rounded-lg text-sm font-medium transition-all duration-300",
                activeTab === 'history' ? "bg-natural-accent text-white shadow-md shadow-natural-accent/20" : "text-natural-ink/60 hover:text-natural-ink"
              )}
            >
              历史日志
            </button>
          </nav>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          
          {/* Left Column: Input & Quick Info */}
          <div className="lg:col-span-4 space-y-8">
            <section className="card-natural p-8 flex flex-col gap-4">
              <div className="flex justify-between items-center bg-transparent border-none p-0 mb-2">
                <h2 className="text-[10px] font-bold uppercase tracking-[0.15em] opacity-50">数据录入 / Input Data</h2>
                <span className="text-[10px] bg-natural-tag px-2 py-1 rounded-full text-natural-accent font-medium">智能识别已就绪</span>
              </div>
              
              <div className="flex flex-col gap-4">
                <textarea
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="在此粘贴接龙文字..."
                  className="w-full h-56 bg-natural-input border border-natural-line rounded-xl p-5 text-sm focus:border-natural-accent focus:ring-4 focus:ring-natural-accent/5 outline-none transition-all placeholder:text-natural-ink/30 resize-none font-mono scrollbar-hide shadow-inner"
                />

                <div className="flex justify-end -mt-12 mr-5 mb-5 relative z-10">
                  <button 
                    onClick={() => setInputText(`4月21日 接龙汇报：\n1. 张晓明 +45\n2. 林悦 30\n3. 王大成 60`)}
                    className="text-[10px] text-natural-ink/40 hover:text-natural-accent bg-natural-card px-2 py-1 rounded border border-natural-line transition-colors shadow-sm"
                  >
                    填入示例
                  </button>
                </div>
              </div>
              
              <button
                onClick={handleParse}
                disabled={isParsing || !inputText.trim()}
                className="w-full bg-natural-accent hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed text-white py-4 rounded-xl font-medium flex items-center justify-center gap-2 transform transition-all active:scale-[0.98] shadow-lg shadow-natural-accent/10"
              >
                {isParsing ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <Zap className="w-4 h-4 fill-white opacity-80" />
                    <span>立即解析统计数据</span>
                  </>
                )}
              </button>

              <div className="mt-2 flex items-start gap-3 p-4 bg-natural-tag/30 rounded-xl border border-natural-line/50">
                <Info className="w-4 h-4 text-natural-accent opacity-60 shrink-0 mt-0.5" />
                <p className="text-[11px] text-natural-ink/60 leading-relaxed italic">
                  AI 专家会自动过滤广告与杂质，精准提取姓名与对应的总计金额。
                </p>
              </div>
            </section>

            {/* Overall Stats Cards */}
            <div className="grid grid-cols-2 gap-6">
              <div className="card-natural p-6 text-center">
                <span className="text-[10px] uppercase tracking-widest opacity-40 mb-2 block font-bold">今日总数值 / TOTAL</span>
                <span className="serif text-5xl font-light text-natural-accent">{stats.totalSum}</span>
              </div>
              <div className="card-natural p-6 text-center">
                <span className="text-[10px] uppercase tracking-widest opacity-40 mb-2 block font-bold">参与人数 / PARTICIPANTS</span>
                <span className="serif text-5xl font-light text-natural-accent">{stats.participantCount}</span>
              </div>
            </div>
          </div>

          {/* Right Column: Displays */}
          <div className="lg:col-span-8">
            <AnimatePresence mode="wait">
              {activeTab === 'overview' ? (
                <motion.div 
                  key="overview"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.4 }}
                  className="space-y-10"
                >
                  {/* Daily Trend Chart */}
                  <section className="card-natural p-8">
                    <div className="flex items-center justify-between mb-10 border-b border-natural-line pb-4">
                      <h2 className="text-[11px] font-bold uppercase tracking-[0.2em] opacity-60">数据洞察 / Data Insights</h2>
                      <div className="flex items-center gap-1.5 text-[10px] opacity-40 italic">
                        <TrendingUp className="w-3 h-3" />
                        <span>趋势基于录入时间顺序</span>
                      </div>
                    </div>
                    
                    <div className="h-72 w-full">
                      {stats.dailyTrends.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={stats.dailyTrends}>
                            <defs>
                              <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#5A5A40" stopOpacity={0.2}/>
                                <stop offset="95%" stopColor="#5A5A40" stopOpacity={0}/>
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#E5E5E0" />
                            <XAxis 
                              dataKey="date" 
                              stroke="#A1A19A" 
                              fontSize={10}
                              tickLine={false}
                              axisLine={false}
                              tickFormatter={(val) => val.split('-').slice(1).join('/')}
                            />
                            <YAxis stroke="#A1A19A" fontSize={10} axisLine={false} tickLine={false} />
                            <Tooltip 
                              contentStyle={{ backgroundColor: '#FFFFFF', border: '1px solid #DEDEDA', borderRadius: '12px', fontSize: '11px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}
                            />
                            <Area 
                              type="monotone" 
                              dataKey="total" 
                              name="数据总量"
                              stroke="#5A5A40" 
                              strokeWidth={2}
                              fillOpacity={1} 
                              fill="url(#colorTotal)" 
                            />
                          </AreaChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="h-full flex flex-col items-center justify-center text-natural-ink/30 border border-dashed border-natural-line rounded-2xl">
                          <BarChart3 className="w-10 h-10 mb-3 opacity-20" />
                          <p className="text-xs italic tracking-wider">等待数据注入分析仪...</p>
                        </div>
                      )}
                    </div>
                  </section>

                  {/* Personal Ranks Section */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <section className="card-natural p-8">
                      <h2 className="text-[11px] font-bold uppercase tracking-[0.2em] opacity-60 mb-8">个人数据排行 / Leaderboard</h2>
                      
                      <div className="space-y-6">
                        {stats.personalRanks.slice(0, 5).map((person, idx) => (
                          <div key={person.name} className="flex items-center gap-4">
                            <div className="serif italic text-lg opacity-20 w-6">0{idx + 1}</div>
                            <div className="flex-1">
                              <div className="flex justify-between items-baseline mb-2">
                                <span className="text-sm font-medium tracking-tight">{person.name}</span>
                                <span className="text-[11px] serif italic text-natural-accent">{person.value}</span>
                              </div>
                              <div className="h-1 bg-natural-tag rounded-full overflow-hidden">
                                <motion.div 
                                  initial={{ width: 0 }}
                                  animate={{ width: `${(person.value / (stats.personalRanks[0]?.value || 1)) * 100}%` }}
                                  className="h-full bg-natural-accent rounded-full opacity-60"
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                        {stats.personalRanks.length === 0 && (
                          <p className="text-center py-10 text-natural-ink/30 text-xs italic">记录空白</p>
                        )}
                        {stats.personalRanks.length > 5 && (
                          <button 
                            onClick={() => setActiveTab('people')}
                            className="w-full text-[10px] uppercase font-bold text-natural-accent pt-4 hover:opacity-70 transition-opacity"
                          >
                            查看全部人员汇总
                          </button>
                        )}
                      </div>
                    </section>

                    <section className="card-natural p-8">
                      <h2 className="text-[11px] font-bold uppercase tracking-[0.2em] opacity-60 mb-8">数值离散度 / Variance</h2>
                      <div className="h-52">
                         <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={stats.personalRanks.slice(0, 8)}>
                              <Tooltip 
                                cursor={{ fill: '#F9F9F7' }}
                                contentStyle={{ backgroundColor: '#FFFFFF', border: '1px solid #DEDEDA', borderRadius: '12px', fontSize: '10px' }}
                              />
                              <Bar dataKey="value" name="总计" radius={[2, 2, 0, 0]}>
                                {stats.personalRanks.slice(0, 8).map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={index === 0 ? '#5A5A40' : '#A1A19A'} />
                                ))}
                              </Bar>
                              <XAxis dataKey="name" fontSize={9} axisLine={false} tickLine={false} stroke="#A1A19A" />
                            </BarChart>
                         </ResponsiveContainer>
                      </div>
                    </section>
                  </div>
                </motion.div>
              ) : activeTab === 'people' ? (
                <motion.div 
                  key="people"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.4 }}
                  className="space-y-6"
                >
                  <section className="card-natural p-8 overflow-hidden flex flex-col">
                    <h2 className="text-[11px] font-bold uppercase tracking-[0.2em] opacity-60 mb-10 border-b border-natural-line pb-4">
                      全员统计汇总 / Global Personnel Summary
                    </h2>
                    
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="text-[10px] uppercase tracking-widest opacity-40 border-b border-natural-line">
                            <th className="pb-4 font-bold">排名</th>
                            <th className="pb-4 font-bold">参与者姓名</th>
                            <th className="pb-4 font-bold">参与次数</th>
                            <th className="pb-4 font-bold">单次平均</th>
                            <th className="pb-4 font-bold text-right">累计总和 / TOTAL</th>
                          </tr>
                        </thead>
                        <tbody className="text-sm">
                          {stats.personalRanks.map((person, idx) => (
                            <tr key={person.name} className="border-b border-natural-line/30 hover:bg-natural-tag/10 transition-colors">
                              <td className="py-4 serif italic text-natural-ink/40">
                                {idx < 9 ? `0${idx + 1}` : idx + 1}
                              </td>
                              <td className="py-4 font-medium">{person.name}</td>
                              <td className="py-4 text-xs opacity-60">{person.count} 次</td>
                              <td className="py-4 text-xs opacity-60">{person.average}</td>
                              <td className="py-4 text-right">
                                <span className={cn(
                                  "serif text-lg font-light",
                                  idx === 0 ? "text-natural-accent" : ""
                                )}>
                                  {person.value}
                                </span>
                              </td>
                            </tr>
                          ))}
                          {stats.personalRanks.length === 0 && (
                            <tr>
                              <td colSpan={5} className="py-20 text-center text-xs italic text-natural-ink/30 italic">
                                数据库中尚未发现任何有效人员数据
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </section>
                </motion.div>
              ) : (
                <motion.div 
                  key="history"
                  initial={{ opacity: 0, scale: 0.99 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.99 }}
                  className="space-y-6"
                >
                  <div className="flex justify-between items-center px-2">
                    <h2 className="text-[11px] font-bold uppercase tracking-[0.2em] opacity-60">历史接龙归档 / Archive</h2>
                    {logs.length > 0 && (
                      <button 
                        onClick={clearAll}
                        className="text-[10px] text-natural-ink/40 hover:text-red-500 uppercase tracking-widest transition-colors flex items-center gap-1.5"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>一键重置数据库</span>
                      </button>
                    )}
                  </div>

                  <div className="space-y-6">
                    {logs.map((log) => (
                      <div 
                        key={log.id} 
                        className={cn(
                          "card-natural p-8 group transition-all duration-500",
                          editingLogId === log.id ? "ring-2 ring-natural-accent shadow-xl" : "hover:border-natural-accent/30"
                        )}
                      >
                        {editingLogId === log.id && editingData ? (
                          /* Edit Mode UI */
                          <div className="space-y-6">
                            <div className="flex justify-between items-center border-b border-natural-line pb-4">
                              <h3 className="serif text-xl font-light">正在编辑历史日志</h3>
                              <div className="flex gap-2">
                                <button onClick={cancelEditing} className="px-4 py-2 text-xs font-bold uppercase tracking-widest text-natural-ink/40 hover:text-natural-ink transition-colors">取消</button>
                                <button onClick={saveEdit} className="px-6 py-2 text-xs font-bold uppercase tracking-widest bg-natural-accent text-white rounded-lg shadow-lg shadow-natural-accent/20">保存更改</button>
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-4">
                              <span className="text-xs uppercase font-bold opacity-40">日期:</span>
                              <input 
                                type="text"
                                value={editingData.date}
                                onChange={(e) => setEditingData({...editingData, date: e.target.value})}
                                className="bg-natural-tag/30 border border-natural-line rounded px-3 py-1 text-sm outline-none focus:border-natural-accent"
                              />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                              {editingData.entries.map((entry, idx) => (
                                <div key={idx} className="flex items-center gap-2 bg-natural-bg/30 p-2 rounded-lg border border-natural-line/40">
                                  <input 
                                    type="text"
                                    value={entry.name}
                                    onChange={(e) => updateEditEntry(idx, 'name', e.target.value)}
                                    className="flex-1 bg-transparent text-xs font-medium outline-none"
                                  />
                                  <input 
                                    type="number"
                                    value={entry.value}
                                    onChange={(e) => updateEditEntry(idx, 'value', e.target.value)}
                                    className="w-16 bg-white/50 text-xs font-mono font-bold text-natural-accent outline-none px-1 rounded"
                                  />
                                  <button onClick={() => removeEditEntry(idx)} className="text-red-400 hover:text-red-600 transition-colors">
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                </div>
                              ))}
                              <button 
                                onClick={addEditEntry}
                                className="flex items-center justify-center gap-2 py-2 border-2 border-dashed border-natural-line rounded-lg text-xs opacity-40 hover:opacity-100 transition-all"
                              >
                                <Plus className="w-3 h-3" />
                                <span>添加人员</span>
                              </button>
                            </div>
                          </div>
                        ) : (
                          /* View Mode UI */
                          <>
                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8 border-b border-natural-line pb-6">
                              <div className="flex items-center gap-5">
                                <div className="w-14 h-14 rounded-2xl bg-natural-tag/40 flex flex-col items-center justify-center border border-natural-line">
                                  <span className="text-[9px] text-natural-ink/40 uppercase font-bold tracking-tighter">{log.date.split('-')[1]}月</span>
                                  <span className="serif text-2xl font-light text-natural-accent">{log.date.split('-')[2]}</span>
                                </div>
                                <div>
                                    <div className="flex items-center gap-3">
                                      <h3 className="serif text-xl font-light">数据日志 Arch.No_{log.id.slice(0, 4)}</h3>
                                      <span className="text-[9px] px-2 py-0.5 rounded-full bg-natural-accent text-white uppercase font-bold tracking-widest">
                                        {log.entries.length} 位成员
                                      </span>
                                    </div>
                                    <div className="text-[9px] text-natural-ink/40 uppercase font-mono mt-1.5 tracking-widest">
                                      TIMESTAMP: {format(log.timestamp, 'yyyy.MM.dd | HH:mm:ss')}
                                    </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-4">
                                <div className="text-right border-r border-natural-line pr-4">
                                  <div className="serif text-3xl font-light text-natural-accent">
                                    {log.entries.reduce((sum, e) => sum + e.value, 0)}
                                  </div>
                                  <div className="text-[9px] uppercase tracking-widest opacity-40 font-bold">每日结算</div>
                                </div>
                                <div className="flex gap-2 min-w-[80px] justify-end opacity-0 group-hover:opacity-100 transition-all">
                                  <button 
                                    onClick={() => startEditing(log)}
                                    className="p-3 rounded-full bg-natural-tag/50 text-natural-ink/30 hover:bg-natural-accent hover:text-white transition-all"
                                    title="编辑"
                                  >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-pencil"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
                                  </button>
                                  <button 
                                    onClick={() => deleteLog(log.id)}
                                    className="p-3 rounded-full bg-natural-tag/50 text-natural-ink/30 hover:bg-red-50 hover:text-red-400 transition-all"
                                    title="删除"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                              {log.entries.map((entry, idx) => (
                                <div key={idx} className="bg-natural-bg/30 border border-natural-line/40 rounded-lg py-2.5 px-4 flex justify-between items-center group/item hover:bg-white transition-colors">
                                  <span className="text-[11px] font-medium opacity-60 line-clamp-1">{entry.name}</span>
                                  <span className="text-[11px] serif italic text-natural-accent font-bold">+{entry.value}</span>
                                </div>
                              ))}
                            </div>
                          </>
                        )}
                      </div>
                    ))}
                    
                    {logs.length === 0 && (
                      <div className="py-24 flex flex-col items-center card-natural border-dashed border-2 bg-transparent opacity-50">
                        <Calendar className="w-12 h-12 mb-4 opacity-10" />
                        <p className="text-xs italic tracking-widest uppercase mb-4">No records found in local storage</p>
                        <button 
                          onClick={() => setActiveTab('overview')}
                          className="text-[10px] uppercase font-bold text-natural-accent border-b border-natural-accent hover:opacity-70 pb-0.5"
                        >
                          Initialize Database
                        </button>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </main>

      <footer className="max-w-7xl mx-auto px-6 py-10 border-t border-natural-line mt-16 flex justify-between items-center text-[10px] uppercase tracking-[0.2em] opacity-30 font-bold">
        <div>接龙解析统计引擎 v4.0.1 / NATURAL ANALYTICS</div>
        <div className="flex gap-6">
          <span className="flex items-center gap-1.5"><Zap className="w-3 h-3 fill-current" /> SYSTEM OPTIMAL</span>
          <span>Last Sync: {new Date().toLocaleTimeString()}</span>
        </div>
      </footer>
    </div>
  );
}

