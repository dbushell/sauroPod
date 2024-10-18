/**
 * @typedef {import('@src/types.ts').AudioEntity} AudioEntity
 */
/// <reference lib="dom"/>

import { initElements } from "./sauropod-state.js?v=%DEPLOY_HASH%";
import { offline } from "./sauropod-offline.js?v=%DEPLOY_HASH%";

class Component extends HTMLElement {
  /** @returns {Array<HTMLAnchorElement>} */
  get menuItems() {
    return Array.from(this.querySelectorAll(".Header__menu .Button[href]"));
  }

  /** @returns {HTMLImageElement} */
  get image() {
    return this.querySelector("img");
  }

  /** @returns {HTMLElement} */
  get entityTitle() {
    return this.querySelector("p:nth-child(1) span");
  }

  /** @returns {HTMLElement} */
  get parentTitle() {
    return this.querySelector("p:nth-child(2)");
  }

  /** @returns {SVGElement} */
  get offlineIcon() {
    return this.querySelector("svg:nth-of-type(1)");
  }

  /** @returns {SVGElement} */
  get loadingIcon() {
    return this.querySelector("svg:nth-of-type(2)");
  }

  connectedCallback() {
    globalThis.addEventListener("app:player", (ev) => this.#onPlayer(ev));
    globalThis.addEventListener("app:loaded", (ev) => this.#onLoaded(ev));
  }

  #onLoaded(ev) {
    this.loadingIcon.toggleAttribute("hidden", ev.detail);
  }

  /** @param {CustomEvent<AudioEntity>} ev */
  #onPlayer(ev) {
    const entity = ev.detail;
    const hidden = !Object.hasOwn(entity, "type");

    // Main state
    this.toggleAttribute("hidden", hidden);

    // Title and offline
    if (entity.type) {
      this.entityTitle.innerText = entity.titles.at(-1);
      this.offlineIcon.toggleAttribute(
        "hidden",
        !offline.has(entity.ids.at(-1)),
      );
    }

    // Audiobook details
    if (entity.type === "audiobook") {
      this.image.hidden = true;
      this.parentTitle.innerHTML = `
<a href="/${entity.type}s/${entity.ids.at(-3)}/">
  ${entity.titles.at(-3)}
</a>
<a href="/${entity.type}s/${entity.ids.at(-3)}/${entity.ids.at(-2)}/">
  ${entity.titles.at(-2)}
</a>`;
    }

    // Podcast details
    if (entity.type === "podcast") {
      this.image.hidden = false;
      this.image.src = `/api/artwork/${entity.ids.at(-2)}/`;
      this.image.alt = entity.titles.at(-2);
      this.parentTitle.innerHTML = `
<a href="/${entity.type}s/${entity.ids.at(-2)}/">
  ${entity.titles.at(-2)}
</a>`;
    }

    // Active links
    initElements(this);
  }
}

customElements.define("sauropod-breadcrumb", Component);
