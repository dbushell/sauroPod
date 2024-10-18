/**
 * Client-side script for dynamic navigation and history.
 * Custom implementation inspired by HTMX.
 * @module
 * @see {@link https://htmx.org}
 */
/**
 * @template T
 * @typedef {import('@src/types.ts').Deferred<T>} Deferred<T>
 * @typedef {{back: string; href: string;}} State
 */
/// <reference lib="dom"/>

import { viewTransition } from "./sauropod-utils.js?v=%DEPLOY_HASH%";

// Track initialized elements
/** @type {WeakMap<HTMLElement, boolean>} */
const initMap = new WeakMap();

// Track fetch requests by URL
/** @type {Map<string, Deferred<boolean>>} */
const fetchMap = new Map();

// Cache fetch responses
/** @type {Map<string, Response>} */
const responseCache = new Map();

/**
 * Fetch and cache the URL response
 * @param {URL} url
 * @returns {Promise<boolean>}
 */
const preFetch = async (url) => {
  if (fetchMap.has(url.href)) {
    return fetchMap.get(url.href).promise;
  }
  /** @type {Deferred<boolean>} */
  const deferred = Promise.withResolvers();
  fetchMap.set(url.href, deferred);
  const headers = new Headers();
  headers.set("x-fragment", "true");
  const response = responseCache.get(url.href);
  if (response?.headers.get("last-modified")) {
    headers.set("if-modified-since", response.headers.get("last-modified"));
  }
  await fetch(url.href, { headers })
    .then((response) => {
      if (response.status === 304) {
        deferred.resolve(true);
        return;
      }
      /** @todo Handle error */
      if (!response.ok || !response.body) {
        throw new Error();
      }
      responseCache.set(url.href, response);
      deferred.resolve(true);
    })
    .catch((err) => {
      console.error(err);
      deferred.resolve(false);
    })
    .finally(() => {
      fetchMap.delete(url.href);
    });
  return deferred.promise;
};

/**
 * Return the cached URL response
 * @param {URL} url
 * @returns {Promise<Response>}
 */
const getResponse = async (url) => {
  if (!responseCache.has(url.href)) {
    preFetch(url);
  }
  await fetchMap.get(url.href)?.promise;
  const response = responseCache.get(url.href);
  if (!response) {
    throw new Error();
  }
  return response.clone();
};

/**
 * Navigate to URL
 * @param {URL} url
 * @param {boolean} pushState
 */
const gotoURL = async (url, pushState = true) => {
  const main = document.querySelector("sauropod-main");
  if (!main) return;
  // Avoid duplicate history entries
  if (pushState && url.href !== globalThis.location.href) {
    /** @type {State} */
    const state = {
      back: globalThis.location.href,
      href: url.href,
    };
    history.pushState(state, "", url.href);
  }
  // Fetch new HTML into fragment
  const response = await getResponse(url);
  const newMain = document.createElement("sauropod-main");
  newMain.className = main.className;
  newMain.innerHTML = await response.text();
  // Replace document <title> removing it from fragment
  const oldTitle = document.querySelector("title");
  const newTitle = newMain.querySelector("title");
  if (oldTitle && newTitle) {
    oldTitle.replaceWith(newTitle);
  }
  viewTransition(() => {
    main.replaceWith(newMain);
  });
  globalThis.dispatchEvent(new CustomEvent("app:navigated"));
};

/**
 * Handle `popstate` event
 * @param {PopStateEvent} ev
 * @returns {boolean}
 */
const onPopState = (ev) => {
  /** @type {State} */
  const state = ev.state;
  if (state === null) return false;
  const url = new URL(state.href);
  preFetch(url).then(() => {
    gotoURL(new URL(state.href), false);
  });
  return true;
};

/**
 * Active a `GET` element
 * @param {HTMLElement} el
 */
const initGet = (el) => {
  // Already initialized
  if (initMap.get(el)) {
    return;
  }
  initMap.set(el, true);
  // Validate element for accessiblity
  const tagName = el.tagName.toLowerCase();
  if (!["a", "button"].includes(tagName)) {
    console.warn(`"${tagName}" is not <a> or <button> element.`);
    return;
  }
  const playable = el.getAttribute("href")?.startsWith("/episodes/");

  // Cancel default link navigation
  el.addEventListener("click", (ev) => {
    ev.preventDefault();
  });
  // Prefetch URL and queue navigation
  el.addEventListener("pointerdown", (ev) => {
    if (playable) return;
    // Ignore right-click
    if (ev.button) return;
    const target = ev.target.closest(
      '[href^="/"]',
    );
    document.documentElement.classList.add("navigating");
    const href = target.dataset.get || target.getAttribute("href");
    const url = new URL(href ?? "", globalThis.location.origin);
    globalThis.localStorage.setItem("goto", url.href);
    preFetch(url);
  });
  // Cancel queued navigation
  el.addEventListener("pointercancel", (ev) => {
    if (playable) return;
    if (ev.button) return;
    document.documentElement.classList.remove("navigating");
    globalThis.localStorage.removeItem("goto");
  });
  // Navigate to queued URL
  el.addEventListener("pointerup", (ev) => {
    if (playable) return;
    if (ev.button) return;
    const url = globalThis.localStorage.getItem("goto");
    if (!url) return;
    globalThis.localStorage.removeItem("goto");
    gotoURL(new URL(url)).then(() => {
      document.documentElement.classList.remove("navigating");
    });
  });
};

/**
 * Activate all elements within the parent
 * @param {HTMLElement} parent
 */
export const initElements = (parent) => {
  Array.from(parent.querySelectorAll('[href^="/"]')).forEach((el) => {
    initGet(el);
  });
};

export const initLoad = () => {
  // Set initial state
  /** @type {State} */
  const state = {
    back: globalThis.location.href,
    href: globalThis.location.href,
  };
  history.replaceState(state, "", globalThis.location.href);

  // Listen for navigation state changes
  globalThis.addEventListener("popstate", onPopState);

  globalThis.addEventListener("app:navigated", () => {
    // Scroll to top of page
    document.documentElement.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  });

  // Initialize entire document when ready
  initElements(document.body);
};
