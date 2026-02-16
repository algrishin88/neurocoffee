document.addEventListener('DOMContentLoaded', () => {
  const sidebarToggle = document.getElementById('sidebarToggle');
  const sidebar = document.querySelector('.sidebar');
  if (!sidebarToggle || !sidebar) return;

  sidebarToggle.addEventListener('click', () => {
    sidebar.classList.toggle('open');
    sidebarToggle.innerText = sidebar.classList.contains('open') ? '✖' : '☰';
  });
});
