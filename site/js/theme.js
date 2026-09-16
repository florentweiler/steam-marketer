// Loaded synchronously in <head> so a saved theme applies before first paint (no flash)
try {
  const theme = localStorage.getItem('theme');
  if (theme) document.documentElement.dataset.theme = theme;
} catch {}
