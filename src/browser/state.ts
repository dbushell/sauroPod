/**
 * Client-side script for dynamic navigation and history.
 * Custom implementation inspired by HTMX.
 * @module
 * @see {@link https://htmx.org}
 */
/// <reference lib="DOM"/>
export type Deferred<T> = ReturnType<typeof Promise.withResolvers<T>>;

export type State = {
  back: string;
  href: string;
};

// Track initialized elements
const initMap = new WeakMap<HTMLElement, boolean>();

// Track fetch requests by URL
const fetchMap = new Map<string, Deferred<boolean>>();

// Cache fetch responses
const responseCache = new Map<string, Response>();

/** Fetch and cache the URL response */
const preFetch = async (url: URL): Promise<boolean> => {
  if (fetchMap.has(url.href)) {
    return fetchMap.get(url.href)!.promise;
  }
  const deferred = Promise.withResolvers<boolean>();
  fetchMap.set(url.href, deferred);
  const headers = new Headers();
  headers.set('x-fragment', 'true');
  const response = responseCache.get(url.href);
  if (response?.headers.get('last-modified')) {
    headers.set('if-modified-since', response.headers.get('last-modified')!);
  }
  await fetch(url.href, {headers})
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

/** Return the cached URL response */
const getResponse = async (url: URL): Promise<Response> => {
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

const gotoURL = async (url: URL, pushState = true) => {
  const main = document.querySelector('main');
  if (!main) return;
  // Avoid duplicate history entries
  if (pushState && url.href !== globalThis.location.href) {
    const state: State = {
      back: globalThis.location.href,
      href: url.href
    };
    history.pushState(state, '', url.href);
  }
  // Fetch new HTML into fragment
  const response = await getResponse(url);
  const fragment = document.createElement('div');
  fragment.innerHTML = await response.text();
  // Replace document <title> removing it from fragment
  const oldTitle = document.querySelector('title');
  const newTitle = fragment.querySelector('title');
  if (oldTitle && newTitle) {
    oldTitle.replaceWith(newTitle);
  }
  // Replace <main> and activate new elements
  main.innerHTML = '';
  main.appendChild(fragment);
  initElements(main);
  globalThis.dispatchEvent(new CustomEvent('app:navigated'));
};

/** Handle `popstate` event */
const onPopState = (ev: PopStateEvent): boolean => {
  const state = ev.state as State;
  if (state === null) return false;
  const url = new URL(state.href);
  preFetch(url).then(() => {
    gotoURL(new URL(state.href), false);
  });
  return true;
};

/** Active a `GET` element */
const initGet = (el: HTMLElement) => {
  // Already initialized
  if (initMap.get(el)) {
    return;
  }
  initMap.set(el, true);
  // Validate element for accessiblity
  const tagName = el.tagName.toLowerCase();
  if (!['a', 'button'].includes(tagName)) {
    console.warn(`"${tagName}" is not <a> or <button> element.`);
    return;
  }
  // Cancel default link navigation
  el.addEventListener('click', (ev) => {
    ev.preventDefault();
  });
  // Prefetch URL and queue navigation
  el.addEventListener('pointerdown', (ev: PointerEvent) => {
    // Ignore right-click
    if (ev.button) return;
    const target = (ev.target as HTMLElement).closest('[data-get]')! as HTMLElement;
    document.documentElement.classList.add('navigating');
    const href = target.dataset.get || target.getAttribute('href');
    const url = new URL(href ?? '', globalThis.location.origin);
    globalThis.localStorage.setItem('goto', url.href);
    preFetch(url);
  });
  // Cancel queued navigation
  el.addEventListener('pointercancel', (ev: PointerEvent) => {
    if (ev.button) return;
    document.documentElement.classList.remove('navigating');
    globalThis.localStorage.removeItem('goto');
  });
  // Navigate to queued URL
  el.addEventListener('pointerup', (ev: PointerEvent) => {
    if (ev.button) return;
    const url = globalThis.localStorage.getItem('goto');
    if (!url) return;
    globalThis.localStorage.removeItem('goto');
    gotoURL(new URL(url)).then(() => {
      document.documentElement.classList.remove('navigating');
    });
  });
};

/** Activate a `DELETE` element */
const initDelete = (el: HTMLElement) => {
  el.addEventListener('click', async (ev: MouseEvent) => {
    ev.preventDefault();
    let target = ev.target as HTMLElement;
    target = target.closest('[data-delete]')!;
    target.setAttribute('disabled', 'disabled');
    const confirm = target.dataset.confirm;
    if (confirm && !globalThis.confirm(confirm)) {
      target.removeAttribute('disabled');
      return;
    }
    const url = new URL(target.getAttribute('data-delete') ?? '', globalThis.location.origin);
    const response = await fetch(url.href, {method: 'DELETE'});
    target.removeAttribute('disabled');
    if (!response.ok) {
      alert('Delete action failed');
      return;
    }
    if (target.dataset.action === 'delete') {
      document.querySelectorAll(target.dataset.selector ?? '').forEach((el) => {
        el.remove();
      });
    }
  });
};

/** Activate all elements within the parent */
export const initElements = (parent: HTMLElement) => {
  Array.from(parent.querySelectorAll('[data-get]')).forEach((el) => {
    initGet(el as HTMLElement);
  });
  Array.from(parent.querySelectorAll('[data-delete]')).forEach((el) => {
    initDelete(el as HTMLElement);
  });
};

export const initLoad = () => {
  // Set initial state
  const state: State = {
    back: globalThis.location.href,
    href: globalThis.location.href
  };
  history.replaceState(state, '', globalThis.location.href);

  // Listen for navigation state changes
  globalThis.addEventListener('popstate', onPopState);

  globalThis.addEventListener('app:navigated', () => {
    // Scroll to top of page
    document.documentElement.scrollIntoView({
      behavior: 'smooth',
      block: 'start'
    });
  });

  // Initialize entire document when ready
  initElements(document.body);
};
