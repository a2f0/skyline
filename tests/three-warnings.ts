// Three.js prefixes everything it logs with "THREE.". A warning that an API is deprecated or
// removed is what an engine upgrade starts printing on every host's console, as r186 did for
// PCFSoftShadowMap; the browser suites refuse one.
export const isThreeDeprecation = (text: string): boolean => text.startsWith("THREE.") && /deprecat|removed/i.test(text);
