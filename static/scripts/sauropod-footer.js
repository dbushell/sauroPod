/// <reference lib="dom"/>

import { offline } from "./sauropod-offline.js?v=%DEPLOY_HASH%";
import { formatBytes } from "./sauropod-utils.js?v=%DEPLOY_HASH%";

class Component extends HTMLElement {
  /** @returns {HTMLElement} */
  get storeMeta() {
    return this.querySelector("p:nth-child(2)");
  }

  connectedCallback() {
    globalThis.addEventListener("app:store", () => this.#onStore());
  }

  #onStore() {
    const usage = formatBytes(offline.store.usage);
    const quota = formatBytes(offline.store.quota);
    this.storeMeta.hidden = quota === 0;
    this.storeMeta.innerHTML =
      `<small> ${usage} of ${quota} (${offline.store.cached.size})</small>`;
  }
}

customElements.define("sauropod-footer", Component);
