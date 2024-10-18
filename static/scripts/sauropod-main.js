/// <reference lib="dom"/>

import { initElements } from "./sauropod-state.js?v=%DEPLOY_HASH%";

class Component extends HTMLElement {
  connectedCallback() {
    initElements(this);
  }
}

customElements.define("sauropod-main", Component);
