/// <reference lib="dom"/>

import { initLoad } from "./sauropod-state.js?v=%DEPLOY_HASH%";
import { offline } from "./sauropod-offline.js?v=%DEPLOY_HASH%";

class Component extends HTMLElement {
  #url = new URL(globalThis.location.href);

  /** @returns {Array<HTMLAnchorElement>} */
  get menuItems() {
    return Array.from(this.querySelectorAll(".Header__menu .Button[href]"));
  }

  /** @returns {HTMLButtonElement} */
  get stopButton() {
    return this.querySelector("#player-stop");
  }

  get isPodcasts() {
    return /^\/(podcasts|episodes)\//.test(this.#url.pathname);
  }
  get isAudiobooks() {
    return /^\/(audiobooks)\//.test(this.#url.pathname);
  }
  get isBookmarks() {
    return this.#url.pathname.startsWith("/bookmarks/");
  }
  get isSettings() {
    return this.#url.pathname.startsWith("/settings/");
  }

  connectedCallback() {
    initLoad();
    offline.init();
    globalThis.navigator.serviceWorker.register(
      "/service-worker.js?v=%DEPLOY_HASH%",
    );
    globalThis.addEventListener("app:navigated", () => this.#onNavigated());
    globalThis.addEventListener("app:player", (ev) => this.#onPlayer(ev));
    setTimeout(() => {
      this.stopButton.addEventListener("click", () => {
        globalThis.dispatchEvent(new CustomEvent("app:stop"));
      });
    });
  }

  /** @param {CustomEvent} ev  */
  #onPlayer(ev) {
    this.stopButton.disabled = !("type" in ev.detail);
  }

  #onNavigated() {
    this.#url = new URL(globalThis.location.href);
    this.menuItems.forEach((item) => {
      item.ariaCurrent = null;
      if (item.href.includes("/podcasts/") && this.isPodcasts) {
        item.ariaCurrent = "page";
      } else if (item.href.includes("/audiobooks/") && this.isAudiobooks) {
        item.ariaCurrent = "page";
      } else if (item.href.includes("/bookmarks/") && this.isBookmarks) {
        item.ariaCurrent = "page";
      } else if (item.href.includes("/settings/") && this.isSettings) {
        item.ariaCurrent = "page";
      }
    });
  }
}

customElements.define("sauropod-header", Component);
