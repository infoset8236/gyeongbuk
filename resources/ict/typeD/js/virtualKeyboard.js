let showKeypad;

document.addEventListener('DOMContentLoaded', function () {
    const modal = document.createElement('div');
    modal.id = 'keypadModal';
    modal.className = 'keypad-modal';
    modal.style.display = 'none';

    const overlay = document.createElement('div');
    overlay.id = 'keypadOverlay';
    overlay.style.display = 'none';

    document.body.appendChild(modal);
    // document.body.appendChild(overlay);

    let activeInput = null;

    function shuffle(arr) {
        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
        return arr;
    }

    showKeypad = function (targetInput) {
        activeInput = targetInput;

        const numbers = shuffle([...Array(10).keys()]);
        const layout = [
            [numbers[0], numbers[1], numbers[2]],
            [numbers[3], numbers[4], numbers[5]],
            [numbers[6], numbers[7], numbers[8]],
            ['empty', numbers[9], 'back']
        ];

        const table = document.createElement('table');
        table.className = 'keypad-table';

        layout.forEach(row => {
            const tr = document.createElement('tr');
            row.forEach(cell => {
                const td = document.createElement('td');

                if (cell === 'empty') {
                    td.classList.add('disabled');
                } else if (cell === 'back') {
                    td.textContent = '←';
                    td.classList.add('disabled');
                    td.onclick = () => {
                        if (activeInput) {
                            const index = parseInt(activeInput.dataset.index, 10);

                            if (!isNaN(index)) {
                                // 현재 칸 지우기
                                activeInput.value = '';
                                if (window.actualPassword) {
                                    window.actualPassword[index] = '';
                                }

                                // 이전 칸 지우기 + 이동
                                const prev = activeInput.previousElementSibling;
                                if (prev && prev.classList.contains('password-input')) {
                                    prev.value = '';
                                    const prevIndex = parseInt(prev.dataset.index, 10);
                                    if (!isNaN(prevIndex) && window.actualPassword) {
                                        window.actualPassword[prevIndex] = '';
                                    }
                                    prev.focus();
                                    activeInput = prev;
                                } else {
                                    activeInput.focus(); // 맨 앞이면 유지
                                }
                            }
                        }
                    };
                } else {
                    td.textContent = cell;
                    td.onclick = () => {
                        if (activeInput) {
                            activeInput.value = cell;
                            activeInput.dispatchEvent(new Event('input'));

                            const next = activeInput.nextElementSibling;
                            const isLastInput = !next || !next.classList.contains('password-input');
                            if (!isLastInput) {
                                next.focus();
                            }
                            const allFilled = Array.from(document.querySelectorAll('.password-input'))
                                .every(input => input.value && input.value === '*');

                            if (allFilled) {
                                hideKeypad();
                            } else {
                                setTimeout(() => {
                                    const nextInput = document.activeElement;
                                    if (nextInput && nextInput.classList.contains('password-input')) {
                                        activeInput = nextInput;
                                    }
                                }, 10);
                            }
                        }
                    };
                }

                tr.appendChild(td);
            });
            table.appendChild(tr);
        });

        const closeBtn = document.createElement('button');
        closeBtn.textContent = '닫기';
        closeBtn.style.cssText = 'margin-top: 10px; padding: 6px 12px;';
        closeBtn.onclick = hideKeypad;

        modal.innerHTML = '';
        modal.appendChild(table);
        modal.appendChild(closeBtn);

        // 위치는 CSS에서 고정되므로 위치 계산 없음
        modal.style.display = 'block';
        overlay.style.display = 'block';
    };

    function hideKeypad() {
        modal.style.display = 'none';
        overlay.style.display = 'none';
    }

    overlay.addEventListener('click', hideKeypad);

    document.querySelectorAll('.password-input').forEach(input => {
        input.setAttribute('readonly', true);
        input.addEventListener('click', () => showKeypad(input));
    });
});

// 외부 접근 허용
window.showKeypad = function (input) {
    if (typeof showKeypad === 'function') {
        showKeypad(input);
    }
};