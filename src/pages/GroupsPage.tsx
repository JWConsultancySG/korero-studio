import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import { Plus, Users, Music } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

export default function GroupsPage() {
  const { groups, student, joinGroup, createGroup, pendingGroups } = useApp();
  const navigate = useNavigate();
  const [showCreate, setShowCreate] = useState(false);
  const [newSong, setNewSong] = useState('');
  const [newArtist, setNewArtist] = useState('');

  const handleJoin = (groupId: string) => {
    if (!student) {
      navigate('/register');
      return;
    }
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

  return (
    <div className="min-h-screen px-4 pt-6 pb-28">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="max-w-md mx-auto">
        <h1 className="text-2xl font-black mb-1 text-foreground">Song Groups 🎵</h1>
        <p className="text-sm text-muted-foreground mb-6">Pick a song and join the crew</p>

        <div className="space-y-3">
          {allGroups.map((group, i) => (
            <motion.div
              key={group.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="bg-card border border-border rounded-2xl p-4 flex items-center gap-4"
            >
              <div className="w-12 h-12 rounded-xl gradient-purple flex items-center justify-center flex-shrink-0">
                <Music className="w-5 h-5 text-primary-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-foreground truncate">{group.songTitle}</p>
                <p className="text-xs text-muted-foreground">{group.artist}</p>
                <div className="flex items-center gap-2 mt-1.5">
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Users className="w-3 h-3" /> {group.interestCount}/{group.maxMembers}
                  </span>
                  <Badge
                    variant={group.status === 'confirmed' ? 'default' : 'secondary'}
                    className={`text-[10px] px-2 py-0 ${group.status === 'confirmed' ? 'gradient-purple text-primary-foreground' : ''} ${group.status === 'pending' ? 'bg-muted text-muted-foreground' : ''}`}
                  >
                    {group.status === 'confirmed' ? '✅ Confirmed' : group.status === 'pending' ? '⏳ Pending' : '🔥 Forming'}
                  </Badge>
                </div>
              </div>
              {group.status !== 'pending' && (
                <Button
                  size="sm"
                  onClick={() => handleJoin(group.id)}
                  className="rounded-xl font-bold gradient-purple text-primary-foreground active:scale-95 transition-transform flex-shrink-0"
                >
                  Join
                </Button>
              )}
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* FAB */}
      <motion.button
        whileTap={{ scale: 0.9 }}
        onClick={() => {
          if (!student) { navigate('/register'); return; }
          setShowCreate(true);
        }}
        className="fixed bottom-24 right-5 w-14 h-14 rounded-full gradient-purple glow-purple flex items-center justify-center shadow-lg z-40"
      >
        <Plus className="w-6 h-6 text-primary-foreground" />
      </motion.button>

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="rounded-2xl mx-4 max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-black text-xl">Create Song Group 🎤</DialogTitle>
            <DialogDescription>Submit a song for admin approval</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label className="font-bold">Song Title</Label>
              <Input value={newSong} onChange={e => setNewSong(e.target.value)} placeholder="e.g. Ditto" className="h-12 rounded-xl" />
            </div>
            <div className="space-y-2">
              <Label className="font-bold">Artist</Label>
              <Input value={newArtist} onChange={e => setNewArtist(e.target.value)} placeholder="e.g. NewJeans" className="h-12 rounded-xl" />
            </div>
            <Button onClick={handleCreate} disabled={!newSong.trim() || !newArtist.trim()} className="w-full h-12 rounded-xl font-bold gradient-purple text-primary-foreground">
              Submit for Approval ✨
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
