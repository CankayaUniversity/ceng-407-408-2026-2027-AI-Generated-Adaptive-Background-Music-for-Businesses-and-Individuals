'use client';

/**
 * Music History: every playlist and song generated for the venue, with search,
 * filters and sortable columns. Built on the Astryx `table-page` template:
 * a scrolling masthead with record-level facts, a scope toggle and search box,
 * a sortable Table, and an EmptyState when nothing matches.
 */

import {useEffect, useMemo, useRef, useState, type RefObject} from 'react';
import {HStack, Layout, LayoutContent, StackItem, VStack} from '@astryxdesign/core/Layout';
import {Heading, Text} from '@astryxdesign/core/Text';
import {Button} from '@astryxdesign/core/Button';
import {EmptyState} from '@astryxdesign/core/EmptyState';
import {Icon} from '@astryxdesign/core/Icon';
import {IconButton} from '@astryxdesign/core/IconButton';
import {MetadataList, MetadataListItem} from '@astryxdesign/core/MetadataList';
import {SegmentedControl, SegmentedControlItem} from '@astryxdesign/core/SegmentedControl';
import {Selector} from '@astryxdesign/core/Selector';
import {Switch} from '@astryxdesign/core/Switch';
import {TextInput} from '@astryxdesign/core/TextInput';
import {InputGroup, InputGroupText} from '@astryxdesign/core/InputGroup';
import {
  Table,
  pixel,
  proportional,
  useTableSortable,
  useTableSortableState,
} from '@astryxdesign/core/Table';
import type {TableColumn, TableSortComparator} from '@astryxdesign/core/Table';
import {MagnifyingGlassIcon, QueueListIcon} from '@heroicons/react/24/outline';
import {PlayIcon} from '@heroicons/react/24/solid';
import {FavoriteIcon} from '../player/FavoriteIcon';
import {MoodArt} from '../mood/MoodArt';
import {describeValue} from '../mood/axisMeaning';
import {formatDuration} from '../player/types';
import {
  PLAYLISTS,
  SOURCE_LABEL,
  TRACK_RECORDS,
  type PlaylistRecord,
  type PlaylistSource,
  type TrackRecord,
} from './mockHistory';
import {PlaylistDrawer} from './PlaylistDrawer';
import {formatDateTime, formatListeningTime} from './format';

type Scope = 'playlists' | 'tracks';

const SOURCE_OPTIONS = [
  {value: 'all', label: 'All sources'},
  ...(Object.keys(SOURCE_LABEL) as PlaylistSource[]).map(value => ({
    value,
    label: SOURCE_LABEL[value],
  })),
];

const time = (iso: string) => new Date(iso).getTime();

/*
 * The search field is an InputGroup (TextInput has no end icon). These styles
 * drop the seam between the input and the magnifier so it reads as one box
 * with an icon inside. TextInput's focus ring is an inset shadow on all four
 * sides; while focused, both halves draw it on their outer sides only and the
 * magnifier side takes the accent border, so the ring wraps the whole box.
 */
const RING = 'var(--color-accent-muted)';
function searchControlStyle(isFocused: boolean) {
  return {
    borderInlineEndWidth: 0,
    ...(isFocused && {
      boxShadow: `inset 2px 0 0 0 ${RING}, inset 0 2px 0 0 ${RING}, inset 0 -2px 0 0 ${RING}`,
    }),
  };
}
function searchIconStyle(isFocused: boolean) {
  return {
    backgroundColor: 'var(--color-background-surface)',
    borderInlineStartWidth: 0,
    paddingInlineEnd: 'var(--spacing-3)',
    ...(isFocused && {
      borderColor: 'var(--color-accent)',
      boxShadow: `inset -2px 0 0 0 ${RING}, inset 0 2px 0 0 ${RING}, inset 0 -2px 0 0 ${RING}`,
    }),
  };
}

