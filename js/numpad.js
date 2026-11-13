/* The on-screen NUMBER PAD and the DIGIT BOX, shared by every game that has them: the House of Algebra's booths and the Science Lab's Atom Builder (js/booth-game.js) and the clock game
   (js/clock-game.js). One place, so they look and behave the same everywhere.

     NumPad.build(padEl, prefix, signed)   fill padEl with the keys. Without negatives it is a phone's keypad, 7 8 9 / 4 5 6 / 1 2 3 / backspace 0 Check. With negatives (signed) a fourth column
                                           holds backspace, plus-or-minus and 0 and Check is a wide key underneath, so the pad is no taller. Every key is a button with data-key; backspace, plus-or-minus
                                           and Check also get the ids `${prefix}-back`, `-sign` and `-check`. Pressing a key does not take focus from the box you are typing in.
     NumPad.tap(box, key, signedNow)       what a tapped key does to a box: a digit (three at most, after any minus sign), backspace, or plus-or-minus (only when signedNow)
     NumPad.box({ label, signedNow, onFocus, onInput, onEnter })   a digit box: a real input that does not summon a phone's keyboard (the pad is the input) but that a physical keyboard types
                                           into: digits only, and a leading minus sign when signedNow() says negatives are allowed */
const NumPad = (() => {
  const SPECIAL = { back: ['\u232b', 'Backspace'], sign: ['\u00b1', 'Plus or minus'], check: ['Check', 'Check my answer'] };
  const order = signed => (signed ? ['7', '8', '9', 'back', '4', '5', '6', 'sign', '1', '2', '3', '0', 'check'] : ['7', '8', '9', '4', '5', '6', '1', '2', '3', 'back', '0', 'check']);
  function build(padEl, prefix, signed) {
    if (signed) padEl.classList.add('eqn-pad4');
    order(signed).forEach(k => {
      const [label, name] = SPECIAL[k] || [k, k], b = document.createElement('button');
      b.className = 'btn eqn-key'; b.textContent = label; b.type = 'button'; b.dataset.key = k; b.setAttribute('aria-label', name);
      if (SPECIAL[k]) b.id = `${prefix}-${k}`; if (k === 'check') b.classList.add('primary', 'eqn-keycheck');
      padEl.appendChild(b);
    });
    padEl.addEventListener('mousedown', e => e.preventDefault());
    return padEl;
  }
  function tap(box, key, signedNow) {
    const neg = box.value.startsWith('-'), digits = box.value.replace('-', '');
    if (key === 'back') box.value = box.value.slice(0, -1);
    else if (key === 'sign') { if (signedNow) box.value = (neg ? '' : '-') + digits; }
    else if (digits.length < 3) box.value += key;
  }
  function box({ label, signedNow = () => false, onFocus, onInput, onEnter } = {}) {
    const b = document.createElement('input'); b.className = 'eqn-box'; b.type = 'text'; b.inputMode = 'none'; b.autocomplete = 'off'; b.maxLength = 4; b.setAttribute('aria-label', label || 'A number');
    b.addEventListener('input', () => { const neg = signedNow() && b.value.trim().startsWith('-'); b.value = (neg ? '-' : '') + b.value.replace(/[^0-9]/g, '').slice(0, 3); if (onInput) onInput(b); });
    if (onFocus) b.addEventListener('focus', () => onFocus(b));
    b.addEventListener('keydown', e => { if (e.key !== 'Enter') return; e.preventDefault(); e.stopPropagation(); if (onEnter) onEnter(b); });
    return b;
  }
  return { SPECIAL, order, build, tap, box };
})();
