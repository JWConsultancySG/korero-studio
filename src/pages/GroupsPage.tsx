import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import { Plus, Users, Music, Search, TrendingUp, Sparkles } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

export default function GroupsPage() {
  const { groups, student, joinGroup, createGroup, pendingGroups } = useApp();
  const navigate = useNavigate();
  const [showCreate, setShowCreate] = useState(false);
  const [newSong, setNewSong] = useState('');
  const [newArtist, setNewArtist] = useState('');
  const [search, setSearch] = useState('');

  const handleJoin = (groupId: string) => {
    if (!student) { navigate('/register'); return; }
    joinGroup(groupId);
    navigate(`/booking/${groupId}`);
  };

  const handleCreate = () => {
    if (!newSong.trim() || !newArtist.trim()) return;
    createGroup(newSong, newArtist);
    setShowCreate(false);
    setNewSong('');
    setNewArtist('');
    toast.success('Song submitted for approval! ⏳');
  };

  const allGroups = [...groups, ...pendingGroups];
  const filteredGroups = search
    ? allGroups.filter(g => g.songTitle.toLowerCase().includes(search.toLowerCase()) || g.artist.toLowerCase().includes(search.toLowerCase()))
    : allGroups;

  const confirmedCount = groups.filter(g => g.status === 'confirmed').length;

  return (
    <div className="min-h-screen pb-28">
      {/* Hero header */}
      <div className="gradient-purple-subtle px-6 pt-7 pb-6">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="max-w-md mx-auto">
          <h1 className="text-2xl font-black mb-1 text-foreground tracking-tight">Song Groups 🎵</h1>
          <p className="text-sm text-muted-foreground leading-relaxed">Pick a song, join the crew, start slaying</p>

          {/* Stats pills */}
          <div className="flex items-center gap-2.5 mt-5">
            <div className="flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-card border border-border text-xs font-bold text-foreground min-h-[36px]">
              <TrendingUp className="w-3 h-3 text-primary" />
              {allGroups.length} groups
            </div>
            <div className="flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-card border border-border text-xs font-bold text-foreground min-h-[36px]">
              <Sparkles className="w-3 h-3 text-primary" />
              {confirmedCount} confirmed
            </div>
          </div>

          {/* Search */}
          <div className="relative mt-5">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search songs or artists..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-11 h-12 rounded-2xl bg-card border-border text-sm"
            />
          </div>
        </motion.div>
      </div>

      {/* Groups list */}
      <div className="px-5 pt-5 max-w-md mx-auto">
        <div className="space-y-3">
          <AnimatePresence>
            {filteredGroups.map((group, i) => {
              const fillPercent = (group.interestCount / group.maxMembers) * 100;
              const isAlmostFull = fillPercent >= 80;

              return (
                <motion.div
                  key={group.id}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ delay: i * 0.04 }}
                  className="card-premium p-5 group"
                >
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <div className="w-14 h-14 rounded-2xl gradient-purple flex items-center justify-center flex-shrink-0 group-hover:glow-purple transition-shadow">
                        <Music className="w-5 h-5 text-primary-foreground" />
                      </div>
                      {isAlmostFull && group.status !== 'pending' && (
                        <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-destructive flex items-center justify-center">
                          <span className="text-[8px] text-destructive-foreground font-black">🔥</span>
                        </span>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="font-black text-[15px] text-foreground truncate leading-tight">{group.songTitle}</p>
                      <p className="text-xs text-muted-foreground mt-1">{group.artist}</p>
                      <div className="flex items-center gap-2.5 mt-3">
                        {/* Progress bar */}
                        <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${fillPercent}%` }}
                            transition={{ delay: 0.3 + i * 0.05, duration: 0.6 }}
                            className={`h-full rounded-full ${isAlmostFull ? 'gradient-purple' : 'bg-primary/40'}`}
                          />
                        </div>
                        <span className="text-[11px] font-bold text-muted-foreground whitespace-nowrap">
                          {group.interestCount}/{group.maxMembers}
                        </span>
                        <Badge
                          variant={group.status === 'confirmed' ? 'default' : 'secondary'}
                          className={`text-[10px] px-2 py-0 h-5 font-bold ${
                            group.status === 'confirmed' ? 'gradient-purple text-primary-foreground' : ''
                          } ${group.status === 'pending' ? 'bg-muted text-muted-foreground' : ''}`}
                        >
                          {group.status === 'confirmed' ? '✅ Confirmed' : group.status === 'pending' ? '⏳ Pending' : '🎤 Open'}
                        </Badge>
                      </div>
                    </div>

                    {group.status !== 'pending' && (
                      <Button
                        size="sm"
                        onClick={() => handleJoin(group.id)}
                        className="rounded-2xl font-black text-xs gradient-purple text-primary-foreground btn-press flex-shrink-0 h-10 px-5"
                      >
                        Join
                      </Button>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>

          {filteredGroups.length === 0 && (
            <div className="text-center py-16">
              <p className="text-muted-foreground text-sm">No groups found 😅</p>
            </div>
          )}
        </div>
      </div>

      {/* FAB */}
      <motion.button
        whileTap={{ scale: 0.9 }}
        whileHover={{ scale: 1.05 }}
        onClick={() => {
          if (!student) { navigate('/register'); return; }
          setShowCreate(true);
        }}
        className="fixed bottom-24 right-5 w-14 h-14 rounded-2xl gradient-purple-deep glow-purple-intense flex items-center justify-center shadow-2xl z-40"
      >
        <Plus className="w-6 h-6 text-primary-foreground" />
      </motion.button>

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="rounded-3xl mx-4 max-w-sm border-border">
          <DialogHeader>
            <DialogTitle className="font-black text-xl">Request a Song 🎤</DialogTitle>
            <DialogDescription>Submit a song for admin approval — we'll let you know!</DialogDescription>
          </DialogHeader>
          <div className="space-y-5 pt-2">
            <div className="space-y-2.5">
              <Label className="font-bold text-sm">Song Title</Label>
              <Input value={newSong} onChange={e => setNewSong(e.target.value)} placeholder="e.g. Ditto" className="h-13 rounded-2xl border-2" />
            </div>
            <div className="space-y-2.5">
              <Label className="font-bold text-sm">Artist</Label>
              <Input value={newArtist} onChange={e => setNewArtist(e.target.value)} placeholder="e.g. NewJeans" className="h-13 rounded-2xl border-2" />
            </div>
            <Button
              onClick={handleCreate}
              disabled={!newSong.trim() || !newArtist.trim()}
              className="w-full h-13 rounded-2xl font-black gradient-purple text-primary-foreground btn-press relative overflow-hidden"
            >
              <span className="relative z-10">Submit for Approval ✨</span>
              {newSong.trim() && newArtist.trim() && <div className="absolute inset-0 shimmer" />}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
