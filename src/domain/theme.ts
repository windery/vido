// 处理用户系统主题的变化
export function initializeTheme() {
  // 判断用户系统是否处于深色模式
  const isSystemDark = window.matchMedia(
    '(prefers-color-scheme: dark)'
  ).matches;
  const theme = isSystemDark ? 'dark' : 'light';
  console.log(`current system theme is ${theme}`);
  if (isSystemDark) {
    console.log('vido theme is set to dark');
    document.documentElement.classList.add('dark');
  }
  // 添加一个监听器，实时监听用户系统主题的变化
  window
    .matchMedia('(prefers-color-scheme: dark)')
    .addEventListener('change', (event) => {
      if (event.matches) {
        console.log('vido theme is set to dark');
        document.documentElement.classList.add('dark');
      } else {
        console.log('vido theme is set to light');
        document.documentElement.classList.remove('dark');
      }
    });
}
