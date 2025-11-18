const title = [
    "<p>그림 안의 시간은 한순간에 얼어붙었다기보다 흘러들어 고인 느낌이다.</p>",
    "<p>때론 내리는 비를 막아주는 사람보다 <br>함께 비를 맞아주는 사람이 더 위로가 된다.</p>",
    "<p>내가 나도 모르게 오랫동안 했던 일이, <br>사실은 어떤 미래를 위한 연습이었다면?</p>",
    "<p>내가 어떤 순간에 의미를 부여하면 <br>나의 삶은 의미 있는 순간의 <br>합이 되는 것입니다.</p>",
    "<p>우리는 인생의 날들을 늘릴 수는 없지만, <br>그 날들에 생기를 불어넣을 수는 있다.</p>",
    "<p>인간은 가장 깊은 절망의 순간에서조차 <br>아름다움의 법칙에 따라 <br>자신의 삶을 작곡한다.</p>",
    "<p>사람이 사람에게 줄 수 있는 최고의 감동은 한결같은 마음이다.</p>",
    "<p>변하지 않아 아름다운 것이 아니라, <br>아름다운 것이 변함없을 때 <br>비로소 소중해지는 것이다.</p>",
    "<p>계속 반복할 수 있는 기회가 있다면 어떨까? <br>결국 옳게 해낼 때까지 말이야.</p>",
    "<p>사람이 살아가려면 모른척해야 하는 일도 있는 거야. 그래야 계속 살지.</p>",
    "<p>내일은 좀 더 좋은 <br>추억을 만들어 주려고 했어. </p>",
    "<p>당장 가자. 바다를 보러.</p>",
    '<p>"난 또 그렇게 할 거야" 개스퍼리가 말했다. "망설이지도 않을 거야"</p>',
];

const description = [
    "<span>‘나는 메트로폴리탄 미술관의 경비원입니다’ 중에서</span>",
    "<span>‘뜻밖의 위로’ 중에서</span>",
    "<span>‘너의 목소리가 세상에 울려 퍼지도록’ 중에서</span>",
    "<span>‘여덟 단어’ 중에서</span>",
    "<span>‘당신의 완벽한 1년’ 중에서</span>",
    "<span>‘참을 수 없는 존재의 가벼움’ 중에서</span>",
    "<span>‘너에게 하고 싶은 말’ 중에서</span>",
    "<span>‘좋은 사람에게만 좋은 사람이면 돼’ 중에서</span>",
    "<span>‘라이프 애프터 라이프’ 중에서</span>",
    "<span>‘이처럼 사소한 것들’ 중에서</span>",
    "<span>‘녹나무의 여신’ 중에서</span>",
    "<span>‘파도의 아이들’ 중에서</span>",
    "<span>‘고요의 바다에서’ 중에서</span>",
];

$(function() {
    const firstIndex = Math.floor(Math.random() * title.length);
    $(".title").html(title[firstIndex]);
    $(".description").html(description[firstIndex]);

    function changeQuote() {
        const randomIndex = Math.floor(Math.random() * title.length);

        $(".title, .description").fadeOut(800, function() {
            if ($(this).hasClass("title")) {
                $(this).html(title[randomIndex]);
            } else {
                $(this).html(description[randomIndex]);
            }
            $(this).fadeIn(800);
        });
    }

    setInterval(changeQuote, 10000);
});