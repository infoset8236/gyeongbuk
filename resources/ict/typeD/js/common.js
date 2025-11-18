let lastFocusedElement = null; // 🔹 팝업 열기 전 포커스 기억
let audio = new Audio();
const STORAGE_KEY = 'DEVICE_CODE';
$(function (){
    if (typeof keyPadController !== "undefined" && keyPadController) {
        keyPadController.init(jQuery, { debugMode: false });
    }
    getDeviceCode();
})

function getDeviceCode (useApi = true) {
    let code = localStorage.getItem(STORAGE_KEY) || '';
    if (useApi) {
        $.ajax({
            url: '/api/deviceCode/getDeviceCode.do',
            type: 'GET',
            dataType: 'json',
            data: { code: code },
            success: function (res) {
                console.log('서버 응답:', res.DEVICE_CODE);
                if (res && res.DEVICE_CODE) {
                    if (!code || code !== res.DEVICE_CODE) {
                        localStorage.setItem(STORAGE_KEY, res.DEVICE_CODE);
                    }
                    return res.DEVICE_CODE;
                } else {
                    console.warn('서버에서 디바이스 코드를 찾지 못했습니다.');
                    return null;
                }
            },
            error: function (xhr, status, error) {
                console.error('요청 실패');
                console.error('상태코드:', xhr.status);
                console.error('에러내용:', error);
                console.error('응답본문:', xhr.responseText);
                return null;
            }
        });
    } else {
        return code;
    }
}

function showCommonPopup(message, callback) {
    console.log('팝업 : ' + message);

    // 🔹 현재 포커스된 요소 기억
    lastFocusedElement = document.activeElement;
    $(".commonPopupContent").attr("aria-label", message);
    $(".commonPopupMessage").text(message);
    $(".commonPopup").fadeIn(function() {
        // 🔹 팝업이 열린 후 포커스 이동
        $(".commonPopupMessage").attr("tabindex", "-1").focus();
    });

    $(".commonPopupClose").off("click").on("click", function() {
        closeCommonPopup(callback);
    });
}
function bodyOpen() {
    if (typeof keyPadController !== "undefined" && keyPadController) {
        keyPadController.openModal($("body"));
    }
}
function customPopup(message,callback = bodyOpen) {
    keyPadController.openModal($("#commonPopup"));
    showCommonPopup(message.replaceAll("\\n", "\n"), callback);
    keyPadController.setFocus(0,true);
}

function customPopupHtml(message,callback = bodyOpen) {
    keyPadController.openModal($("#commonPopup"));
    showCommonPopupHtml(message.replaceAll("\\n", "\n"), callback);
    let item = sessionStorage.getItem("g_earphone");
    if (item === 'Y') {
        keyPadController.setFocus(0,true);
    }
}

function showCommonPopupHtml(message, callback) {
    console.log('팝업 : ' + message);

    // 🔹 현재 포커스된 요소 기억
    lastFocusedElement = document.activeElement;
    $(".commonPopupMessage").html(message);
    $(".commonPopup").fadeIn(function() {
        $(".commonPopupMessage").attr("tabindex", "-1").focus();
    });

    $(".commonPopupClose").off("click").on("click", function() {
        closeCommonPopup(callback);
    });
}

function closeCommonPopup(callback) {
    $(".commonPopup").fadeOut(function() {
        $(".commonPopupMessage").text("");
        $(".commonPopupClose").off("click");

        // 🔹 팝업 닫힌 후, 이전 포커스 복귀
        if (lastFocusedElement) {
            $(lastFocusedElement).focus();
            lastFocusedElement = null;
        }

        if (typeof callback === "function") {
            callback();
        }
    });
}

// 🔹 ESC 키로 닫기
$(document).on("keydown", function(e) {
    if (e.key === "Escape" && $(".commonPopup").is(":visible")) {
        closeCommonPopup();
    }
});

// 🔹 로그아웃 버튼
$(function() {
    $("#smartLogoutBtn").on("click", function () {
        $.ajax({
            type: "POST",
            url: "/api/klas/logout.do",
            success: function () {
                window.location.href = "/ict/dglib/smart/index.do";
            },
            error: function () {
                showCommonPopup("로그아웃 처리 중 오류가 발생했습니다.");
            }
        });
    });

    $("#touchLogoutBtn").on("click", function () {
        $.ajax({
            type: "POST",
            url: "/api/klas/logout.do",
            success: function () {
                window.location.href = "/ict/dglib/touch/index.do";
            },
            error: function () {
                showCommonPopup("로그아웃 처리 중 오류가 발생했습니다.");
            }
        });
    });
});

// 🔹 로딩 오버레이 처리
$(document).ready(function() {
    let loadingTimeout = null;

    $(document).ajaxStart(function() {
        $(".loadingOverlay").fadeIn(100);

        clearTimeout(loadingTimeout);
        loadingTimeout = setTimeout(function() {
            $(".loadingOverlay").fadeOut(200);
        }, 2000);
    });

    $(document).ajaxStop(function() {
        clearTimeout(loadingTimeout);
        $(".loadingOverlay").fadeOut(200);
    });

    $(document).ajaxError(function() {
        clearTimeout(loadingTimeout);
        $(".loadingOverlay").fadeOut(200);
    });
});
