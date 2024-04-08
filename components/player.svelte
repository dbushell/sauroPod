<script context="module" lang="ts">
  export const island = true;
</script>

<script lang="ts">
  import type {APIData, AudioEntity, PublicData} from '@src/types.ts';
  import {writable, derived, type Readable} from 'svelte/store';
  import {getContext, onMount} from 'svelte';
  import {formatTime, getDataEntity} from '@src/shared/mod.ts';
  import Atom from '@components/player/atom.svelte';
  import Pause from '@components/player/pause.svelte';
  import Play from '@components/player/play.svelte';
  import NowPlaying from '@components/player/playing.svelte';
  import Skip from '@components/player/skip.svelte';
  import {setMediaSession} from '@src/browser/session.ts';
  import {offline, offlineStore} from '@src/browser/offline.ts';

  /** Pre-populate the $playStore for active Episode ID */
  export let playId: string;

  /** Active Episode ID */
  const playStore = writable<string | null>(playId ?? null);

  const browser = getContext<boolean>('browser');
  const {version} = getContext<PublicData>('publicData');

  /** Active Episode and Podcast data */
  const playerStore: Readable<AudioEntity | null> = derived([playStore], ([$playStore], set) => {
    if (!browser || !$playStore) {
      set(null);
      return;
    }
    fetch(`/api${$playStore}`)
      .then(async (response) => {
        const data = (await response.json()) as APIData;
        set(getDataEntity(data));
      })
      .catch((err) => {
        console.error(err);
        set(null);
      });
  });

  let ref: HTMLElement;
  let oldEntity: AudioEntity | null = null;
  let audio: HTMLAudioElement;
  let audioSrc: string = '';

  let bookmarkInterval: number;
  let seekingTimeout: number;
  let seekTimeout: number;
  let onLoadedPosition = 0;
  let playbackRate = 1.0;
  let isDownload = false;
  let isOffline = false;
  let isPlaying = false;
  let isSeeking = false;
  let isLoaded = false;
  let rangeValue = 0;
  let rangeMax = 0;
  let rangeNow: string;
  let rangeStart = '00:00';
  let rangeEnd = '00:00';

  $: {
    rangeNow = formatTime(rangeValue);
    rangeEnd = formatTime(rangeMax - rangeValue);
  }

  const resetAudio = () => {
    isLoaded = false;
    isSeeking = false;
    isPlaying = false;
    rangeValue = 0;
    rangeMax = 0;
    rangeStart = '00:00';
    rangeEnd = '00:00';
    clearTimeout(seekTimeout);
    clearInterval(bookmarkInterval);
    if (audio) {
      audio.currentTime = 0;
    }
  };

  const skipForward = () => {
    audio.currentTime += 15;
  };

  const skipBackward = () => {
    audio.currentTime -= 15;
  };

  /** Return all related `<progress>` bars */
  const queryProgress = () =>
    Array.from(
      document.querySelectorAll(`progress[data-id="${$playerStore.ids.at(-1)}"]`)
    ) as Array<HTMLProgressElement>;

  const setBookmark = () => {
    if (!$playerStore || !audio) return;
    const position = audio.currentTime;
    if (position === onLoadedPosition) return;
    fetch(`/api/bookmarks/`, {
      method: 'PUT',
      body: JSON.stringify({
        position,
        ids: $playerStore.ids,
        date: new Date()
      }),
      headers: {
        'content-type': 'application/json'
      }
    });
    queryProgress().forEach((progress) => {
      progress.value = Math.round((100 / $playerStore.duration) * position);
    });
  };

  playerStore.subscribe(async (newEntity) => {
    if (!browser) {
      return;
    }
    globalThis.dispatchEvent(
      new CustomEvent('app:player', {
        detail: structuredClone(newEntity ?? {})
      })
    );
    if (!newEntity) {
      navigator.mediaSession.metadata = null;
      oldEntity = null;
      resetAudio();
      return;
    }
    if (/^blob:/.test(audioSrc)) {
      URL.revokeObjectURL(audioSrc);
    }
    isDownload = offline.has(newEntity.ids.at(-1));
    if (isOffline && !isDownload) {
      alert('Cannot play in offline mode');
      navigator.mediaSession.metadata = null;
      playStore.set(null);
      return;
    }
    if (isDownload) {
      const blob = await offline.get(newEntity.ids.at(-1));
      if (blob) {
        audioSrc = URL.createObjectURL(blob);
      } else {
        console.error('Blob not found');
        navigator.mediaSession.metadata = null;
        playStore.set(null);
        return;
      }
    } else {
      const url = new URL(`/api/audio/${newEntity.ids.join('/')}/`, globalThis.location.origin);
      audioSrc = url.href;
    }
    if (oldEntity && oldEntity.ids.at(-1) === newEntity.ids.at(-1)) {
      setBookmark();
    } else {
      resetAudio();
    }
    setMediaSession(newEntity, version);
    oldEntity = newEntity;
  });

  const onLoaded = () => {
    if (isLoaded) {
      return;
    }
    isLoaded = true;
    rangeMax = Math.round(
      Number.isFinite(audio.duration + 0) ? audio.duration : $playerStore.duration
    );
    rangeEnd = formatTime(rangeMax);
    audio.playbackRate = playbackRate;
    onLoadedPosition = 0;
    if ($playerStore.bookmark) {
      onLoadedPosition = $playerStore.bookmark.position;
      audio.currentTime = onLoadedPosition;
    } else {
      audio.currentTime = 0;
    }
    audio.play();
  };

  const onTimeUpdate = () => {
    rangeValue = Math.round(audio.currentTime);
    rangeStart = rangeNow;
  };

  const onPlay = () => {
    isPlaying = true;
    clearInterval(bookmarkInterval);
    bookmarkInterval = globalThis.setInterval(() => {
      if (isPlaying) {
        setBookmark();
      } else {
        clearInterval(bookmarkInterval);
      }
    }, 60000);
  };

  const onPause = () => {
    isPlaying = false;
    if (!audio.ended) {
      setBookmark();
    }
  };

  const onSeeked = () => {
    rangeStart = rangeNow;
    clearTimeout(seekTimeout);
    if (!audio.ended) {
      seekTimeout = globalThis.setTimeout(setBookmark, 1000);
    }
  };

  const onEnded = () => {
    clearInterval(bookmarkInterval);
    queryProgress().forEach((progress) => {
      const bookmark = progress.closest(`#bookmark-${$playerStore.ids.at(-1)}`);
      (bookmark ?? progress).remove();
    });
    isPlaying = false;
    if (/^blob:/.test(audioSrc)) {
      URL.revokeObjectURL(audioSrc);
    }
    fetch(`/api/bookmarks/${$playerStore.ids.join('/')}/`, {
      method: 'DELETE'
    });
    offline.remove($playerStore.ids.at(-1));
    playStore.set(null);
  };

  const onRangeInput = () => {
    isSeeking = true;
    clearTimeout(seekingTimeout);
    seekingTimeout = globalThis.setTimeout(() => (isSeeking = false), 500);
  };

  const onRangeChange = (ev: Event) => {
    const target = ev.target as HTMLInputElement;
    audio.currentTime = Number.parseFloat(target.value);
  };

  const onClick = (ev: MouseEvent) => {
    const download = (ev.target as HTMLElement).closest('[data-download]') as HTMLButtonElement;
    if (download) {
      ev.preventDefault();
      download.disabled = true;
      const id = download.dataset.download;
      offline.add({id, url: new URL(`/api/audio/${id}/`, globalThis.location.origin)});
      return;
    }
    const purge = (ev.target as HTMLElement).closest('[data-purge]') as HTMLButtonElement;
    if (purge) {
      ev.preventDefault();
      purge.disabled = true;
      offline.remove(purge.dataset.purge);
      return;
    }
    const play = (ev.target as HTMLElement).closest('[data-play]') as HTMLElement;
    if (play) {
      ev.preventDefault();
      if (isPlaying) audio.pause();
      const id = play.dataset.play || play.getAttribute('href');
      setTimeout(() => playStore.set(id), 0);
      return;
    }
  };

  let updateTimeout: number;

  const updateOffline = (immediate = false) => {
    clearTimeout(updateTimeout);
    updateTimeout = setTimeout(
      () => {
        document.querySelectorAll('[data-download]').forEach((node) => {
          const button = node as HTMLButtonElement;
          const id = button.dataset.download;
          button.classList.toggle('hidden', offline.has(id));
          button.disabled = offline.has(id);
        });
        document.querySelectorAll('[data-purge]').forEach((node) => {
          const button = node as HTMLButtonElement;
          const id = button.dataset.purge;
          button.classList.toggle('hidden', !offline.has(id));
          button.disabled = !offline.has(id);
        });
      },
      immediate ? 0 : 100
    );
  };

  onMount(() => {
    const observer = new IntersectionObserver(
      ([e]) => e.target.classList.toggle('sticky', e.intersectionRatio < 1),
      {threshold: [1], rootMargin: '-1px 0px 0px 0px'}
    );
    observer.observe(ref);

    offline.init(`/offline.js?v=${version}`);
    offlineStore.subscribe(() => updateOffline());

    globalThis.addEventListener('click', onClick);

    globalThis.addEventListener('app:stop', () => {
      if (isPlaying) audio.pause();
      setTimeout(() => playStore.set(null), 0);
    });

    globalThis.addEventListener('beforeunload', (ev: BeforeUnloadEvent) => {
      if (!isPlaying) return;
      audio.pause();
      ev.preventDefault();
      return (ev.returnValue = '...');
    });

    globalThis.addEventListener('app:navigated', () => {
      updateOffline(true);

      // Remove missing bookmarks from offline cache
      if (globalThis.location.pathname.startsWith('/bookmarks/')) {
        $offlineStore.cached.forEach((id) => {
          if (!document.querySelector(`[id*="${id}"]`)) {
            offline.remove(id);
          }
        });
      }
    });

    navigator.mediaSession.setActionHandler('seekbackward', skipBackward);
    navigator.mediaSession.setActionHandler('seekforward', skipForward);
    navigator.mediaSession.setActionHandler('previoustrack', skipBackward);
    navigator.mediaSession.setActionHandler('nexttrack', skipForward);
  });
