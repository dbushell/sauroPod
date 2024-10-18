/**
 * @typedef {import('@src/types.ts').AudioEntity} AudioEntity
 * @typedef {import('@src/types.ts').Bookmark} Bookmark
 */
/// <reference lib="dom"/>

import { offline } from "./sauropod-offline.js?v=%DEPLOY_HASH%";
import { viewTransition } from "./sauropod-utils.js?v=%DEPLOY_HASH%";

class Component extends HTMLElement {
  /** @returns {Array<HTMLElement>} */
  get bookmarks() {
    return Array.from(this.querySelectorAll('[id^="bookmark-"]'));
  }

  connectedCallback() {
    this.addEventListener("click", (ev) => this.#onClick(ev));
    globalThis.addEventListener("app:bookmark", (ev) => this.#onBookmark(ev));
    globalThis.addEventListener("app:ended", (ev) => this.#onEnded(ev));
    globalThis.addEventListener("app:store", () => this.#onStore());
    this.#onStore();
    // Remove unknown downloads
    for (const key of offline.store.cached) {
      const bookmark = document.querySelector(`[id*="${key}"]`);
      if (bookmark === null) {
        offline.remove(key);
      }
    }
  }

  #onStore() {
    for (const bookmark of this.bookmarks) {
      const id = bookmark.id.replace("bookmark-", "");
      const purge = bookmark.querySelector('[data-action="purge"]');
      const download = bookmark.querySelector('[data-action="download"]');
      purge.classList.toggle("hidden", offline.has(id) === false);
      download.classList.toggle("hidden", offline.has(id) === true);
      purge.disabled = offline.pending(id);
      download.disabled = offline.pending(id);
    }
  }

  /** @param {CustomEvent<AudioEntity>} ev */
  #onEnded(ev) {
    const id = `#bookmark-${ev.detail.ids.at(-1)}`;
    const bookmark = this.querySelector(id);
    if (bookmark) {
      viewTransition(() => {
        bookmark.remove();
      });
    }
  }

  /** @param {CustomEvent<Bookmark>} ev */
  #onBookmark(ev) {
    const id = `#bookmark-${ev.detail.ids.at(-1)}`;
    const bookmark = this.querySelector(id);
    if (bookmark === null) return;
    const progress = bookmark.querySelector("progress");
    if (progress === null) return;
    progress.value = ev.detail.progress;
  }

  /** @param {MouseEvent} ev */
  async #onClick(ev) {
    /** @type {HTMLAnchorElement} */
    const target = ev.target.closest("[data-action]");
    if (target === null) return;
    const bookmark = target.closest("article");
    if (bookmark === null) return;
    const id = bookmark.id.replace("bookmark-", "");
    ev.preventDefault();
    // Handle play bookmark
    if (target.dataset.action === "play") {
      globalThis.dispatchEvent(
        new CustomEvent("app:play", {
          detail: {
            id: bookmark.dataset.href,
          },
        }),
      );
      return;
    }
    // Handle delete bookmark
    if (target.dataset.action === "delete") {
      target.setAttribute("disabled", "");
      const confirm = globalThis.confirm(
        "Are you sure you want to remove this bookmark?",
      );
      if (confirm === false) {
        target.removeAttribute("disabled");
        return;
      }
      const url = new URL(bookmark.dataset.delete, globalThis.location.origin);
      const response = await fetch(url.href, { method: "DELETE" });
      if (!response.ok) {
        target.removeAttribute("disabled");
        alert("Delete action failed");
        return;
      }
      viewTransition(() => {
        bookmark.remove();
      });
      return;
    }
    // Handle download bookmark
    if (target.dataset.action === "download") {
      target.disabled = true;
      const url = new URL(bookmark.dataset.audio, globalThis.location.origin);
      offline.add({ id, url });
      return;
    }
    // Handle purge bookmark
    if (target.dataset.action === "purge") {
      target.disabled = true;
      offline.remove(id);
      return;
    }
  }
}

customElements.define("sauropod-bookmarks", Component);
