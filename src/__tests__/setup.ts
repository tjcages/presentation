/**
 * jsdom ships `window.scrollTo` as a stub that throws "Not implemented",
 * which the scroll-memory hook trips on every render. Stubbing it keeps the
 * output readable; the hook's behaviour is asserted through the positions it
 * records, not through jsdom's scrolling.
 */
window.scrollTo = () => undefined;
