## Quake-style drop-down debug console.
## Intercepts console.log/warn/error and displays them in an in-page overlay.
## Toggle with backtick (`) key or the tab at the top of the screen.

{.push warning[UnusedImport]: off.}
import std/dom, nimponents
{.pop.}

type DebugConsole* = ref object of WebComponent

proc connectedCallback(self: DebugConsole) =
  {.emit: """
  // Build the DOM.
  `self`.innerHTML =
    '<div id="dc-panel">' +
      '<div id="dc-toolbar">' +
        '<button id="dc-clear">Clear</button>' +
        '<span id="dc-count">0 messages</span>' +
      '</div>' +
      '<div id="dc-log"></div>' +
      '<div id="dc-input-row">' +
        '<span id="dc-prompt">&gt;</span>' +
        '<input type="text" id="dc-input" autocomplete="off" spellcheck="false" />' +
      '</div>' +
    '</div>';

  var panel = `self`.querySelector('#dc-panel');
  var logDiv = `self`.querySelector('#dc-log');
  var countSpan = `self`.querySelector('#dc-count');
  var clearBtn = `self`.querySelector('#dc-clear');
  var open = false;
  var msgCount = 0;

  function toggle() {
    open = !open;
    panel.style.display = open ? 'block' : 'none';
  }

  var backtick = String.fromCharCode(96);
  document.addEventListener('keydown', function(e) {
    if (e.key === backtick && !e.ctrlKey && !e.altKey && !e.metaKey) {
      var tag = (e.target.tagName || '').toLowerCase();
      if (tag === 'input' || tag === 'textarea') return;
      e.preventDefault();
      toggle();
    }
  });

  clearBtn.addEventListener('click', function() {
    logDiv.innerHTML = '';
    msgCount = 0;
    countSpan.textContent = '0 messages';
  });

  function addLine(level, args) {
    msgCount++;
    countSpan.textContent = msgCount + ' message' + (msgCount === 1 ? '' : 's');

    var line = document.createElement('div');
    line.className = 'dc-line dc-' + level;

    var ts = new Date().toLocaleTimeString();
    var prefix = '<span class="dc-ts">[' + ts + ']</span> ';
    if (level !== 'log') prefix += '<span class="dc-level">[' + level.toUpperCase() + ']</span> ';

    var text = '';
    for (var i = 0; i < args.length; i++) {
      if (i > 0) text += ' ';
      var a = args[i];
      if (typeof a === 'object') {
        try { text += JSON.stringify(a, null, 1); }
        catch(e) { text += String(a); }
      } else {
        text += String(a);
      }
    }

    line.innerHTML = prefix + '<span class="dc-msg">' + text.replace(/</g, '&lt;').replace(/>/g, '&gt;') + '</span>';
    logDiv.appendChild(line);
    logDiv.scrollTop = logDiv.scrollHeight;

  }

  // Use original console refs from early buffer, or grab current ones.
  var orig = window._dcOrigConsole || {log: console.log, warn: console.warn, error: console.error, info: console.info};

  // Replay buffered messages from before debug console existed.
  if (window._dcBuffer) {
    for (var bi = 0; bi < window._dcBuffer.length; bi++) {
      var buf = window._dcBuffer[bi];
      addLine(buf.level, buf.args);
    }
    window._dcBuffer = null;
  }

  // Intercept console methods going forward.
  console.log = function() { orig.log.apply(console, arguments); addLine('log', arguments); };
  console.warn = function() { orig.warn.apply(console, arguments); addLine('warn', arguments); };
  console.error = function() { orig.error.apply(console, arguments); addLine('error', arguments); };
  console.info = function() { orig.info.apply(console, arguments); addLine('info', arguments); };

  // JS eval input.
  var dcInput = `self`.querySelector('#dc-input');
  var cmdHistory = [];
  var histIdx = -1;

  dcInput.addEventListener('keydown', function(e) {
    // Stop backtick from closing console while typing.
    e.stopPropagation();
    if (e.key === 'Enter') {
      var cmd = dcInput.value.trim();
      if (!cmd) return;
      cmdHistory.unshift(cmd);
      histIdx = -1;
      addLine('info', ['> ' + cmd]);
      try {
        var result = eval(cmd);
        if (result !== undefined) addLine('log', [result]);
      } catch(err) {
        addLine('error', [err.message || String(err)]);
      }
      dcInput.value = '';
    } else if (e.key === 'ArrowUp') {
      if (histIdx < cmdHistory.length - 1) {
        histIdx++;
        dcInput.value = cmdHistory[histIdx];
      }
      e.preventDefault();
    } else if (e.key === 'ArrowDown') {
      if (histIdx > 0) {
        histIdx--;
        dcInput.value = cmdHistory[histIdx];
      } else {
        histIdx = -1;
        dcInput.value = '';
      }
      e.preventDefault();
    }
  });

  // Catch unhandled errors too.
  window.addEventListener('error', function(e) {
    addLine('error', ['Uncaught: ' + e.message + ' at ' + e.filename + ':' + e.lineno]);
  });
  window.addEventListener('unhandledrejection', function(e) {
    addLine('error', ['Unhandled rejection: ' + (e.reason && e.reason.message || e.reason || 'unknown')]);
  });
  """.}

setupNimponent[DebugConsole]("debug-console", nil, connectedCallback)
