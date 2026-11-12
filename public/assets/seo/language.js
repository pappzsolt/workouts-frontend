(() => {
  'use strict';

  // Use the same catalogs and saved preference as the Angular application.
  const languages = ['hu', 'en', 'de'];
  const selector = document.querySelector('#landing-language');
  const error = document.querySelector('#landing-language-error');
  const catalogs = new Map();
  const bindings = [
    ...Array.from(document.querySelectorAll('[data-i18n]'), node => ({
      node, key: node.dataset.i18n,
    })),
    ...Array.from(document.querySelectorAll('[data-i18n-aria-label]'), node => ({
      node, key: node.dataset.i18nAriaLabel, attribute: 'aria-label',
    })),
  ];
  let currentLanguage = 'hu';
  let requestVersion = 0;

  function loadCatalog(language) {
    if (!catalogs.has(language)) {
      const request = fetch(`/assets/i18n/${language}.json`)
        .then(response => {
          if (!response.ok) throw new Error('Translation catalog unavailable');
          return response.json();
        })
        .catch(reason => {
          catalogs.delete(language);
          throw reason;
        });
      catalogs.set(language, request);
    }
    return catalogs.get(language);
  }

  async function apply(language) {
    if (!languages.includes(language)) language = 'hu';
    const version = ++requestVersion;
    error.hidden = true;
    try {
      const catalog = await loadCatalog(language);
      // Validate before updating so a failed load never leaves mixed languages.
      const values = bindings.map(({ key }) => {
        const value = key.split('.').reduce((entry, part) => entry?.[part], catalog);
        if (typeof value !== 'string' || !value.trim()) throw new Error(`Missing translation: ${key}`);
        return value;
      });
      if (version !== requestVersion) return;
      bindings.forEach(({ node, attribute }, index) => {
        if (attribute) node.setAttribute(attribute, values[index]);
        else node.textContent = values[index];
      });
      currentLanguage = language;
      selector.value = language;
      document.documentElement.lang = language;
      try { localStorage.setItem('language', language); } catch { /* Selection works without storage. */ }
    } catch {
      if (version !== requestVersion) return;
      selector.value = currentLanguage;
      error.hidden = false;
    }
  }

  selector.addEventListener('change', () => apply(selector.value));
  let saved = 'hu';
  try { saved = localStorage.getItem('language'); } catch { /* Keep the Hungarian HTML fallback. */ }
  apply(saved);
})();
