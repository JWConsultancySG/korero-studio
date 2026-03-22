import { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Music, Sparkles, Loader2, Disc3, X } from 'lucide-react';

interface ITunesResult {
  trackId: number;
  trackName: string;
  artistName: string;
  artworkUrl100: string;
  collectionName?: string;
}

interface SongSearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (song: string, artist: string, artworkUrl?: string) => void;
}

export default function SongSearchDialog({ open, onOpenChange, onSubmit }: SongSearchDialogProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ITunesResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedSong, setSelectedSong] = useState<ITunesResult | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const searchiTunes = useCallback(async (term: string) => {
    if (term.length < 2) { setResults([]); return; }
    setLoading(true);
    try {
      const res = await fetch(
        `https://itunes.apple.com/search?term=${encodeURIComponent(term)}&media=music&entity=song&limit=8`
      );
      const data = await res.json();
      setResults(data.results || []);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query.trim()) { setResults([]); return; }
    debounceRef.current = setTimeout(() => searchiTunes(query), 350);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query, searchiTunes]);

  const handleSelect = (track: ITunesResult) => {
    setSelectedSong(track);
    setQuery('');
    setResults([]);
  };

  const handleSubmit = () => {
    if (!selectedSong) return;
    const artworkUrl = selectedSong.artworkUrl100.replace('100x100', '200x200');
    onSubmit(selectedSong.trackName, selectedSong.artistName, artworkUrl);
    setSelectedSong(null);
    setQuery('');
    setResults([]);
  };

  const handleClear = () => {
    setSelectedSong(null);
    setQuery('');
    setResults([]);
  };

  useEffect(() => {
    if (!open) {
      setSelectedSong(null);
      setQuery('');
      setResults([]);
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-3xl border-border max-h-[85vh] flex flex-col overflow-hidden p-0 w-[calc(100vw-2rem)] max-w-[380px] left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
        <div className="px-5 pt-5 pb-2">
          <DialogHeader>
            <DialogTitle className="font-black text-xl flex items-center gap-2">
              Request a Song <Music className="w-5 h-5 text-primary" />
            </DialogTitle>
            <DialogDescription className="text-xs">
              Search any song from Apple Music — pick it and it's added! 🎶
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="flex-1 overflow-y-auto px-5 pb-5">
          <div className="space-y-4 pt-2">
            <AnimatePresence mode="wait">
              {selectedSong ? (
                <motion.div
                  key="selected"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="flex items-center gap-3 p-3 rounded-2xl bg-primary/5 border-2 border-primary/20"
                >
                  <img
                    src={selectedSong.artworkUrl100.replace('100x100', '200x200')}
                    alt={selectedSong.trackName}
                    className="w-14 h-14 rounded-xl object-cover flex-shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-black text-sm text-foreground truncate">{selectedSong.trackName}</p>
                    <p className="text-xs text-muted-foreground truncate">{selectedSong.artistName}</p>
                    {selectedSong.collectionName && (
                      <p className="text-[10px] text-muted-foreground/60 truncate">{selectedSong.collectionName}</p>
                    )}
                  </div>
                  <button
                    onClick={handleClear}
                    className="p-1.5 rounded-full hover:bg-muted transition-colors flex-shrink-0"
                  >
                    <X className="w-4 h-4 text-muted-foreground" />
                  </button>
                </motion.div>
              ) : (
                <motion.div key="search" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    {loading && (
                      <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-primary animate-spin" />
                    )}
                    <Input
                      value={query}
                      onChange={e => setQuery(e.target.value)}
                      placeholder="Search any song or artist..."
                      className="pl-11 pr-10 h-12 rounded-2xl border-2 text-sm"
                      autoFocus
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {!selectedSong && results.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-1.5 max-h-[40vh] overflow-y-auto rounded-2xl border border-border bg-card p-1.5"
              >
                {results.map((track) => (
                  <button
                    key={track.trackId}
                    onClick={() => handleSelect(track)}
                    className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-muted/60 transition-colors text-left"
                  >
                    <img
                      src={track.artworkUrl100}
                      alt={track.trackName}
                      className="w-11 h-11 rounded-lg object-cover flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm text-foreground truncate">{track.trackName}</p>
                      <p className="text-xs text-muted-foreground truncate">{track.artistName}</p>
                    </div>
                    <Disc3 className="w-4 h-4 text-muted-foreground/40 flex-shrink-0" />
                  </button>
                ))}
              </motion.div>
            )}

            {!selectedSong && query.length >= 2 && !loading && results.length === 0 && (
              <div className="text-center py-6">
                <Music className="w-6 h-6 text-muted-foreground/40 mx-auto mb-2" />
                <p className="text-xs text-muted-foreground">No songs found — try another search</p>
              </div>
            )}

            {!selectedSong && !query && results.length === 0 && (
              <div className="text-center py-6">
                <Disc3 className="w-8 h-8 text-primary/20 mx-auto mb-2 animate-spin" style={{ animationDuration: '3s' }} />
                <p className="text-xs text-muted-foreground">Type to search millions of songs 🔥</p>
              </div>
            )}

            <Button
              onClick={handleSubmit}
              disabled={!selectedSong}
              className="w-full h-12 rounded-2xl font-black gradient-purple text-primary-foreground btn-press relative overflow-hidden"
            >
              <span className="relative z-10 flex items-center gap-2">
                Add to Groups <Sparkles className="w-4 h-4" />
              </span>
              {selectedSong && <div className="absolute inset-0 shimmer" />}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
