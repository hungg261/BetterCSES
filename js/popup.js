const inputEl = document.getElementById('problemInput');
const btnEl = document.getElementById('searchBtn');

const handleSearch = () => {
  const name = inputEl.value.trim();
  if (!name) return;

  if (name.startsWith('http://') || name.startsWith('https://')) {
    window.open(name, '_blank');
    return;
  }

  if (/^\d+$/.test(name)) {
    window.open(`https://cses.fi/problemset/task/${name}`, '_blank');
    return;
  }

  const searchUrl = `https://google.com/search?q=${encodeURIComponent('"cses.fi/problemset"' + name)}&btnI=1`;
  window.open(searchUrl, '_blank');
};

btnEl.addEventListener('click', handleSearch);
inputEl.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') handleSearch();
});
