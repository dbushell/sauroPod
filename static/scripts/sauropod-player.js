/**
 * @typedef {import('@src/types.ts').APIData} APIData
 * @typedef {import('@src/types.ts').AudioEntity} AudioEntity
 * @typedef {import('@src/types.ts').Bookmark} Bookmark
 */
/// <reference lib="dom"/>

import { formatTime, getDataEntity } from "./sauropod-utils.js?v=%DEPLOY_HASH%";
import { setMediaSession } from "./sauropod-session.js?v=%DEPLOY_HASH%";
import { offline } from "./sauropod-offline.js?v=%DEPLOY_HASH%";

class Component extends HTMLElement {
  /** @type {string | undefined} */
  #playId;
  /** @type {AudioEntity | undefined} */
  #entity;
  /** @type {AudioEntity | undefined} */
  #oldEntity;
  /** @type {HTMLAudioElement | undefined} */
  #audio;
  #audioSrc = "";
  #bookmarkInterval = -1;
  #seekingTimeout = -1;
  #seekTimeout = -1;
  #onLoadedPosition = 0;
  #playbackRate = 1.0;
  #isDownload = false;
  #isPlaying = false;
  #isSeeking = false;
  #isLoaded = false;
  #rangeValue = 0;
  #rangeMax = 0;

  get audioSrc() {
    return this.#audioSrc;
  }

  set audioSrc(src) {
    this.#audioSrc = src;
    if (this.#audio) {
      this.#audio.src = this.#audioSrc;
    }
  }

  get isPlaying() {
    return this.#isPlaying;
  }

  set isPlaying(value) {
    this.#isPlaying = value;
    this.#updateUI();
  }

  get isSeeking() {
    return this.#isSeeking;
  }

  set isSeeking(value) {
    this.#isSeeking = value;
    this.#updateUI();
  }

  get isLoaded() {
    return this.#isLoaded;
  }

  set isLoaded(value) {
    this.#isLoaded = value;
    this.#updateUI();
    globalThis.dispatchEvent(
      new CustomEvent("app:loaded", { detail: value }),
    );
  }

  get rangeValue() {
    return this.#rangeValue;
  }

  set rangeValue(value) {
    this.#rangeValue = value;
    this.#updateUI();
  }

  get rangeMax() {
    return this.#rangeMax;
  }

  set rangeMax(value) {
    this.#rangeMax = value;
    this.#updateUI();
  }

  get rangeNow() {
    return formatTime(this.rangeValue);
  }

  get rangeEnd() {
    return formatTime(this.rangeMax - this.rangeValue);
  }

  /** @returns {HTMLButtonElement} */
  get pauseButton() {
    return this.querySelector('[data-action="pause"]');
  }

  /** @returns {HTMLButtonElement} */
  get playButton() {
    return this.querySelector('[data-action="play"]');
  }

  /** @returns {HTMLButtonElement} */
  get forwardButton() {
    return this.querySelector('[data-action="forward"]');
  }

  /** @returns {HTMLButtonElement} */
  get rewindButton() {
    return this.querySelector('[data-action="rewind"]');
  }

  /** @returns {HTMLInputElement} */
  get rangeInput() {
    return this.querySelector(".Range");
  }

  /** @returns {HTMLElement} */
  get seekElement() {
    return this.querySelector(".Seek");
  }

  /** @returns {HTMLProgressElement} */
  get progressElement() {
    return this.querySelector(".Progress");
  }

  /** Get entity ID to play */
  get playId() {
    return this.#playId;
  }

  /** Set entity ID and fetch its data */
  set playId(playId) {
    if (this.#playId === playId) {
      return;
    }
    this.#playId = playId;
    if (typeof playId !== "string") {
      this.entity = undefined;
      return;
    }
    fetch(`/api${playId}`)
      .then(async (response) => {
        /** @type {APIData} */
        const data = await response.json();
        this.entity = data;
      })
      .catch((err) => {
        console.error(err);
        this.entity = undefined;
      });
  }

  /** Get playing entity data */
  get entity() {
    return this.#entity;
  }

