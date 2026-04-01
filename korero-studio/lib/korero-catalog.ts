import type { SupabaseClient } from '@supabase/supabase-js';
import { makeSongKey } from '@/lib/song-key';
import type { ReviewClassRequestPayload } from '@/lib/korero-types';
import type { SongGroupRow } from '@/lib/korero-mappers';

function songKeyFromRow(row: Pick<SongGroupRow, 'song_key' | 'song_title' | 'artist'>): string {
  return row.song_key ?? makeSongKey(row.song_title, row.artist);
}

/** Persist catalog + update affected groups (admin). */
export async function persistSongCatalogEntry(
  supabase: SupabaseClient,
  input: ReviewClassRequestPayload,
  previousSongKey?: string,
): Promise<void> {
  const roles = input.roleNames
    .map((r) => r.trim())
    .filter(Boolean)
    .slice(0, input.formationSize);

  await supabase.from('song_catalog').upsert(
    {
      song_key: input.songKey,
      song_title: input.songTitle,
      artist: input.artist,
      image_url: input.imageUrl ?? null,
      itunes_track_id: input.itunesTrackId ?? null,
      validated: true,
      formation_size: roles.length,
      role_names: roles,
      difficulty: input.difficulty,
      class_type_options: input.classTypeOptions,
      teacher_notes: input.teacherNotes,
      validated_at: new Date().toISOString(),
    },
    { onConflict: 'song_key' },
  );

  const { data: rows } = await supabase.from('classes').select('*');
  const groupRows = (rows ?? []) as SongGroupRow[];

  const applyAwaitingPatch = (g: SongGroupRow) => {
    const slotList = roles.length > 0 ? roles : g.slot_labels ?? [];
    const max = Math.max(1, slotList.length);
    let creatorSlot = g.creator_slot_label ?? '';
    if (!slotList.includes(creatorSlot)) {
      creatorSlot = slotList[0] ?? creatorSlot;
    }
    return { slotList, max, creatorSlot };
  };

  if (previousSongKey && previousSongKey !== input.songKey) {
    const creatorIdsNotified = new Set<string>();
    for (const g of groupRows) {
      const k = songKeyFromRow(g);
      if (k !== previousSongKey) continue;

      if (g.awaiting_song_validation) {
        const { slotList, max, creatorSlot } = applyAwaitingPatch(g);
        await supabase
          .from('classes')
          .update({
            song_title: input.songTitle,
            artist: input.artist,
            song_key: input.songKey,
            awaiting_song_validation: false,
            max_members: max,
            slot_labels: slotList,
            creator_slot_label: creatorSlot,
          })
          .eq('id', g.id);

        if (g.creator_id) {
          const sl = slotList.includes(g.creator_slot_label ?? '') ? g.creator_slot_label : slotList[0];
          await supabase
            .from('class_enrollments')
            .update({ slot_label: sl ?? g.creator_slot_label ?? '' })
            .eq('class_id', g.id)
            .eq('student_id', g.creator_id);

          if (!creatorIdsNotified.has(g.creator_id)) {
            creatorIdsNotified.add(g.creator_id);
            await supabase.from('student_notifications').insert({
              student_id: g.creator_id,
              message: `Your group for "${input.songTitle}" is now live!`,
              read: false,
            });
          }
        }
      } else {
        await supabase
          .from('classes')
          .update({
            song_title: input.songTitle,
            artist: input.artist,
            song_key: input.songKey,
          })
          .eq('id', g.id);
      }
    }

    await supabase.from('admin_alerts').delete().eq('song_key', previousSongKey);
    await supabase.from('admin_alerts').delete().eq('song_key', input.songKey);
    return;
  }

  const creatorIdsNotified = new Set<string>();
  for (const g of groupRows) {
    const k = songKeyFromRow(g);
    if (k !== input.songKey || !g.awaiting_song_validation) continue;

    const { slotList, max, creatorSlot } = applyAwaitingPatch(g);
    await supabase
      .from('classes')
      .update({
        song_title: input.songTitle,
        artist: input.artist,
        song_key: input.songKey,
        awaiting_song_validation: false,
        max_members: max,
        slot_labels: slotList,
        creator_slot_label: creatorSlot,
      })
      .eq('id', g.id);

    if (g.creator_id) {
      const sl = slotList.includes(g.creator_slot_label ?? '') ? g.creator_slot_label : slotList[0];
      await supabase
        .from('class_enrollments')
        .update({ slot_label: sl ?? g.creator_slot_label ?? '' })
        .eq('class_id', g.id)
        .eq('student_id', g.creator_id);

      if (!creatorIdsNotified.has(g.creator_id)) {
        creatorIdsNotified.add(g.creator_id);
        await supabase.from('student_notifications').insert({
          student_id: g.creator_id,
          message: `Your group for "${input.songTitle}" is now live!`,
          read: false,
        });
      }
    }
  }

  await supabase.from('admin_alerts').delete().eq('song_key', input.songKey);
}

/** Caller must ensure no group still references this song key (see groupSongKey / makeSongKey). */
export async function deleteSongCatalogFromDb(supabase: SupabaseClient, songKey: string): Promise<void> {
  await supabase.from('song_catalog').delete().eq('song_key', songKey);
  await supabase.from('admin_alerts').delete().eq('song_key', songKey);
}