/** Tracks focus on an input reached through a ref (TextInput has no onFocus prop). */
function useFocusState(ref: RefObject<HTMLInputElement | null>) {
  const [isFocused, setIsFocused] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) {
      return;
    }
    const onFocus = () => setIsFocused(true);
    const onBlur = () => setIsFocused(false);
    el.addEventListener('focus', onFocus);
    el.addEventListener('blur', onBlur);
    return () => {
      el.removeEventListener('focus', onFocus);
      el.removeEventListener('blur', onBlur);
    };
  }, [ref]);
  return isFocused;
}

const PLAYLIST_COMPARATORS: Partial<Record<string, TableSortComparator<PlaylistRecord>>> = {
  name: (a, b) => a.name.localeCompare(b.name),
  source: (a, b) => SOURCE_LABEL[a.source].localeCompare(SOURCE_LABEL[b.source]),
  songs: (a, b) => a.trackIds.length - b.trackIds.length,
  duration: (a, b) => a.durationSec - b.durationSec,
  createdAt: (a, b) => time(a.createdAt) - time(b.createdAt),
};

const TRACK_COMPARATORS: Partial<Record<string, TableSortComparator<TrackRecord>>> = {
  title: (a, b) => a.track.title.localeCompare(b.track.title),
  playlist: (a, b) => a.playlistName.localeCompare(b.playlistName),
  duration: (a, b) => a.track.durationSec - b.track.durationSec,
  generatedAt: (a, b) => time(a.generatedAt) - time(b.generatedAt),
  plays: (a, b) => a.plays - b.plays,
};

