import { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useApp } from '@/context/AppContext';
import { useNavigate } from 'react-router-dom';
import {
  Users, Music, CheckCircle, XCircle, Calendar, ArrowLeft,
  AlertTriangle, MessageSquare, LogOut
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
      <div className="min-h-screen flex items-center justify-center px-6 pb-28">
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-xs">
          <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-muted-foreground mb-6">
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
          <h1 className="text-2xl font-black mb-2 text-foreground">Admin Access 🔒</h1>
          <p className="text-sm text-muted-foreground mb-6">Enter the admin password</p>
          <form onSubmit={e => {
            e.preventDefault();
            if (!loginAdmin(password)) toast.error('Wrong password');
          }}>
            <Input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Password"
              className="h-12 rounded-xl mb-4"
            />
            <Button type="submit" className="w-full h-12 rounded-xl font-bold gradient-purple text-primary-foreground">
              Enter
            </Button>
          </form>
        </motion.div>
      </div>
    );
  }

  const totalStudents = bookings.length;
  const confirmedGroups = groups.filter(g => g.status === 'confirmed').length;
  const nearThreshold = groups.filter(g => g.status === 'forming' && g.interestCount >= g.maxMembers - 1);

  const TABS = [
    { id: 'overview' as const, label: 'Overview' },
    { id: 'songs' as const, label: 'Songs' },
    { id: 'calendar' as const, label: 'Calendar' },
    { id: 'matcher' as const, label: 'Matcher' },
  ];

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  return (
    <div className="min-h-screen px-4 pt-4 pb-28 max-w-lg mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-black text-foreground">Admin Dashboard</h1>
        <Button variant="ghost" size="sm" onClick={logoutAdmin}>
          <LogOut className="w-4 h-4" />
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 overflow-x-auto pb-1">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all ${
              tab === t.id ? 'gradient-purple text-primary-foreground' : 'bg-muted text-muted-foreground'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Overview */}
      {tab === 'overview' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Total Groups', value: groups.length, icon: Music },
              { label: 'Confirmed', value: confirmedGroups, icon: CheckCircle },
              { label: 'Students', value: totalStudents, icon: Users },
              { label: 'Pending', value: pendingGroups.length, icon: AlertTriangle },
            ].map(stat => (
              <div key={stat.label} className="bg-card border border-border rounded-2xl p-4">
                <stat.icon className="w-5 h-5 text-primary mb-2" />
                <p className="text-2xl font-black text-foreground">{stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </div>
            ))}
          </div>

          {nearThreshold.length > 0 && (
            <div className="bg-accent border border-primary/20 rounded-2xl p-4">
              <p className="font-bold text-sm text-foreground mb-2 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-primary" /> Almost Full!
              </p>
              {nearThreshold.map(g => (
                <p key={g.id} className="text-xs text-muted-foreground">
                  {g.songTitle} — {g.interestCount}/{g.maxMembers} members
                </p>
              ))}
            </div>
          )}

          <Button
            onClick={() => toast.success('📱 WhatsApp notification sent to all confirmed groups!')}
            variant="outline"
            className="w-full h-12 rounded-xl font-bold"
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
              <p className="text-sm font-bold text-foreground mb-3">Pending Approval</p>
              {pendingGroups.map(g => (
                <div key={g.id} className="bg-card border border-border rounded-2xl p-4 flex items-center gap-3 mb-2">
                  <div className="flex-1">
                    <p className="font-bold text-sm text-foreground">{g.songTitle}</p>
                    <p className="text-xs text-muted-foreground">{g.artist}</p>
                  </div>
                  <Button size="sm" onClick={() => { approveGroup(g.id); toast.success('Approved!'); }} className="rounded-lg gradient-purple text-primary-foreground">
                    <CheckCircle className="w-3 h-3" />
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => { rejectGroup(g.id); toast.error('Rejected'); }} className="rounded-lg">
                    <XCircle className="w-3 h-3" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          <div>
            <p className="text-sm font-bold text-foreground mb-3">Song Library</p>
            {groups.map(g => (
              <div key={g.id} className="flex items-center gap-3 py-3 border-b border-border last:border-0">
                <Music className="w-4 h-4 text-primary" />
                <div className="flex-1">
                  <p className="font-bold text-sm text-foreground">{g.songTitle}</p>
                  <p className="text-xs text-muted-foreground">{g.artist} · {g.interestCount} interested</p>
                </div>
                <Badge variant={g.status === 'confirmed' ? 'default' : 'secondary'} className="text-[10px]">
                  {g.status}
                </Badge>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Calendar */}
      {tab === 'calendar' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          <p className="text-sm font-bold text-foreground mb-3">Studio Rooms</p>
          {(['Room A', 'Room B'] as const).map(room => (
            <div key={room} className="bg-card border border-border rounded-2xl p-4 mb-3">
              <p className="font-bold text-foreground mb-3 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-primary" /> {room}
              </p>
              <div className="space-y-2">
                {sessions.filter(s => s.room === room).map(s => {
                  const g = groups.find(gr => gr.id === s.groupId);
                  return (
                    <div key={s.id} className="flex justify-between items-center text-sm bg-accent rounded-xl px-3 py-2">
                      <span className="font-bold text-foreground">{g?.songTitle || 'Unknown'}</span>
                      <span className="text-xs text-muted-foreground">{s.day} {s.time}</span>
                    </div>
                  );
                })}
                {sessions.filter(s => s.room === room).length === 0 && (
                  <p className="text-xs text-muted-foreground">No classes scheduled</p>
                )}
              </div>
            </div>
          ))}

          <div className="bg-card border border-border rounded-2xl p-4">
            <p className="font-bold text-foreground mb-3">Assign Class</p>
            <div className="space-y-3">
              <select
                value={assignGroupId}
                onChange={e => setAssignGroupId(e.target.value)}
                className="w-full h-10 rounded-xl border border-input bg-background px-3 text-sm"
              >
                <option value="">Select group</option>
                {groups.filter(g => g.status === 'confirmed').map(g => (
                  <option key={g.id} value={g.id}>{g.songTitle}</option>
                ))}
              </select>
              <div className="grid grid-cols-2 gap-2">
                <select value={newRoom} onChange={e => setNewRoom(e.target.value as any)} className="h-10 rounded-xl border border-input bg-background px-3 text-sm">
                  <option>Room A</option>
                  <option>Room B</option>
                </select>
                <select value={newDay} onChange={e => setNewDay(e.target.value)} className="h-10 rounded-xl border border-input bg-background px-3 text-sm">
                  {days.map(d => <option key={d}>{d}</option>)}
                </select>
              </div>
              <Input value={newTime} onChange={e => setNewTime(e.target.value)} placeholder="6:00 PM" className="h-10 rounded-xl" />
              <Button
                onClick={() => {
                  if (!assignGroupId) return;
                  assignSession(assignGroupId, newRoom, newDay, newTime);
                  toast.success('Class assigned!');
                  setAssignGroupId('');
                }}
                disabled={!assignGroupId}
                className="w-full h-10 rounded-xl font-bold gradient-purple text-primary-foreground"
              >
                Assign
              </Button>
            </div>
          </div>
        </motion.div>
      )}

      {/* Matcher */}
      {tab === 'matcher' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          <p className="text-sm font-bold text-foreground mb-1">Availability Matcher</p>
          <p className="text-xs text-muted-foreground mb-4">Based on student availability overlaps</p>
          {[
            { day: 'Saturday', time: '2:00 PM', overlap: 8 },
            { day: 'Monday', time: '6:00 PM', overlap: 6 },
            { day: 'Sunday', time: '11:00 AM', overlap: 5 },
            { day: 'Wednesday', time: '7:00 PM', overlap: 4 },
          ].map((match, i) => (
            <div key={i} className="bg-card border border-border rounded-2xl p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center">
                <Users className="w-4 h-4 text-primary" />
              </div>
              <div className="flex-1">
                <p className="font-bold text-sm text-foreground">{match.day} at {match.time}</p>
                <p className="text-xs text-muted-foreground">{match.overlap} students available</p>
              </div>
              <div className="w-16 bg-muted rounded-full h-2">
                <div className="h-2 rounded-full gradient-purple" style={{ width: `${(match.overlap / 10) * 100}%` }} />
              </div>
            </div>
          ))}
        </motion.div>
      )}
    </div>
  );
}
