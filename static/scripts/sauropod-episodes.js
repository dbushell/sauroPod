/**
 * @typedef {import('@src/types.ts').AudioEntity} AudioEntity
 * @typedef {import('@src/types.ts').Bookmark} Bookmark
 */
/// <reference lib="dom"/>

class Component extends HTMLElement {
  /** @returns {Array<HTMLElement>} */
  get episodes() {
    return Array.from(this.querySelectorAll('[id^="episode-"]'));
  }

  connectedCallback() {
    this.addEventListener("click", (ev) => this.#onClick(ev));
    globalThis.addEventListener("app:bookmark", (ev) => this.#onBookmark(ev));
    if (
      this.episodes.length &&
      globalThis.location.pathname.startsWith("/episodes/")
    ) {
      const href = new URL(this.episodes[0].href);
      setTimeout(() => {
        globalThis.dispatchEvent(
          new CustomEvent("app:play", {
            detail: { id: href.pathname },
          }),
        );
      }, 500);
    }
  }

  /** @param {CustomEvent<Bookmark>} ev */
  #onBookmark(ev) {
    const id = `#episode-${ev.detail.ids.at(-1)}`;
    const parent = this.querySelector(id);
    if (parent === null) return;
    const progress = parent.querySelector("progress");
    if (parent === null) return;
    progress.value = ev.detail.progress;
  }

  /** @param {MouseEvent} ev */
  #onClick(ev) {
    /** @type {HTMLAnchorElement} */
    const target = ev.target.closest('[href^="/episodes/"]');
    if (target === null) return;
    ev.preventDefault();
    const href = new URL(target.href);
    globalThis.dispatchEvent(
      new CustomEvent("app:play", {
        detail: { id: href.pathname },
      }),
    );
  }
}

customElements.define("sauropod-episodes", Component);