  /**
   * Set playing entity data
   * @type {APIData | AudioEntity | undefined}
   */
  set entity(newData) {
    this.#entity = getDataEntity(newData) ?? newData;
    globalThis.dispatchEvent(
      new CustomEvent("app:player", {
        detail: structuredClone(this.entity ?? {}),
      }),
    );
    if (!this.entity) {
      navigator.mediaSession.metadata = null;
      this.#oldEntity = undefined;
      this.resetAudio();
      return;
    }
    if (/^blob:/.test(this.audioSrc)) {
      URL.revokeObjectURL(this.audioSrc);
    }
    this.#isDownload = offline.has(this.entity.ids.at(-1));
    (async () => {
      if (this.#isDownload) {
        const blob = await offline.get(this.entity.ids.at(-1));
        if (blob) {
          this.audioSrc = URL.createObjectURL(blob);
        } else {
          console.error("Blob not found");
          navigator.mediaSession.metadata = null;
          this.playId = undefined;
          return;
        }
      } else {
        const url = new URL(
          `/api/audio/${this.entity.ids.join("/")}/`,
          globalThis.location.origin,
        );
        this.audioSrc = url.href;
      }
      if (this.#oldEntity?.ids.at(-1) === this.entity.ids.at(-1)) {
        this.setBookmark();
      } else {
        this.resetAudio();
      }
      setMediaSession(this.entity, "%DEPLOY_HASH%");
      this.#oldEntity = this.entity;
    })();
  }

