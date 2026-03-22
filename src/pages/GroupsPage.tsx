import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import { Plus, Users, Music, Search, Flame, Sparkles, TrendingUp, Zap, Clock, Lock, CircleDot, ArrowRight } from 'lucide-react';
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
    toast.success('Song submitted for approval!');
  };

  const joinableGroups = groups.filter(g => g.status === 'forming' && g.interestCount < g.maxMembers);
  const confirmedGroups = groups.filter(g => g.status === 'confirmed' || g.interestCount >= g.maxMembers);
  const allDisplayGroups = [...joinableGroups, ...pendingGroups];

  const filteredJoinable = search
    ? allDisplayGroups.filter(g => g.songTitle.toLowerCase().includes(search.toLowerCase()) || g.artist.toLowerCase().includes(search.toLowerCase()))
    : allDisplayGroups;

  const filteredConfirmed = search
    ? confirmedGroups.filter(g => g.songTitle.toLowerCase().includes(search.toLowerCase()) || g.artist.toLowerCase().includes(search.toLowerCase()))
    : confirmedGroups;

  const getBadge = (group: typeof groups[0]) => {
    const fillPercent = (group.interestCount / group.maxMembers) * 100;
    const spotsLeft = group.maxMembers - group.interestCount;

    if (group.status === 'pending') return { text: 'Pending', icon: Clock, className: 'bg-muted text-muted-foreground' };
    if (fillPercent >= 80) return { text: `${spotsLeft} spot${spotsLeft !== 1 ? 's' : ''} left`, icon: Zap, className: 'bg-primary/10 text-primary font-black' };
    if (fillPercent >= 50) return { text: 'Filling fast', icon: TrendingUp, className: 'bg-accent text-accent-foreground' };
    return { text: 'Open', icon: CircleDot, className: 'bg-muted text-muted-foreground' };
  };

  return (
    <div className="min-h-screen pb-28">
      {/* Header */}
      <div className="gradient-purple-subtle px-6 pt-7 pb-6">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="max-w-md mx-auto">
          <h1 className="text-2xl font-black mb-1 text-foreground tracking-tight flex items-center gap-2">
            Find Your Song <Music className="w-5 h-5 text-primary" />
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed">Claim your spot before it's gone</p>

          <div className="flex items-center gap-2.5 mt-5">
            <div className="flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-card border border-border text-xs font-bold text-foreground min-h-[36px]">
              <TrendingUp className="w-3 h-3 text-primary" />
              {joinableGroups.length} open
            </div>
            <div className="flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-card border border-border text-xs font-bold text-foreground min-h-[36px]">
              <Zap className="w-3 h-3 text-primary" />
              {joinableGroups.filter(g => (g.interestCount / g.maxMembers) >= 0.8).length} almost full
            </div>
          </div>

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

      {/* Joinable Groups */}
      <div className="px-5 pt-5 max-w-md mx-auto">
        {filteredJoinable.length > 0 && (
          <div className="space-y-3.5">
            <AnimatePresence>
              {filteredJoinable
                .sort((a, b) => (b.interestCount / b.maxMembers) - (a.interestCount / a.maxMembers))
                .map((group, i) => {
                  const fillPercent = (group.interestCount / group.maxMembers) * 100;
                  const isAlmostFull = fillPercent >= 80;
                  const isHot = fillPercent >= 50;
                  const badge = getBadge(group);
                  const BadgeIcon = badge.icon;
                  const spotsLeft = group.maxMembers - group.interestCount;

                  return (
                    <motion.div
                      key={group.id}
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ delay: i * 0.04 }}
                      className={`card-premium p-5 relative overflow-hidden group ${
                        isAlmostFull ? 'border-destructive/30' : ''
                      }`}
                    >
                      {isAlmostFull && group.status !== 'pending' && (
                        <div className="absolute top-0 left-0 right-0 h-0.5 bg-destructive" />
                      )}

                      <div className="flex items-start gap-4">
                        <div className="relative flex-shrink-0">
                          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${
                            isAlmostFull ? 'bg-destructive/10' : 'gradient-purple'
                          } ${isAlmostFull ? 'pulse-ring' : ''}`}>
                            {isAlmostFull ? (
                              <Flame className="w-6 h-6 text-destructive" />
                            ) : (
                              <Music className="w-5 h-5 text-primary-foreground" />
                            )}
                          </div>
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-black text-base text-foreground truncate leading-tight">{group.songTitle}</p>
                          </div>
                          <p className="text-xs text-muted-foreground mb-3">{group.artist}</p>

                          <div className="mb-3">
                            <div className="flex items-center justify-between mb-1.5">
                              <div className="flex items-center gap-1.5">
                                <Users className="w-3 h-3 text-muted-foreground" />
                                <span className="text-[11px] font-bold text-muted-foreground">
                                  {group.interestCount} / {group.maxMembers} members
                                </span>
                              </div>
                              <Badge className={`text-[10px] px-2 py-0 h-5 font-bold border-0 ${badge.className}`}>
                                <BadgeIcon className="w-2.5 h-2.5 mr-1" />
                                {badge.text}
                              </Badge>
                            </div>
                            <div className="h-2 bg-muted rounded-full overflow-hidden">
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${fillPercent}%` }}
                                transition={{ delay: 0.3 + i * 0.05, duration: 0.6, ease: 'easeOut' }}
                                className={`h-full rounded-full ${
                                  isAlmostFull ? 'bg-destructive' : isHot ? 'gradient-purple' : 'bg-primary/40'
                                }`}
                              />
                            </div>
                          </div>

                          {isAlmostFull && group.status !== 'pending' && (
                            <motion.p
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              className="text-[11px] font-bold text-destructive flex items-center gap-1"
                            >
                              <Flame className="w-3 h-3" />
                              Last {spotsLeft} spot{spotsLeft !== 1 ? 's' : ''} — claim it before it's gone
                            </motion.p>
                          )}
                        </div>
                      </div>

                      {group.status !== 'pending' && (
                        <motion.div className="mt-4">
                          <Button
                            onClick={() => handleJoin(group.id)}
                            className={`w-full rounded-2xl font-black text-sm btn-press h-12 relative overflow-hidden ${
                              isAlmostFull
                                ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90'
                                : 'gradient-purple text-primary-foreground'
                            }`}
                          >
                            <span className="relative z-10 flex items-center gap-2">
                              {isAlmostFull ? (
                                <>Grab Last Spot <Zap className="w-4 h-4" /></>
                              ) : (
                                <>Join This Group <Sparkles className="w-4 h-4" /></>
                              )}
                            </span>
                            {!isAlmostFull && <div className="absolute inset-0 shimmer" />}
                          </Button>
                        </motion.div>
                      )}
                    </motion.div>
                  );
                })}
            </AnimatePresence>
          </div>
        )}

        {filteredJoinable.length === 0 && filteredConfirmed.length === 0 && (
          <div className="text-center py-16">
            <Search className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground text-sm">No groups found</p>
          </div>
        )}

        {filteredConfirmed.length > 0 && (
          <div className="mt-10">
            <p className="text-xs font-black uppercase tracking-[0.15em] text-muted-foreground mb-4">Confirmed / Full</p>
            <div className="space-y-3">
              {filteredConfirmed.map((group, i) => (
                <motion.div
                  key={group.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="card-premium p-5 opacity-60"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center flex-shrink-0">
                      <Music className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm text-foreground truncate">{group.songTitle}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{group.artist}</p>
                    </div>
                    <Badge className="text-[10px] px-2.5 py-0.5 h-5 font-bold bg-muted text-muted-foreground border-0 flex items-center gap-1">
                      <Lock className="w-2.5 h-2.5" /> FULL
                    </Badge>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}
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
            <DialogTitle className="font-black text-xl flex items-center gap-2">
              Request a Song <Music className="w-5 h-5 text-primary" />
            </DialogTitle>
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
              <span className="relative z-10 flex items-center gap-2">Submit for Approval <Sparkles className="w-4 h-4" /></span>
              {newSong.trim() && newArtist.trim() && <div className="absolute inset-0 shimmer" />}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
