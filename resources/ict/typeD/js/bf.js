$(function () {
    const $body = $('body');
    const $doc = $(document);
    const $magnifierBtn = $('.magnifier');
    const $magnifierGlass = $('.magnifier-glass');
    const $magnifierContent = $('#magnifierContent');
    const $zoomDisplay = $('.zoomDisplay');
    const $zoomIn = $('.zoom');
    const $zoomOut = $('.zoomOut');
    const $reset = $('.reset');
    const $container = $('.container');
    const $scrollToggle = $('.scrollDown');

    const initFontSize = parseFloat($('html').css('font-size'));
    const cfg = {
        glassSize: 150,
        minZoom: 50,
        maxZoom: 200,
        zoomStep: 10,
        factorStep: 0.5,
        minFactor: 1
    };

    let state = {
        active: false,
        zoom: 100,
        fontSize: initFontSize,
        zoomFactor: 2,
        isScrolledDown: false
    };

    // 🔒 초기 상태 정리
    $magnifierContent.empty().hide();

    const applyZoom = () => {
        $zoomDisplay.text(`화면크기(${state.zoom}%)`);
        $('html').css('font-size', state.fontSize);
        if (state.active) {
            $magnifierContent.css({
                transform: `scale(${state.zoomFactor})`,
                transformOrigin: 'top left',
                width: $body[0].scrollWidth,
                height: $body[0].scrollHeight
            });
        }
    };

    const updateMagnifier = (x, y) => {
        if (!state.active) return;
        const { glassSize } = cfg;
        const relX = x - window.scrollX;
        const relY = y - window.scrollY;

        $magnifierGlass.css({
            left: relX - glassSize / 2,
            top: relY - glassSize / 2,
            display: 'block'
        });

        $magnifierContent.css({
            left: -(relX * state.zoomFactor - glassSize / 0.5),
            top: -(relY * state.zoomFactor - glassSize / 0.5)
        });
    };

    const changeZoom = (dir) => {
        const fontStep = window.innerWidth <= 1080 ? 0.25 : 0.5;
        const minFontSize = initFontSize * (cfg.minZoom / 100);
        const maxFontSize = initFontSize + 2.5;

        if (dir === 'in' && state.zoom < cfg.maxZoom && state.fontSize < maxFontSize) {
            state.zoom += cfg.zoomStep;
            state.fontSize += fontStep;
        } else if (dir === 'out' && state.zoom > cfg.minZoom && state.fontSize > minFontSize) {
            state.zoom -= cfg.zoomStep;
            state.fontSize -= fontStep;
        }

        state.zoomFactor = Math.max(cfg.minFactor, 2 * (state.zoom / 100));
        applyZoom();
    };

    const resetContainer = () => {
        state.isScrolledDown = false;

        $scrollToggle
                .text('화면내리기')
                .css('background-image', 'url(/resources/ict/common/img/wave/scrollDown.png)');

        $container.css({
            transition: 'height 0.6s ease, margin-top 0.6s ease',
            height: '100vh',
            marginTop: '0',
            overflowY: 'hidden'
        });

        setTimeout(() => {
            $container.removeAttr('style');
            $('.content').css({ paddingBottom: '' });
        }, 600);
    };

    const resetZoom = () => {
        state = { active: false, zoom: 100, fontSize: initFontSize, zoomFactor: 2, isScrolledDown: false };
        $magnifierBtn.removeClass('active');
        $magnifierGlass.hide();
        $scrollToggle
                .text('화면내리기')
                .css('background-image', 'url(/resources/ict/common/img/wave/scrollDown.png)')
                .css('display', 'flex');
        $magnifierContent.empty().hide();
        applyZoom();
        resetContainer();
    };

    $magnifierBtn.on('click', () => {
        state.active = !state.active;
        $magnifierBtn.toggleClass('active', state.active);
        $magnifierGlass.toggle(state.active);

        if (state.active) {
            console.log('clone start');
            $magnifierContent.empty().show();
            $body.children().not('.magnifier, .magnifier-glass, #magnifierContent').each(function () {
                const $clone = $(this).clone(true, true);
                $clone.find('.magnifier-glass').remove();
                $magnifierContent.append($clone);
            });

            const centerX = window.innerWidth / 2;
            const centerY = window.innerHeight / 2;
            updateMagnifier(centerX, centerY);
            $scrollToggle.css('display', 'flex');
        } else {
            $magnifierContent.empty().hide();
        }

        applyZoom();
    });

    $doc.on('mousemove touchmove', (e) => {
        const evt = e.type === 'touchmove' ? e.originalEvent.touches[0] : e;
        updateMagnifier(evt.clientX, evt.clientY);
        if (e.type === 'touchmove') e.preventDefault();
    });

    $zoomIn.on('click', () => changeZoom('in'));
    $zoomOut.on('click', () => changeZoom('out'));
    $reset.on('click', resetZoom);

    let isAnimating = false;

    $scrollToggle.on('click', () => {
        if (isAnimating) return;
        isAnimating = true;

        if (state.isScrolledDown) {
            resetContainer();
        } else {
            state.isScrolledDown = true;
            $scrollToggle
                    .text('화면올리기')
                    .css('background-image', 'url(/resources/ict/common/img/wave/scrollUp.png)');
            $container.css({
                transition: 'height 0.6s ease, margin-top 0.6s ease',
                height: 'calc(100vh - 60rem)',
                marginTop: '60rem',
                overflowY: 'scroll'
            });
            $('.content').css({ paddingBottom: '20rem' });
        }

        setTimeout(() => {
            isAnimating = false;
        }, 600);
    });

    $('.navigation a').each(function () {
        const paths = $(this).data('paths').split(',');
        const currentPath = location.pathname;

        if (paths.includes(currentPath)) {
            $(this).addClass('active');
        }

        if (currentPath.includes('/ict/dglib/smart/keyword.do') && $(this).attr('id') === 'chart') {
            $(this).addClass('active');
        }
    });

    applyZoom();
});