  #updateUIFrame = 0;
  #updateUI() {
    globalThis.cancelAnimationFrame(this.#updateUIFrame);
    this.#updateUIFrame = globalThis.requestAnimationFrame(() => {
      this.forwardButton.disabled = !this.isLoaded;
      this.rewindButton.disabled = !this.isLoaded;
      this.pauseButton.disabled = !this.isLoaded || !this.isPlaying;
      this.playButton.disabled = !this.isLoaded || this.isPlaying;
      this.progressElement.value = this.rangeValue;
      this.progressElement.max = this.rangeMax;
      /** @type {HTMLElement} */
      const parent = this.progressElement.parentNode;
      parent.style.setProperty("--range-value", String(this.rangeValue));
      parent.style.setProperty("--range-max", String(this.rangeMax));
      this.rangeInput.max = String(this.rangeMax);
      this.rangeInput.value = String(this.rangeValue);
      this.rangeInput.disabled = !this.isLoaded;
      this.seekElement.hidden = !this.isSeeking;
      this.seekElement.innerText = this.rangeNow;
      this.seekElement.style.setProperty(
        "--range-value",
        String(this.rangeValue),
      );
      this.seekElement.style.setProperty("--range-max", String(this.rangeMax));
      this.querySelector("[data-range-start]").innerHTML = this.rangeNow;
      this.querySelector("[data-range-end]").innerHTML = `-${this.rangeEnd}`;
    });
  }

  resetAudio() {
    this.isLoaded = false;
    this.isSeeking = false;
    this.isPlaying = false;
    this.rangeValue = 0;
    this.rangeMax = 0;
    clearTimeout(this.#seekTimeout);
    clearInterval(this.#bookmarkInterval);
    if (this.#audio) this.#audio.currentTime = 0;
  }

  skipForward() {
    if (this.#audio) this.#audio.currentTime += 15;
  }

  skipBackward() {
    if (this.#audio) this.#audio.currentTime -= 15;
  }

  setBookmark() {
    if (!this.entity || !this.#audio) {
      return;
    }
    const position = this.#audio.currentTime;
    if (position === this.#onLoadedPosition) {
      return;
    }
    const duration = Number.isFinite(this.#audio.duration + 0)
      ? this.#audio.duration
      : this.entity.duration;
    /** @type {Bookmark} */
    const detail = {
      position,
      progress: Math.round((100 / duration) * position),
      ids: this.entity.ids,
      date: new Date(),
    };
    fetch(`/api/bookmarks/`, {
      method: "PUT",
      body: JSON.stringify(detail),
      headers: {
        "content-type": "application/json",
      },
    });
    globalThis.dispatchEvent(
      new CustomEvent("app:bookmark", { detail }),
    );
  }

  connectedCallback() {
    setTimeout(() => {
      this.#updateUI();

      this.#audio = this.querySelector("audio");
      this.#audio.addEventListener("timeupdate", () => this.#onTimeUpdate());
      this.#audio.addEventListener("seeked", () => this.#onSeeked());
      this.#audio.addEventListener("pause", () => this.#onPause());
      this.#audio.addEventListener("play", () => this.#onPlay());
      this.#audio.addEventListener("ended", () => this.#onEnded());
      this.#audio.addEventListener("loadeddata", () => this.#onLoaded());
      this.#audio.addEventListener("loadedmetadata", () => this.#onLoaded());
      this.#audio.addEventListener("canplay", () => this.#onLoaded());
      this.#audio.addEventListener("canplaythrough", () => this.#onLoaded());
      this.#audio.src = this.audioSrc;

      this.rewindButton.addEventListener("click", () => this.skipBackward());
      this.forwardButton.addEventListener("click", () => this.skipForward());
      this.pauseButton.addEventListener("click", () => this.#audio?.pause());
      this.playButton.addEventListener("click", () => this.#audio?.play());

      this.rangeInput.addEventListener("change", () => this.#onRangeChange());
      this.rangeInput.addEventListener("input", () => this.#onRangeInput());

      const { mediaSession } = globalThis.navigator;
      mediaSession.setActionHandler("seekbackward", () => this.skipBackward());
      mediaSession.setActionHandler("seekforward", () => this.skipForward());
      mediaSession.setActionHandler("previoustrack", () => this.skipBackward());
      mediaSession.setActionHandler("nexttrack", () => this.skipForward());

      globalThis.addEventListener("app:stop", () => {
        if (this.isPlaying) {
          this.#audio?.pause();
        }
        setTimeout(() => (this.playId = undefined), 0);
      });

      globalThis.addEventListener(
        "app:play",
        ({ detail }) => {
          if (this.isPlaying && this.#audio) {
            this.#audio.pause();
          }
          if (detail.id) {
            setTimeout(() => (this.playId = detail.id), 0);
          }
        },
      );

      globalThis.addEventListener("beforeunload", (ev) => {
        if (!this.isPlaying) return;
        this.#audio?.pause();
        ev.preventDefault();
      });
    });
  }

  #onLoaded() {
    if (this.isLoaded || !this.#audio || !this.entity) {
      return;
    }
    this.isLoaded = true;
    this.rangeMax = Math.round(
      Number.isFinite(this.#audio.duration + 0)
        ? this.#audio.duration
        : this.entity.duration,
    );
    this.#audio.playbackRate = this.#playbackRate;
    this.#onLoadedPosition = 0;
    if (this.entity.bookmark) {
      this.#onLoadedPosition = this.entity.bookmark.position;
      this.#audio.currentTime = this.#onLoadedPosition;
    } else {
      this.#audio.currentTime = 0;
    }
    this.#audio.play();
  }

  #onTimeUpdate() {
    if (!this.#audio) return;
    this.rangeValue = Math.round(this.#audio.currentTime);
  }

  #onPlay() {
    this.isPlaying = true;
    clearInterval(this.#bookmarkInterval);
    this.#bookmarkInterval = globalThis.setInterval(() => {
      if (this.isPlaying) {
        this.setBookmark();
      } else {
        clearInterval(this.#bookmarkInterval);
      }
    }, 60000);
  }

  #onPause() {
    this.isPlaying = false;
    if (!this.#audio?.ended) {
      this.setBookmark();
    }
  }

  #onSeeked() {
    clearTimeout(this.#seekTimeout);
    if (!this.#audio?.ended) {
      this.#seekTimeout = globalThis.setTimeout(() => this.setBookmark(), 1000);
    }
  }

  #onEnded() {
    clearInterval(this.#bookmarkInterval);
    this.isPlaying = false;
    if (/^blob:/.test(this.audioSrc)) {
      URL.revokeObjectURL(this.audioSrc);
    }
    if (this.entity) {
      fetch(`/api/bookmarks/${this.entity.ids.join("/")}/`, {
        method: "DELETE",
      });
      globalThis.dispatchEvent(
        new CustomEvent("app:ended", { detail: this.entity }),
      );
      offline.remove(this.entity.ids.at(-1));
    }
    this.playId = undefined;
  }

  #onRangeInput() {
    this.isSeeking = true;
    clearTimeout(this.#seekingTimeout);
    this.#seekingTimeout = globalThis.setTimeout(
      () => (this.isSeeking = false),
      500,
    );
    this.rangeValue = Number.parseFloat(this.rangeInput.value);
  }

  #onRangeChange() {
    this.rangeValue = Number.parseFloat(this.rangeInput.value);
    if (this.#audio) {
      this.#audio.currentTime = this.rangeValue;
    }
  }
}

customElements.define("sauropod-player", Component);
