

const keyPadController = (function () {
    let $; // 전달받은 jQuery 객체를 저장

    const KEYS = {
        TAB: 'Tab',
        LEFT: 'ArrowUp',
        RIGHT: 'ArrowDown',
        ENTER: 'Enter',
        UP: 'ArrowRight', // ArrowUp
        DOWN: 'ArrowLeft', // ArrowDown
        F17: 'F17', // 홈
        F15: 'F15', // 이어폰 IN
        F16: 'F16', // 이어폰 OUT
    };
    const state = {
        isModalActive: false, // 모달 활성화 여부
        $currentModal: null, // 현재 활성화된 모달
        focusElems: [], // 포커스 가능한 요소들
        focusIdx: -1, // 현재 포커스된 요소 인덱스
        $prevFocus: null, // 이전 포커스된 요소
        overlaySelector: '#overlay, .overlay', // 기본 overlay 선택자

        homeKeyTimer: null, // 홈 키 타이머
        homeKeyCount: 0, // 홈 키 연속 입력 횟수
        volume: 50, // 기본 볼륨 (0~100 사이 값)
        volumeStep: 5, // 볼륨 조정 단계
        socket: null, // 소켓 인스턴스
        latestRequestId: null, // 최신 TTS 요청 ID
        isHeadphoneConnected: false, // 이어폰 연결 상태

        debugMode: false, // 디버그 모드 설정
    };

    const methods = {
        /**
         * 디버그 모드에서만 로그 출력.
         * @param {string} message - 출력할 메시지
         * @param {*} data - 추가 데이터 (선택)
         */
        log: (message, data = '') => {
            if (state.debugMode) {
                console.log(`[keyPadController] ${message}`, data);
            }
        },

        /**
         * 오디오 중지 및 초기화
         */
        stopAndResetAudio: () => {
            if (typeof audio !== 'undefined' && audio instanceof Audio) {
                try {
                    audio.pause(); // 오디오 재생 멈춤
                    audio.currentTime = 0; // 오디오 위치 초기화
                    audio.src = ''; // 버퍼 초기화
                    methods.log('오디오 중지 및 버퍼 초기화 완료');
                } catch (error) {
                    methods.log('오디오 처리 중 오류 발생', error);
                }
            } else {
                methods.log('오디오 객체가 정의되지 않음');
            }
        },

        /**
         * 이어폰 상태 확인 및 동기화.
         * 세션 값 기준으로 상태 업데이트 후 반환.
         * @returns {boolean} 이어폰 연결 여부
         */
        isHeadphoneConnected: () => {
            const isTestMode = sessionStorage.getItem('test_mode') === 'true';

            if (isTestMode) {
                state.isHeadphoneConnected = true;
                methods.log('테스트 모드에서 이어폰 연결 상태 강제 활성화');
            } else {
                const sessionValue = sessionStorage.getItem('g_earphone');
                state.isHeadphoneConnected = sessionValue === 'Y'; // 실제 환경에서 동기화
            }

            return state.isHeadphoneConnected;
        },

        /**
         * TTS로 텍스트를 읽음.
         * @param {string} text - TTS로 출력할 텍스트
         * @param {number} speed - 음성 속도
         * @param {number} pitch - 음성 톤
         * @param {string} lang - 언어 (기본값: 한국어)
         */
        speak: (text, speed = 0, pitch = 0, lang = 'ko-KR') => {
            if (!text) return;

            window.speechSynthesis.cancel();
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = lang;
            utterance.rate = speed;
            utterance.pitch = pitch;

            window.speechSynthesis.speak(utterance);
            methods.log('TTS 실행', text);
        },

        /**
         * Overlay를 숨김 처리.
         */
        hideOverlay: () => {
            const $overlay = $(state.overlaySelector);
            if ($overlay.length) {
                $overlay.hide();
                methods.log('Overlay 숨김 처리 완료', $overlay);
            } else {
                methods.log('Overlay를 찾을 수 없음');
            }
        },

        /**
         * 포커스 가능한 요소를 초기화.
         * 모달 활성화 여부에 따라 검색 범위를 다르게 설정.
         * @param {jQuery} $container - 검색 범위의 컨테이너 요소
         */
        resetFocusElems: ($container) => {
            const $allModals = methods.detectAllModals();

            // 활성화된 모달 내에서만 검색
            if (state.isModalActive) {
                const arr = state.$currentModal.find('[tabindex]').toArray();
                const posSorted = arr.filter(el => el.tabIndex >= 0)
                    .sort((a, b) => a.tabIndex - b.tabIndex); // 0 이상만 정렬
                let p = 0;
                const result = arr.map(el => (el.tabIndex >= 0 ? posSorted[p++] : el));
                state.focusElems = $(result);
            } else {
                // 페이지 전체에서 모든 모달 요소 제외
                state.focusElems = $container
                    .find('[tabindex]:not([tabindex="-1"])')
                    .not($allModals.find('[tabindex]'))
                    .sort((a, b) => $(a).attr('tabindex') - $(b).attr('tabindex'));
            }

            methods.log(
                state.isModalActive
                    ? '모달 포커스 요소 초기화'
                    : '페이지 포커스 요소 초기화',
                state.focusElems
            );
        },

        /**
         * 특정 인덱스로 포커스를 이동하고, TTS로 내용을 읽음.
         * @param {number} idx - 이동할 포커스 인덱스
         */
        setFocus: (idx, readTTS = true) => {
            if (!state.isHeadphoneConnected) {
                $(':root').css('--focus-outline', 'none');
                methods.log('이어폰 연결 상태 아님');
                return;
            }
            $(':root').css('--focus-outline', '3px solid red');
            if (idx < 0 || idx >= state.focusElems.length) return;

            // 기존 포커스 제거
            $('.focused').removeClass('focused').blur();
            state.focusIdx = idx;

            // 새 포커스 설정
            const $elem = state.focusElems.eq(idx);
            $elem.addClass('focused').focus();
            // readTTS가 true일 경우에만 TTS 실행
            if (readTTS) {
                const g_earphone = sessionStorage.getItem("g_earphone");
                if (g_earphone === 'Y' && 'speechSynthesis' in window) {
                    let altText = $elem.attr("aria-label");
                    let ttsText = $elem.text();
                    if ($elem.hasClass("container")) {
                        return;
                    }
                    methods.speakFrom(altText ? altText : ttsText);
                } else {
                    console.warn("이 브라우저는 TTS를 지원하지 않습니다.");
                }
            } else {
                methods.log('TTS 실행 생략 (readTTS=false)');
            }
        },
        setFocusById: (id, readTTS = true) => {
            if (!state.isHeadphoneConnected) {
                methods.log('이어폰 연결 상태 아님');
                return;
            }

            const $elem = $('#' + id);
            if ($elem.length === 0) {
                console.warn('요소를 찾을 수 없습니다: ' + id);
                return;
            }

            // 기존 포커스 제거
            $('.focused').removeClass('focused').blur();

            // 포커스 및 상태 업데이트
            $elem.addClass('focused').focus();
            state.focusIdx = state.focusElems.index($elem); // 일관성을 위해 인덱스도 갱신

            // TTS 실행
            if (readTTS) {
                const g_earphone = sessionStorage.getItem("g_earphone");
                if (g_earphone === 'Y' && 'speechSynthesis' in window) {
                    let altText = $elem.attr("aria-label");
                    let ttsText = $elem.text();
                    if ($elem.hasClass("container")) return;
                    methods.speakFrom(altText ? altText : ttsText);
                } else {
                    console.warn("이 브라우저는 TTS를 지원하지 않습니다.");
                }
            } else {
                methods.log('TTS 실행 생략 (readTTS=false)');
            }
        },

        // 핵심: 주어진 텍스트를 lastCharIndex부터 읽기
        speakFrom: (text, startIndex = 0) => {
            if (!('speechSynthesis' in window)) return;
            if (!state.isHeadphoneConnected) {
                methods.log('이어폰 연결 상태 아님');
                return;
            }

            // 이전 발화 정리
            window.speechSynthesis.cancel();
            if (!text) return;

            let currentText = text;
            let lastCharIndex = startIndex;
            sessionStorage.setItem("currentText", currentText);
            sessionStorage.setItem("lastCharIndex", lastCharIndex);

            const utter = new SpeechSynthesisUtterance(currentText.slice(lastCharIndex));
            let currentUtterance = utter;
            sessionStorage.setItem("currentUtterance", currentUtterance);

            utter.lang = "ko-KR";
            utter.rate = 1.0;
            utter.pitch = 1.0;
            utter.volume = Number.parseFloat(state.volume / 100);

            // 경계 이벤트로 현재 위치 추적 (브라우저가 지원하는 경우)
            utter.onboundary = (e) => {
                if (e.name === 'word' || e.name === 'sentence' || e.charIndex != null) {
                    // 전체 텍스트 기준 인덱스로 환산
                    lastCharIndex = startIndex + (e.charIndex || 0);
                    sessionStorage.setItem("lastCharIndex", lastCharIndex);
                }
            };

            utter.onend = () => {
                currentUtterance = null;
                sessionStorage.setItem("currentUtterance", currentUtterance);
                lastCharIndex = 0;
                sessionStorage.setItem("lastCharIndex", lastCharIndex);
            };

            window.speechSynthesis.speak(utter);
        },

        /**
         * 모든 모달을 탐지하여 반환.
         * 활성화 여부와 관계없이 모든 모달 요소를 찾음.
         * @returns {jQuery} - 모든 모달 요소
         */
        detectAllModals: () => $('[role="dialog"], .modal'),

        /**
         * 활성화된 모달을 탐지하여 반환.
         * aria-hidden="false" 또는 visible 상태의 모달을 검색.
         * @returns {jQuery|null} - 활성화된 모달 또는 null
         */
        detectActiveModal: () => {
            const $activeModal = $(
                '[role="dialog"][aria-hidden="false"], .modal:visible'
            ).first();
            if ($activeModal.length) {
                state.isModalActive = true;
                state.$currentModal = $activeModal;
                methods.log('활성화된 모달 탐지', $activeModal);
                return $activeModal;
            }
            state.isModalActive = false;
            state.$currentModal = null;
            return null;
        },

        /**
         * 모달 활성화및 포커스를 초기화.
         * @param {jQuery} $modal - 활성화할 모달 요소
         */
        openModal: ($modal) => {
            state.$prevFocus = $('.focused').not($modal.find('*'));
            methods.log('모달 활성화 전 포커스 요소 저장', state.$prevFocus);

            state.$currentModal = $modal;
            state.isModalActive = true;

            methods.resetFocusElems($modal);
            methods.setFocus(0, false); // 모달 열기 시 readTTS=false로 설정

            $modal.attr('aria-hidden', 'false').show();
            methods.log('모달 활성화');
        },

        /**
         * 모달 비활성화 및 상태 초기화.
         * 모달을 닫고 이전 포커스를 복원.
         */
        closeModal: () => {
            state.isModalActive = false;

            methods.resetFocusElems($(document));

            if (state.$prevFocus && state.$prevFocus.length) {
                // state.$prevFocus.focus();
                state.$prevFocus.addClass('focused').focus();
                methods.log('이전 포커스 요소 복원', state.$prevFocus);

                state.focusIdx = state.focusElems.index(state.$prevFocus);
            } else {
                state.focusIdx = -1;
            }

            if (state.$currentModal) {
                // state.$currentModal.attr('aria-hidden', 'true').hide();
                // state.$currentModal.attr('aria-hidden', 'true').hide();
                state.$currentModal = null;
            }

            methods.log('모달 비활성화 후 상태 초기화 완료');
        },

        /**
         * Tab 키로 포커스를 이동.
         * 다음 또는 이전 포커스로 이동하고 TTS 실행.
         * @param {number} direction - 이동 방향 (1: 다음, -1: 이전)
         */
        handleTab: (direction) => {
            if (!state.focusElems.length) return;

            const nextIdx =
                (state.focusIdx + direction + state.focusElems.length) %
                state.focusElems.length;

            // Tab 이동 시 readTTS=true로 설정하여 TTS 실행
            methods.setFocus(nextIdx, true);
        },

        /**
         * Enter 키로 현재 포커스된 요소를 클릭.
         */
        handleEnter: () => {
            if (!state.isHeadphoneConnected) {
                methods.log('이어폰 연결 상태 아님');
                return;
            }

            const $focusedElem = state.focusElems.eq(state.focusIdx);

            if (!$focusedElem.length) {
                methods.log('포커스된 요소 없음');
                return;
            }

            if ($focusedElem.hasClass('key')) {
                $focusedElem[0].click(); // 가상 키보드 클릭 처리
                methods.log('Enter 키로 가상 키보드 키 클릭 발생', $focusedElem[0]);
            } else if ($focusedElem.is('input[type="date"]')) {
                $focusedElem[0].showPicker();
            } else if ($focusedElem.is('button, a, span, label, input[type="button"], input[type="submit"], input[type="checkbox"]')) {
                $focusedElem[0].click(); // 일반 클릭 처리
            } else {
            }
        },

        /**
         * UP 키 핸들러.
         * 볼륨 증가.
         */
        handleUpKey: () => {
            const newVolume = Math.min(state.volume + state.volumeStep, 100); // 100을 초과하지 않도록 제한
            if (newVolume !== state.volume) {
                state.volume = newVolume;
                sessionStorage.setItem("volume", newVolume);

                let currentText = sessionStorage.getItem("currentText");
                let lastCharIndex = sessionStorage.getItem("lastCharIndex");
                let currentUtterance  = sessionStorage.getItem("currentUtterance");

                // 지금 말하는 중이면, 현재 위치부터 다시 말하기
                if (currentUtterance && window.speechSynthesis.speaking) {
                    // 캐릭터 경계 이벤트가 없더라도 사용자 체감 개선을 위해
                    // 약간 앞부분부터 재시작해도 됨 (예: Math.max(0, lastCharIndex - 5))
                    methods.speakFrom(currentText,Number.parseInt(lastCharIndex));
                }
                methods.log('UP 키 입력 처리 - 볼륨 증가', state.volume);
            }
        },

        /**
         * DOWN 키 핸들러.
         * 볼륨 감소.
         */
        handleDownKey: () => {
            const newVolume = Math.max(state.volume - state.volumeStep, 0); // 0 미만으로 내려가지 않도록 제한
            if (newVolume !== state.volume) {
                state.volume = newVolume;
                sessionStorage.setItem("volume", newVolume);
                let currentText = sessionStorage.getItem("currentText");
                let lastCharIndex = sessionStorage.getItem("lastCharIndex");
                let currentUtterance  = sessionStorage.getItem("currentUtterance");
                // 지금 말하는 중이면, 현재 위치부터 다시 말하기
                if (currentUtterance && window.speechSynthesis.speaking) {
                    // 캐릭터 경계 이벤트가 없더라도 사용자 체감 개선을 위해
                    // 약간 앞부분부터 재시작해도 됨 (예: Math.max(0, lastCharIndex - 5))
                    methods.speakFrom(currentText,Number.parseInt(lastCharIndex));
                }
                methods.log('DOWN 키 입력 처리 - 볼륨 감소', state.volume);
            }
        },
        /**
         * Home 키로 동작 수행.
         * - 첫 번째 입력: 현재 포커스된 요소 TTS 다시 듣기
         * - 두 번째 입력: 홈으로 이동
         */
        handleHomeKey: () => {
            if (state.homeKeyTimer) {
                clearTimeout(state.homeKeyTimer);
            }

            state.homeKeyCount += 1;

            if (state.homeKeyCount === 1) {
                methods.log('홈 키 첫 번째 입력: TTS 다시 듣기');
                if (state.focusIdx >= 0 && state.focusIdx < state.focusElems.length) {
                    const $elem = state.focusElems.eq(state.focusIdx);
                }

                state.homeKeyTimer = setTimeout(() => {
                    state.homeKeyCount = 0;
                    methods.log('홈 키 입력 초기화');
                }, 1000);
            } else if (state.homeKeyCount === 2) {
                clearTimeout(state.homeKeyTimer);
                methods.log('홈 키 두 번째 입력: 홈으로 이동');
                location.href = "index.do";
                state.homeKeyCount = 0;
            }
        },

        /**
         * 이어폰 연결 처리.
         */
        handleHeadphoneIn: () => {
            state.isHeadphoneConnected = true;
            sessionStorage.setItem('g_earphone', 'Y'); // 세션 스토리지에 상태 저장
            methods.log('이어폰 IN - 사운드 장치 변경 요청');
            function reload () {
                location.reload();
            }
            customPopupHtml("<div style='text-align: center;'>서비스 이용이 처음이시면 " +
                "<br>음성 안내를 듣고 진행해주시길 바랍니다. " +
                "<br>조작키패드는 화면 하단 좌측에 있습니다. " +
                "<br>1. 중앙 동그라미 버튼은 항목 선택  " +
                "<br>2. 왼쪽,오른쪽 방향키는 항목 이동  " +
                "<br>3. 위, 아래 방향키는 소리 조절 " +
                "<br>4. 이어폰 꽂이 옆 버튼은 홈으로 이동 " +
                "</div>", reload);
            // 오디오 엘리먼트 중지 및 초기화
            methods.stopAndResetAudio();
            // 페이지 초기 로드시 첫 번째 요소로 이동 readTTS=false로 설정
            methods.setFocus(0, false);
        },

        /**
         * 이어폰 해제 처리.
         */
        handleHeadphoneOut: () => {
            state.isHeadphoneConnected = false;
            $(':root').css('--focus-outline', 'none');
            sessionStorage.setItem('g_earphone', 'N'); // 세션 스토리지에 상태 저장
            methods.log('이어폰 OUT - 사운드 장치 변경 요청');
            methods.log('이어폰 해제됨 (상태 초기화)');
            // 모달 상태에 따른 초기화 처리
            if (state.isModalActive) {
                methods.log('모달 상태: 초기화 처리');
                methods.closeModal(); // 모달 닫기
                methods.hideOverlay(); // Overlay 숨김

            } else {
                methods.log('모달 없음: 페이지 초기화 처리');
                methods.resetFocusElems($(document)); // 포커스 초기화
            }

            // 현재 포커스된 요소 blur 처리
            const $focused = $('.focused');
            if ($focused.length) {
                $focused.removeClass('focused').blur();
                methods.log('포커스 초기화 완료', $focused);
            }
            state.focusIdx = -1; // 포커스 인덱스 초기화
            location.reload();
        },

        /**
         * 키와 동작을 매핑한 객체.
         * 특정 키 입력 시 해당 핸들러를 호출.
         */
        keyHandlers: {
            /**
             * Tab 키 핸들러.
             * Shift 키와 함께 눌린 경우 이전 요소로 이동, 아니면 다음 요소로 이동.
             * @param {KeyboardEvent} e - Tab 키 이벤트 객체
             */
            [KEYS.TAB]: (e) => methods.handleTab(e.shiftKey ? -1 : 1),

            /**
             * Tab 키 핸들러.
             * Shift 키와 함께 눌린 경우 이전 요소로 이동, 아니면 다음 요소로 이동.
             * @param {KeyboardEvent} e - Tab 키 이벤트 객체
             */
            [KEYS.LEFT]: (e) => methods.handleTab(-1),

            /**
             * Tab 키 핸들러.
             * Shift 키와 함께 눌린 경우 이전 요소로 이동, 아니면 다음 요소로 이동.
             * @param {KeyboardEvent} e - Tab 키 이벤트 객체
             */
            [KEYS.RIGHT]: (e) => methods.handleTab(1),

            /**
             * Enter 키 핸들러.
             * 현재 포커스된 요소를 클릭 처리.
             */

            [KEYS.ENTER]: () => methods.handleEnter(),

            /**
             * UP 키 핸들러.
             * 오디오 볼륨 업 처리.
             */
            [KEYS.UP]: () => methods.handleUpKey(),

            /**
             * DOWN 키 핸들러.
             * 오디오 볼륨 다운 처리.
             */
            [KEYS.DOWN]: () => methods.handleDownKey(),

            /**
             * Home 키 핸들러.
             * 첫 번째 입력: 현재 포커스된 요소의 텍스트 TTS로 읽기.
             * 두 번째 입력: 홈으로 페이지 이동.
             */
            [KEYS.F17]: () => methods.handleHomeKey(),

            /**
             * F15 키 핸들러.
             * 이어폰 IN.
             */
            [KEYS.F15]: () => methods.handleHeadphoneIn(true), // 이어폰 IN

            /**
             * F16 키 핸들러.
             * 이어폰 OUT.
             */
            [KEYS.F16]: () => methods.handleHeadphoneOut(false), // 이어폰 OUT
        },

        /**
         * 키보드 이벤트 핸들러.
         * keyHandlers에 매핑된 키가 입력되면 해당 핸들러 호출.
         * @param {KeyboardEvent} e - 키보드 이벤트 객체
         */
        handleKeyEvent: (e) => {

            if (!e.key) {
                methods.log('키 입력 값이 없습니다.');
                return;
            }

            const testMode = sessionStorage.getItem('test_mode') === 'true';

            if (!testMode && !state.isHeadphoneConnected) {
                // 이어폰 비활성화 상태에서 F15, F16 키는 동작하도록 예외 처리
                if (e.key === KEYS.F15 || e.key === KEYS.F16) {
                    const handler = methods.keyHandlers[e.key];
                    if (handler) {
                        e.preventDefault(); // 기본 동작 방지
                        handler(e); // 이어폰 상태 변경 처리
                    }
                    return; // 이후 동작 무시
                }
                if (e.key === "Enter") {
                    return;
                }

                // 이어폰 미연결 상태에서 다른 키는 차단
                if (Object.values(KEYS).includes(e.key)) {
                    e.preventDefault(); // 기본 동작 방지
                    methods.log(`키 차단됨 (이어폰 비활성화): ${e.key}`);
                }
                return; // 일반 키보드 동작은 그대로 유지
            }

            // 테스트 모드이거나 이어폰 활성화 상태에서 커스텀 키 처리
            const handler = methods.keyHandlers[e.key];
            if (handler) {
                e.preventDefault(); // 기본 동작 방지
                handler(e);
                methods.log(`키 핸들러 실행 완료: ${e.key}`);
            } else {
                methods.log(`정의되지 않은 키 입력: ${e.key}`);
            }
        },

        /**
         * 소켓 key up 처리
         * @param {string} key - 입력된 키 값
         * 사용하지 않는 이유:
         * - 소켓 이벤트는 키 입력 이후 발생하며, DOM 이벤트 흐름과 다름.
         * - 키 입력은 실시간으로 DOM의 keydown 이벤트에서 처리하는 것이 더 적합.
         * - 소켓 이벤트는 부가적인 동작이나 상태 확인 용도로 활용 가능.
         */
        handleKeyInput: (key) => {
            if (!key) {
                methods.log('빈 키 값이 수신되었습니다.');
                return;
            }

            const testMode = sessionStorage.getItem('test_mode') === 'true';
            if (!testMode && !state.isHeadphoneConnected) {
                if (key === KEYS.F15 || key === KEYS.F16) {
                    const handler = methods.keyHandlers[key];
                    if (handler) {
                        handler();
                        methods.log(`키 핸들러 실행 완료: ${key}`);
                    }
                    return; // 이후 동작 무시
                }

                // 이어폰 미연결 상태에서 키 입력 차단
                if (Object.values(KEYS).includes(key)) {
                    methods.log(`키 차단됨 (이어폰 비활성화): ${key}`);
                }
                return; // 이어폰이 연결되지 않은 경우 아무 동작도 하지 않음
            }

            // 이어폰 활성화 상태이거나 테스트 모드에서 커스텀 키 처리
            const handler = methods.keyHandlers[key];
            if (handler) {
                handler();
                methods.log(`키 핸들러 실행 완료: ${key}`);
            } else {
                methods.log(`정의되지 않은 키 입력: ${key}`);
            }
        },

        /**
         * 키보드 이벤트 핸들러 등록.
         * 중복 등록 방지 후 키 이벤트 연결.
         * Tab, Enter, ArrowUP, ArowDown, Home(F17), F15(jack in), F16(jack out) 키 이벤트를 처리.
         */
        attachEvents: () => {
            // 키보드 이벤트 중복 등록 방지
            $(document)
                .off('keydown.keyPadController')
                .on('keydown.keyPadController', methods.handleKeyEvent);
        },

        /**
         * 키패드 컨트롤러 업데이트.
         * 새 페이지나 모달에 포커스를 초기화하고 이어폰 상태를 동기화.
         */
        update: () => {
            state.focusIdx = -1; // 포커스 인덱스 초기화

            // 새로 로드된 페이지의 포커스 요소 설정
            const $initialModal = methods.detectActiveModal();
            if ($initialModal) {
                methods.resetFocusElems($initialModal);
                methods.setFocus(0, false); // 모달의 초기 로드시 첫 번째 요소로 이동 readTTS=false로 설정
            } else {
                methods.resetFocusElems($(document));
                methods.setFocus(0, false); // 새 페이지의 초기 로드시 첫 번째 요소로 이동 readTTS=false로 설정
            }

            methods.isHeadphoneConnected(); // 이어폰 상태 동기화
            methods.log('keyPadController Update 완료');
        },
    };

    /**
     * 컨트롤러 초기화.
     * @param {Object} jqueryInstance - jQuery 인스턴스
     * @param {Object} [options={}] - 설정 옵션
     * @param {boolean} [options.debugMode=false] - 디버그 모드 활성화 여부
     * @param {boolean} [options.testMode=false] - 테스트 모드 활성화 여부(스톰키패드없이 키보드로 테스트시)
     */
    const init = (jqueryInstance, options = {}) => {
        if (!jqueryInstance) {
            console.error('jQuery 인스턴스가 전달되지 않았습니다.');
            return;
        }

        $ = jqueryInstance; // 전달받은 jQuery 객체 저장

        // 디버그 모드 설정
        if (typeof options.debugMode === 'boolean' && options.debugMode) {
            state.debugMode = options.debugMode;
            methods.log('디버그 모드 활성화');
        }

        // 테스트 모드 설정
        const isTestMode = typeof options.testMode === 'boolean' && options.testMode;
        if (isTestMode) {
            sessionStorage.setItem('test_mode', 'true');
            sessionStorage.setItem('g_earphone', 'Y'); // 테스트 모드에서 이어폰 연결 상태 설정
            state.isHeadphoneConnected = true; // 내부 상태 업데이트
            methods.log('테스트 모드 활성화 - 이어폰 상태 설정: Y');
        } else {
            sessionStorage.setItem('test_mode', 'false');
            sessionStorage.setItem("currentUtterance", null);
            sessionStorage.setItem("currentText", null);
            sessionStorage.setItem("lastCharIndex ", null);

            let volume = sessionStorage.getItem("volume");
            if (!volume) {
                sessionStorage.setItem('volume', '50');
            } else {
                state.volume = volume;
            }

            // 이어폰 상태 초기화
            if (!sessionStorage.getItem('g_earphone')) {
                sessionStorage.setItem('g_earphone', 'N');
            }
            // 일반 환경에서는 이어폰 상태를 세션값에 따라 설정
            state.isHeadphoneConnected = methods.isHeadphoneConnected(); // 기존 값 동기화
            methods.log('일반 모드 활성화 - 이어폰 상태 동기화');
        }
        methods.attachEvents();
        methods.log('keyPadController 초기화 완료');
    };

    return {
        init,
        speakFrom:methods.speakFrom,
        update: methods.update,
        setFocus:methods.setFocus,
        openModal: methods.openModal,
        closeModal: methods.closeModal,
        handleKeyInput: methods.handleKeyInput,
        setFocusById: methods.setFocusById,
        isHeadphoneConnected: methods.isHeadphoneConnected,
        setDebugMode: (isEnabled) => {
            state.debugMode = isEnabled;
            methods.log(`디버그 모드 ${isEnabled ? '활성화' : '비활성화'}`);
        },
    };
})(jQuery);
