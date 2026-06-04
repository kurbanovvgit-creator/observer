(function () {
    const el = document.getElementById('typewriter-text');
    if (!el) return;

    const full = (el.dataset.text || 'Synçy').trim();
    const TYPE_DELAY = 175;
    const PAUSE_FULL = 2600;
    const PAUSE_EMPTY = 850;
    const CHAR_FADE_MS = 400;

    let visible = 0;
    let deleting = false;
    let paused = false;

    function addChar() {
        const span = document.createElement('span');
        span.className = 'tw-char tw-char--enter';
        span.textContent = full[visible];
        el.appendChild(span);

        requestAnimationFrame(function () {
            requestAnimationFrame(function () {
                span.classList.remove('tw-char--enter');
            });
        });

        visible += 1;
    }

    function removeChar(done) {
        const last = el.lastElementChild;
        if (!last) {
            done();
            return;
        }

        last.classList.add('tw-char--exit');
        window.setTimeout(function () {
            last.remove();
            visible -= 1;
            done();
        }, CHAR_FADE_MS);
    }

    function step() {
        if (paused) return;

        if (!deleting) {
            if (visible < full.length) {
                addChar();
                window.setTimeout(step, TYPE_DELAY);
                return;
            }

            paused = true;
            window.setTimeout(function () {
                paused = false;
                deleting = true;
                step();
            }, PAUSE_FULL);
            return;
        }

        if (visible > 0) {
            removeChar(function () {
                window.setTimeout(step, 60);
            });
            return;
        }

        deleting = false;
        paused = true;
        window.setTimeout(function () {
            paused = false;
            step();
        }, PAUSE_EMPTY);
    }

    step();
})();
