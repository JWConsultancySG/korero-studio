import { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useApp } from '@/context/AppContext';
import { useNavigate } from 'react-router-dom';
import {
  Users, Music, CheckCircle, XCircle, Calendar, ArrowLeft,
  AlertTriangle, MessageSquare, LogOut, TrendingUp, Shield, Sparkles, BarChart3
} from 'lucide-react';
import { toast } from 'sonner';

export default function AdminPage() {
  const {
    isAdmin, loginAdmin, logoutAdmin, groups, pendingGroups,
    approveGroup, rejectGroup, sessions, bookings, assignSession
  } = useApp();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [tab, setTab] = useState<'overview' | 'songs' | 'calendar' | 'matcher'>('overview');
  const [newRoom, setNewRoom] = useState<'Room A' | 'Room B'>('Room A');
  const [newDay, setNewDay] = useState('Monday');
  const [newTime, setNewTime] = useState('6:00 PM');
  const [assignGroupId, setAssignGroupId] = useState('');

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6 pb-28 gradient-purple-subtle">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-xs">
          <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-muted-foreground text-sm font-medium mb-8 btn-press">
            <ArrowLeft className="w-4 h-4" /> Back
          </button>

          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 200 }}
            className="w-16 h-16 rounded-2xl gradient-purple-deep flex items-center justify-center mx-auto mb-6 glow-purple"
          >
            <Shield className="w-7 h-7 text-primary-foreground" />
          </motion.div>

          <h1 className="text-2xl font-black mb-1.5 text-foreground text-center">Admin Access</h1>
          <p className="text-sm text-muted-foreground mb-8 text-center">Enter the admin password</p>

          <form onSubmit={e => {
            e.preventDefault();
            if (!loginAdmin(password)) toast.error('Wrong password');
          }}>
            <Input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Password"
              className="h-13 rounded-2xl mb-4 border-2 text-center text-lg tracking-widest"
            />
            <Button type="submit" className="w-full h-13 rounded-2xl font-black gradient-purple text-primary-foreground btn-press">
              Enter →
            </Button>
          </form>
        </motion.div>
      </div>
    );
  }

  const totalStudents = bookings.length;
  const confirmedGroups = groups.filter(g => g.status === 'confirmed').length;
  const nearThreshold = groups.filter(g => g.status === 'forming' && g.interestCount >= g.maxMembers - 1);
  const totalInterest = groups.reduce((sum, g) => sum + g.interestCount, 0);

  const TABS = [
    { id: 'overview' as const, label: 'Overview', icon: BarChart3 },
    { id: 'songs' as const, label: 'Songs', icon: Music },
    { id: 'calendar' as const, label: 'Rooms', icon: Calendar },
    { id: 'matcher' as const, label: 'Matcher', icon: Users },
  ];

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  return (
    <div className="min-h-screen pb-28">
      {/* Header */}
      <div className="gradient-purple-subtle px-5 pt-5 pb-4">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-black text-foreground">Admin Dashboard</h1>
            <p className="text-xs text-muted-foreground">Manage your studio</p>
          </div>
          <Button variant="ghost" size="sm" onClick={logoutAdmin} className="btn-press text-muted-foreground">
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="px-4 max-w-lg mx-auto">
        {/* Tabs */}
        <div className="flex gap-1 py-4 overflow-x-auto no-scrollbar">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-black whitespace-nowrap transition-all btn-press ${
                tab === t.id ? 'gradient-purple text-primary-foreground glow-purple' : 'bg-card border border-border text-muted-foreground'
              }`}
            >
              <t.icon className="w-3.5 h-3.5" />
              {t.label}
            </button>
          ))}
        </div>

        {/* Overview */}
        {tab === 'overview' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            <div className="grid grid-cols-2 gap-2.5">
              {[
                { label: 'Total Groups', value: groups.length, icon: Music, color: 'text-primary' },
                { label: 'Confirmed', value: confirmedGroups, icon: CheckCircle, color: 'text-success' },
                { label: 'Students', value: totalStudents, icon: Users, color: 'text-primary' },
                { label: 'Total Interest', value: totalInterest, icon: TrendingUp, color: 'text-primary' },
              ].map((stat, i) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.06 }}
                  className="card-premium p-4"
                >
                  <stat.icon className={`w-5 h-5 ${stat.color} mb-2`} />
                  <p className="text-3xl font-black text-foreground">{stat.value}</p>
                  <p className="text-[11px] font-bold text-muted-foreground mt-0.5">{stat.label}</p>
                </motion.div>
              ))}
            </div>

            {pendingGroups.length > 0 && (
              <div className="card-premium p-4 border-l-4 border-l-primary">
                <p className="font-black text-sm text-foreground mb-1 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-primary" />
                  {pendingGroups.length} pending approval
                </p>
                <p className="text-xs text-muted-foreground">Go to Songs tab to review</p>
              </div>
            )}

            {nearThreshold.length > 0 && (
              <div className="card-premium p-4 border-l-4 border-l-destructive">
                <p className="font-black text-sm text-foreground mb-2 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-destructive" /> Almost Full!
                </p>
                {nearThreshold.map(g => (
                  <p key={g.id} className="text-xs text-muted-foreground">
                    🔥 {g.songTitle} — {g.interestCount}/{g.maxMembers} members
                  </p>
                ))}
              </div>
            )}

            <Button
              onClick={() => toast.success('📱 WhatsApp notification sent to all confirmed groups!')}
              variant="outline"
              className="w-full h-12 rounded-2xl font-bold border-2 btn-press"
            >
              <MessageSquare className="w-4 h-4 mr-2" /> Send WhatsApp Blast
            </Button>
          </motion.div>
        )}

        {/* Songs */}
        {tab === 'songs' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            {pendingGroups.length > 0 && (
              <div>
                <p className="text-xs font-black uppercase tracking-wider text-primary mb-3">Pending Approval</p>
                {pendingGroups.map((g, i) => (
                  <motion.div
                    key={g.id}
                    initial={{ opacity: 0, x: -15 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="card-premium p-4 flex items-center gap-3 mb-2"
                  >
                    <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center flex-shrink-0">
                      <Music className="w-4 h-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm text-foreground truncate">{g.songTitle}</p>
                      <p className="text-xs text-muted-foreground">{g.artist}</p>
                    </div>
                    <div className="flex gap-1.5">
                      <Button size="sm" onClick={() => { approveGroup(g.id); toast.success('Approved! ✅'); }} className="rounded-xl gradient-purple text-primary-foreground btn-press h-8 w-8 p-0">
                        <CheckCircle className="w-4 h-4" />
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => { rejectGroup(g.id); toast.error('Rejected'); }} className="rounded-xl btn-press h-8 w-8 p-0">
                        <XCircle className="w-4 h-4" />
                      </Button>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}

            <div>
              <p className="text-xs font-black uppercase tracking-wider text-primary mb-3">Song Library</p>
              <div className="space-y-1">
                {groups.map((g, i) => (
                  <motion.div
                    key={g.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.03 }}
                    className="flex items-center gap-3 py-3 px-1 border-b border-border last:border-0"
                  >
                    <Music className="w-4 h-4 text-primary flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm text-foreground truncate">{g.songTitle}</p>
                      <p className="text-[11px] text-muted-foreground">{g.artist} · {g.interestCount} interested</p>
                    </div>
                    <Badge
                      variant={g.status === 'confirmed' ? 'default' : 'secondary'}
                      className={`text-[10px] font-bold ${g.status === 'confirmed' ? 'gradient-purple text-primary-foreground' : ''}`}
                    >
                      {g.status}
                    </Badge>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* Calendar */}
        {tab === 'calendar' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            <p className="text-xs font-black uppercase tracking-wider text-primary mb-1">Studio Rooms</p>
            {(['Room A', 'Room B'] as const).map((room, ri) => (
              <motion.div
                key={room}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: ri * 0.1 }}
                className="card-premium p-4 relative overflow-hidden"
              >
                <div className={`absolute top-0 left-0 right-0 h-0.5 ${ri === 0 ? 'gradient-purple' : 'bg-muted-foreground/20'}`} />
                <p className="font-black text-foreground mb-3 flex items-center gap-2 text-sm">
                  <Calendar className="w-4 h-4 text-primary" /> {room}
                </p>
                <div className="space-y-2">
                  {sessions.filter(s => s.room === room).map(s => {
                    const g = groups.find(gr => gr.id === s.groupId);
                    return (
                      <div key={s.id} className="flex justify-between items-center text-sm bg-accent rounded-xl px-3.5 py-2.5">
                        <span className="font-bold text-foreground text-xs">{g?.songTitle || 'Unknown'}</span>
                        <span className="text-[11px] text-muted-foreground font-medium">{s.day} · {s.time}</span>
                      </div>
                    );
                  })}
                  {sessions.filter(s => s.room === room).length === 0 && (
                    <p className="text-xs text-muted-foreground py-2">No classes scheduled</p>
                  )}
                </div>
              </motion.div>
            ))}

            <div className="card-premium p-4">
              <p className="font-black text-foreground mb-3 text-sm">Assign Class</p>
              <div className="space-y-3">
                <select
                  value={assignGroupId}
                  onChange={e => setAssignGroupId(e.target.value)}
                  className="w-full h-11 rounded-xl border-2 border-input bg-background px-3 text-sm font-medium"
                >
                  <option value="">Select group</option>
                  {groups.filter(g => g.status === 'confirmed').map(g => (
                    <option key={g.id} value={g.id}>{g.songTitle}</option>
                  ))}
                </select>
                <div className="grid grid-cols-2 gap-2">
                  <select value={newRoom} onChange={e => setNewRoom(e.target.value as 'Room A' | 'Room B')} className="h-11 rounded-xl border-2 border-input bg-background px-3 text-sm font-medium">
                    <option>Room A</option>
                    <option>Room B</option>
                  </select>
                  <select value={newDay} onChange={e => setNewDay(e.target.value)} className="h-11 rounded-xl border-2 border-input bg-background px-3 text-sm font-medium">
                    {days.map(d => <option key={d}>{d}</option>)}
                  </select>
                </div>
                <Input value={newTime} onChange={e => setNewTime(e.target.value)} placeholder="6:00 PM" className="h-11 rounded-xl border-2" />
                <Button
                  onClick={() => {
                    if (!assignGroupId) return;
                    assignSession(assignGroupId, newRoom, newDay, newTime);
                    toast.success('Class assigned! ✅');
                    setAssignGroupId('');
                  }}
                  disabled={!assignGroupId}
                  className="w-full h-11 rounded-xl font-black gradient-purple text-primary-foreground btn-press"
                >
                  Assign
                </Button>
              </div>
            </div>
          </motion.div>
        )}

        {/* Matcher */}
        {tab === 'matcher' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
            <div className="mb-4">
              <p className="text-xs font-black uppercase tracking-wider text-primary mb-1">Availability Matcher</p>
              <p className="text-xs text-muted-foreground">Best class times based on student overlaps</p>
            </div>
            {[
              { day: 'Saturday', time: '2:00 PM', overlap: 8, rank: 1 },
              { day: 'Monday', time: '6:00 PM', overlap: 6, rank: 2 },
              { day: 'Sunday', time: '11:00 AM', overlap: 5, rank: 3 },
              { day: 'Wednesday', time: '7:00 PM', overlap: 4, rank: 4 },
            ].map((match, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
                className="card-premium p-4 flex items-center gap-3.5"
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black ${
                  match.rank === 1 ? 'gradient-purple text-primary-foreground' : 'bg-muted text-muted-foreground'
                }`}>
                  #{match.rank}
                </div>
                <div className="flex-1">
                  <p className="font-bold text-sm text-foreground">{match.day} at {match.time}</p>
                  <p className="text-[11px] text-muted-foreground">{match.overlap} students available</p>
                </div>
                <div className="w-20">
                  <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${(match.overlap / 10) * 100}%` }}
                      transition={{ delay: 0.3 + i * 0.1, duration: 0.6 }}
                      className="h-2 rounded-full gradient-purple"
                    />
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>
    </div>
  );
}
