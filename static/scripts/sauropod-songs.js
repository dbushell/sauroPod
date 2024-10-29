/**
 * @typedef {import('@src/types.ts').AudioEntity} AudioEntity
 */
/// <reference lib="dom"/>

class Component extends HTMLElement {
  /** @returns {Array<HTMLElement>} */
  get songs() {
    return Array.from(this.querySelectorAll('[id^="song-"]'));
  }

  connectedCallback() {
    this.addEventListener("click", (ev) => this.#onClick(ev));
  }

  /** @param {MouseEvent} ev */
  #onClick(ev) {
    /** @type {HTMLAnchorElement} */
    const target = ev.target.closest('[data-href^="/songs/"]');
    if (target === null) return;
    ev.preventDefault();
    const href = new URL(target.dataset.href, globalThis.location.href);
    globalThis.dispatchEvent(
      new CustomEvent("app:play", {
        detail: { id: href.pathname },
      }),
    );
  }
}

customElements.define("sauropod-songs", Component);
