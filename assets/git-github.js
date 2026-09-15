// Color output only; shared copyText retains the original, unstyled text.
document.querySelectorAll('.git-guide details .code pre code').forEach(code => {
  code.closest('.code').classList.add('git-output');
  let staged = false;
  const paint = (row, text, color) => {
    const span = document.createElement('span');
    span.className = `git-${color}`;
    span.textContent = text;
    row.append(span);
  };
  code.querySelectorAll('.code-line').forEach(row => {
    const text = row.textContent;
    row.textContent = '';
    if (text === 'Changes to be committed:') staged = true;
    if (/^(Changes not staged for commit:|Untracked files:)/.test(text)) staged = false;
    const log = text.match(/^(commit [a-f0-9]+)( \()(HEAD)( -> )(.*)(\))$/);
    if (log) {
      paint(row, log[1] + log[2], 'yellow');
      paint(row, log[3], 'cyan');
      paint(row, log[4], 'yellow');
      paint(row, log[5], 'green');
      paint(row, log[6], 'yellow');
    } else if (/^commit [a-f0-9]+/.test(text)) paint(row, text, 'yellow');
    else if (/^[a-f0-9]{7,40} /.test(text)) {
      const short = text.match(/^([a-f0-9]+)( \(HEAD -> main\))?(.*)$/);
      paint(row, short[1], 'yellow');
      if (short[2]) {
        paint(row, ' (', 'yellow');
        paint(row, 'HEAD', 'cyan');
        paint(row, ' -> ', 'yellow');
        paint(row, 'main', 'green');
        paint(row, ')', 'yellow');
      }
      row.append(document.createTextNode(short[3]));
    }
    else if (/^\s+both modified:/.test(text)) paint(row, text, 'red');
    else if (/^\s+(new file:|modified:|deleted:|renamed:)/.test(text)) paint(row, text, staged ? 'green' : 'red');
    else if (/^[ MADRCU?!]{2} /.test(text) && /[MADRCU?!]/.test(text.slice(0, 2))) {
      paint(row, text[0], 'green');
      paint(row, text[1], 'red');
      row.append(document.createTextNode(text.slice(2)));
    } else if (/^@@/.test(text)) paint(row, text, 'cyan');
    else if (/^\+(?!\+\+)/.test(text)) paint(row, text, 'green');
    else if (/^-(?!--)/.test(text)) paint(row, text, 'red');
    else row.textContent = text;
  });
});

document.querySelectorAll('.git-guide [role="tablist"]').forEach(list => {
  const tabs = Array.from(list.querySelectorAll('[role="tab"]'));
  const sync = () => tabs.forEach(tab => tab.tabIndex = tab.getAttribute('aria-selected') === 'true' ? 0 : -1);
  sync();
  tabs.forEach((tab, index) => {
    tab.addEventListener('click', sync);
    tab.addEventListener('keydown', event => {
      let next;
      if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
      if (event.key === 'ArrowLeft') next = (index + tabs.length - 1) % tabs.length;
      if (event.key === 'Home') next = 0;
      if (event.key === 'End') next = tabs.length - 1;
      if (next === undefined) return;
      event.preventDefault(); tabs[next].click(); tabs[next].focus();
    });
  });
});