export function MusicHistoryScreen() {
  const [scope, setScope] = useState<Scope>('playlists');
  const [query, setQuery] = useState('');
  const [source, setSource] = useState<PlaylistSource | 'all'>('all');
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [favorites, setFavorites] = useState(
    () => new Set(TRACK_RECORDS.filter(r => r.isFavorite).map(r => r.track.id)),
  );
  const [openPlaylistId, setOpenPlaylistId] = useState<string | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const isSearchFocused = useFocusState(searchRef);

  const toggleFavorite = (trackId: string) =>
    setFavorites(prev => {
      const next = new Set(prev);
      if (next.has(trackId)) {
        next.delete(trackId);
      } else {
        next.add(trackId);
      }
      return next;
    });

  const term = query.trim().toLowerCase();

  const visiblePlaylists = useMemo(
    () =>
      PLAYLISTS.filter(p => source === 'all' || p.source === source).filter(
        p => term === '' || p.name.toLowerCase().includes(term),
      ),
    [source, term],
  );

  const visibleTracks = useMemo(
    () =>
      TRACK_RECORDS.filter(r => source === 'all' || r.source === source)
        .filter(r => !favoritesOnly || favorites.has(r.track.id))
        .filter(
          r =>
            term === '' ||
            r.track.title.toLowerCase().includes(term) ||
            r.playlistName.toLowerCase().includes(term) ||
            r.track.prompt.toLowerCase().includes(term),
        ),
    [source, favoritesOnly, favorites, term],
  );

  const playlistSort = useTableSortableState<PlaylistRecord>({
    data: visiblePlaylists,
    comparators: PLAYLIST_COMPARATORS,
  });
  const playlistSortPlugin = useTableSortable<PlaylistRecord>(playlistSort.sortConfig);
  const trackSort = useTableSortableState<TrackRecord>({
    data: visibleTracks,
    comparators: TRACK_COMPARATORS,
  });
  const trackSortPlugin = useTableSortable<TrackRecord>(trackSort.sortConfig);

  const playlistColumns: TableColumn<PlaylistRecord>[] = [
    {
      key: 'name',
      header: 'Playlist',
      width: proportional(3),
      sortable: true,
      renderCell: p => (
        <HStack gap={3} vAlign="center">
          <MoodArt mood={p.mood} size={40} />
          <VStack gap={0}>
            <Text weight="semibold" maxLines={1}>
              {p.name}
            </Text>
            <Text type="supporting" maxLines={1}>
              {describeValue('energy', p.mood.energy)}, {describeValue('texture', p.mood.texture)}
            </Text>
          </VStack>
        </HStack>
      ),
    },
    {
      key: 'source',
      header: 'Started by',
      width: pixel(150),
      sortable: true,
      renderCell: p => <Text color="secondary">{SOURCE_LABEL[p.source]}</Text>,
    },
    {
      key: 'songs',
      header: 'Songs',
      width: pixel(80),
      align: 'end',
      sortable: true,
      renderCell: p => <Text hasTabularNumbers>{p.trackIds.length}</Text>,
    },
    {
      key: 'duration',
      header: 'Length',
      width: pixel(90),
      align: 'end',
      sortable: true,
      renderCell: p => <Text hasTabularNumbers>{formatDuration(p.durationSec)}</Text>,
    },
    {
      key: 'createdAt',
      header: 'Created',
      width: pixel(140),
      sortable: true,
      renderCell: p => <Text color="secondary">{formatDateTime(p.createdAt)}</Text>,
    },
    {
      key: 'actions',
      header: '',
      width: pixel(90),
      align: 'end',
      renderCell: p => (
        <HStack gap={1} hAlign="end">
          <IconButton
            label={`Show songs in ${p.name}`}
            tooltip="Show songs"
            size="sm"
            variant="ghost"
            icon={<Icon icon={QueueListIcon} />}
            onClick={() => setOpenPlaylistId(p.id)}
          />
          <IconButton
            label={`Play ${p.name}`}
            size="sm"
            variant="secondary"
            icon={<Icon icon={PlayIcon} />}
          />
        </HStack>
      ),
    },
  ];

  const trackColumns: TableColumn<TrackRecord>[] = [
    {
      key: 'title',
      header: 'Song',
      width: proportional(3),
      sortable: true,
      renderCell: r => (
        <HStack gap={3} vAlign="center">
          <MoodArt mood={r.track.mood} size={40} />
          <VStack gap={0}>
            <Text weight="semibold" maxLines={1}>
              {r.track.title}
            </Text>
            <Text type="supporting" maxLines={1}>
              {r.track.prompt}
            </Text>
          </VStack>
        </HStack>
      ),
    },
    {
      key: 'playlist',
      header: 'Playlist',
      width: pixel(150),
      sortable: true,
      renderCell: r => (
        <Text color="secondary" maxLines={1}>
          {r.playlistName}
        </Text>
      ),
    },
    {
      key: 'duration',
      header: 'Length',
      width: pixel(80),
      align: 'end',
      sortable: true,
      renderCell: r => <Text hasTabularNumbers>{formatDuration(r.track.durationSec)}</Text>,
    },
    {
      key: 'plays',
      header: 'Plays',
      width: pixel(70),
      align: 'end',
      sortable: true,
      renderCell: r => <Text hasTabularNumbers>{r.plays}</Text>,
    },
    {
      key: 'generatedAt',
      header: 'Generated',
      width: pixel(140),
      sortable: true,
      renderCell: r => <Text color="secondary">{formatDateTime(r.generatedAt)}</Text>,
    },
    {
      key: 'actions',
      header: '',
      width: pixel(90),
      align: 'end',
      renderCell: r => {
        const isFavorite = favorites.has(r.track.id);
        return (
          <HStack gap={1} hAlign="end">
            <IconButton
              label={isFavorite ? `Remove ${r.track.title} from favorites` : `Add ${r.track.title} to favorites`}
              size="sm"
              variant="ghost"
              icon={<FavoriteIcon isFavorite={isFavorite} />}
              onClick={() => toggleFavorite(r.track.id)}
            />
            <IconButton
              label={`Play ${r.track.title}`}
              size="sm"
              variant="secondary"
              icon={<Icon icon={PlayIcon} />}
            />
          </HStack>
        );
      },
    },
  ];

  // Record-level facts for the masthead; they describe the whole history, not the filtered view.
  const listeningSec = TRACK_RECORDS.reduce((sum, r) => sum + r.plays * r.track.durationSec, 0);
  const facts = [
    {label: 'Playlists', value: String(PLAYLISTS.length)},
    {label: 'Songs generated', value: String(TRACK_RECORDS.length)},
    {label: 'Listening time', value: formatListeningTime(listeningSec)},
    {label: 'Favorites', value: String(favorites.size)},
  ];

  const isEmpty = scope === 'playlists' ? visiblePlaylists.length === 0 : visibleTracks.length === 0;
  const clearFilters = () => {
    setQuery('');
    setSource('all');
    setFavoritesOnly(false);
  };

  const openPlaylist = PLAYLISTS.find(p => p.id === openPlaylistId) ?? null;

  return (
    <Layout
      height="fill"
      contentWidth={1100}
      content={
        // padding 0 keeps the table on the same content line as the masthead (see table-page).
        <LayoutContent padding={0}>
          <VStack padding={6} gap={8}>
            <VStack gap={6}>
              <HStack gap={3} vAlign="center" wrap="wrap">
                <StackItem size="fill">
                  <VStack gap={1}>
                    <Heading level={1}>Music History</Heading>
                    <Text color="secondary">Every playlist and song made for your venue.</Text>
                  </VStack>
                </StackItem>
              </HStack>
              <MetadataList columns="multi" orientation="vertical" label={{position: 'top'}}>
                {facts.map(f => (
                  <MetadataListItem key={f.label} label={f.label}>
                    <Text type="large" weight="semibold" hasTabularNumbers>
                      {f.value}
                    </Text>
                  </MetadataListItem>
                ))}
              </MetadataList>
            </VStack>

            <HStack gap={3} vAlign="center" wrap="wrap">
              <SegmentedControl label="Show" value={scope} onChange={v => setScope(v as Scope)}>
                <SegmentedControlItem value="playlists" label="Playlists" />
                <SegmentedControlItem value="tracks" label="Songs" />
              </SegmentedControl>
              <Selector
                label="Started by"
                isLabelHidden
                options={SOURCE_OPTIONS}
                value={source}
                onChange={v => setSource(v as PlaylistSource | 'all')}
                width={180}
              />
              <VStack width={280}>
                {/* InputGroup puts the magnifier at the end; TextInput only has a start icon. */}
                <InputGroup label="Search" isLabelHidden>
                  <TextInput
                    label={scope === 'playlists' ? 'Search playlists' : 'Search songs'}
                    isLabelHidden
                    type="search"
                    value={query}
                    onChange={setQuery}
                    placeholder={scope === 'playlists' ? 'Search playlists…' : 'Search songs or prompts…'}
                    ref={searchRef}
                    controlStyle={searchControlStyle(isSearchFocused)}
                  />
                  <InputGroupText style={searchIconStyle(isSearchFocused)}>
                    <Icon icon={MagnifyingGlassIcon} size="sm" color="secondary" />
                  </InputGroupText>
                </InputGroup>
              </VStack>
              {scope === 'tracks' && (
                <Switch label="Favorites only" value={favoritesOnly} onChange={setFavoritesOnly} />
              )}
            </HStack>

            {isEmpty ? (
              <EmptyState
                title={scope === 'playlists' ? 'No matching playlists' : 'No matching songs'}
                description="Nothing in your history matches the current filters."
                actions={<Button label="Clear filters" variant="secondary" onClick={clearFilters} />}
              />
            ) : scope === 'playlists' ? (
              <Table<PlaylistRecord>
                data={playlistSort.sortedData}
                columns={playlistColumns}
                idKey="id"
                density="balanced"
                dividers="rows"
                hasHover
                textOverflow="truncate"
                plugins={{sort: playlistSortPlugin}}
              />
            ) : (
              <Table<TrackRecord>
                data={trackSort.sortedData}
                columns={trackColumns}
                idKey="id"
                density="balanced"
                dividers="rows"
                hasHover
                textOverflow="truncate"
                plugins={{sort: trackSortPlugin}}
              />
            )}
          </VStack>
          <PlaylistDrawer
            playlist={openPlaylist}
            tracks={TRACK_RECORDS.filter(r => r.playlistId === openPlaylistId)}
            onClose={() => setOpenPlaylistId(null)}
          />
        </LayoutContent>
      }
    />
  );
}