</script>

<aside bind:this={ref} class="Grid | Container Container--light">
  <h2 class="hidden">Audio Player</h2>
  <div class="Stack gap-s">
    {#if $playStore}
      <div class="flex flex-wrap gap-xs ai-center jc-between">
        {#if $playerStore}
          <NowPlaying player={{...$playerStore}} {isLoaded} {isOffline} {isDownload} />
        {:else}
          <p>Loading...</p>
        {/if}
      </div>
    {/if}
    <div style:--range-value={rangeValue} style:--range-max={rangeMax}>
      <progress class="Progress" value={rangeValue} max={rangeMax}></progress>
      <input
        type="range"
        class="Range"
        aria-label="progress"
        bind:value={rangeValue}
        on:change={onRangeChange}
        on:input={onRangeInput}
        disabled={!isLoaded}
        max={rangeMax}
        min={0}
      />
      {#if isSeeking}
        <div role="tooltip" style:--range-value={rangeValue} style:--range-max={rangeMax}>
          {rangeNow}
        </div>
      {/if}
      <Atom {isPlaying} />
      <Atom {isPlaying} />
    </div>
    <div aria-hidden={!isLoaded} class="flex gap-xs jc-between ai-center">
      <div class="order-1">
        <span class="hidden">Current time</span>
        <span class="small monospace">{rangeStart}</span>
      </div>
      <div class="order-3">
        <span class="hidden">Duration</span>
        <span class="small monospace">-{rangeEnd}</span>
      </div>
      <div class="Button-group jc-center order-2" aria-label="playback controls" role="toolbar">
        <Skip id="rewind" skip={15} isDisabled={!isLoaded} on:click={skipBackward} />
        {#if isPlaying}
          <Pause isDisabled={!isLoaded} on:click={() => audio.pause()} />
        {:else}
          <Play isDisabled={!isLoaded} on:click={() => audio.play()} />
        {/if}
        <Skip id="fast-forward" skip={15} isDisabled={!isLoaded} on:click={skipForward} />
      </div>
    </div>
    {#if $playerStore && audioSrc}
      <audio
        bind:this={audio}
        {...{playbackRate}}
        on:timeupdate={onTimeUpdate}
        on:seeked={onSeeked}
        on:pause={onPause}
        on:play={onPlay}
        on:ended={onEnded}
        on:loadeddata={onLoaded}
        on:loadedmetadata={onLoaded}
        on:canplay={onLoaded}
        on:canplaythrough={onLoaded}
        src={audioSrc}
        preload="metadata"
      />
    {/if}
  </div>
</aside>

<style>
  aside {
    position: sticky;
    inset-block-start: 0;
    z-index: 1;

    & :has(.Range) {
      position: relative;
    }

    & [role='tooltip'] {
      --offset: calc(((100% - var(--space-m)) / var(--range-max)) * var(--range-value));

      color: oklch(var(--color-bg-default));
      display: block;
      background: oklch(var(--color-primary));
      background-image: linear-gradient(
        45deg,
        oklch(var(--color-secondary)),
        oklch(var(--color-primary))
      );
      border-radius: calc((8 / 16) * 1rem);
      font-size: var(--step-0);
      font-weight: 700;
      inset-block-end: calc(100% + var(--space-2xs));
      inset-inline-start: var(--offset);
      line-height: 1;
      padding: var(--space-3xs) var(--space-2xs);
      position: absolute;
      text-transform: uppercase;
      transform: translateX(calc(-50% + (var(--space-m) / 2)));
      z-index: 99;
    }
  }

  .Progress {
    --size: var(--space-m);
    margin-block-end: calc(-1 * var(--size));
  }

  .Range {
    --color-bg-lighter: 0% 0 0 / 0;
  }

  .Button-group {
    flex-grow: 1;
    flex-wrap: nowrap;
    margin: 0;

    & .Button {
      --icon-scale: 1.3;
      flex-grow: 1;
      min-inline-size: var(--button-height);
      max-inline-size: calc((160 / 16) * 1rem);
      padding-inline: 0;
      position: relative;
    }
  }
</style>
