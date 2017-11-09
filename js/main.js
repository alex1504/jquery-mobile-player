window.onload = function () {
    // 加载
    $(".m-loader").animate({
        'opacity': 0
    }, 300);
    setTimeout(function () {
        $(".m-loader").remove();
        $("#index").removeClass('hide');
    }, 2000);

};
$(function () {

    var rootPath = window.location.href.replace(/\/\w+\.\w+/, "/");
    var Settings = {
        playmode: 0, //0列表循环，1随机，2为单曲循环
        volume: 0.5, //音量
        initNum: 10, //列表初始化歌曲数
        reqNum: 10 //后续请求歌曲数
    };

    // =================================================================工具函数
    var Util = (function () {
        // HandlerbarHelper访问映射数组的值
        Handlebars.registerHelper('createMap', function (value, index, options) {
            return value[index] === "" ? "--------------" : value[index];
        });

        // 筛选初始歌曲列表数据
        Handlebars.registerHelper('isInitData', function (value, index, options) {
            var flag = index < Settings.initNum ? true : false;
            if (flag) {
                return options.fn(this);
            }
        });

        // 根据手机屏幕自适应字体大小（rem自适应方案）
        function rescale() {
            var docEle = document.documentElement;
            var width = docEle.clientWidth || window.innerWidth;
            if (width > 640 && width !== 768) {
                docEle.style.fontSize = "100px";
            } else if (width == 320) {
                //iphone5
                docEle.style.fontSize = "49px";
            } else if (width == 375) {
                //iphone6 
                docEle.style.fontSize = "57px";
            } else if (width == 414) {
                // iphone6s Plus
                docEle.style.fontSize = "57px";
            } else if (width == 768) {
                //ipad 
                docEle.style.fontSize = "88px";
            } else {
                docEle.style.fontSize = Math.round(width / 650 * 100) + "px";
            }
        }

        // 为歌曲列表添加动画延迟
        function addAnimationDelay(list, num) {
            var baseDelay = 0.1;
            list.each(function (index, ele) {
                if (num && index == num) {
                    baseDelay = 0.1;
                }
                $(ele).css({
                    "animation-delay": baseDelay + "s"
                });
                baseDelay += 0.1;
            });
        }

        // 格式化时间为分：秒的形式
        function formatTime(seconds, curS) {
            var totalS = parseInt(seconds);
            var minute = Math.floor((totalS / 60));
            var second = totalS - minute * 60;
            second = second < 10 ? ("0" + second) : second;

            return minute + ":" + second;
        }

        // 将时间转化为百分比
        function timeToPercent(curS, totalS) {
            var percent = parseInt((Number(curS) / Number(totalS)) * 100) + "%";
            return percent;
        }

        // 更新时间
        function updataTime(dom, seconds) {
            var result = formatTime(seconds);
            dom.html(result);
        }

        // 更新进度条
        function updateProgress(dom, percent) {
            dom.css("width", percent);
            return true;
        }

        // 更新进度滑块
        function updateBarPos(dom, percent) {
            dom.css("left", percent);
            return true;
        }
        //生成大于等于0小于length的随机整数，且不为num
        function makeRandom(num, length) {
            var randomNum = 0;
            do {
                randomNum = Math.floor(Math.random() * length);
            }
            while (randomNum === num);
            return randomNum;
        }

        function setItem(key, value) {
            if (typeof value == "object") {
                return localStorage.setItem("h5player-" + key, JSON.stringify(value));
            }
            return localStorage.setItem("h5player-" + key, value);
        }

        function getItem(key) {
            if (typeof localStorage.getItem("h5player-" + key) == "object") {
                return JSON.parse(localStorage.getItem("h5player-" + key));
            }
            return localStorage.getItem("h5player-" + key);
        }
        // 格式化歌词函数--将歌词字符串分割成时间数组-及其对应的-歌词数组
        function createArrMap(lyric) {
            var timeArr = [],
                lyricArr = [];
            var tempArr = lyric.split("\n");
            tempArr.splice(-1, 1);
            var tempStr = "";
            $(tempArr).each(function (index) {
                tempStr = this;
                if (tempStr.charAt(9).match(/\d/) !== null) {
                    tempStr = tempStr.substring(0, 9) + tempStr.substring(10);
                }
                timeArr.push(tempStr.substring(0, 10));
                lyricArr.push(tempStr.substring(10));
            });
            return {
                timeArr: timeArr,
                lyricArr: lyricArr
            };
        }
        // 格式化歌词时间为秒数
        function formatLyricTime(timeArr) {
            var result = [];
            var time = 0;
            var m = 0;
            var s = 0;
            $.each(timeArr, function (index) {
                time = this.replace(/[\[]|]|\s|:/ig, "");
                m = +time.substring(0, 2);
                s = +time.substring(2);
                result.push(Math.floor(m * 60 + s));

            });
            return result;
        }
        // 获取歌词需要移动的距离--topLrcIndex 为容器视图可见的顶部歌词索引
        function getMoveDis(topLrcIndex) {
            var moveDis = (+Dom.lrc.eq(topLrcIndex).css("margin-top").replace("px", "")) + (+Dom.lrc.eq(topLrcIndex).height());
            return moveDis;
        }
        // 获取时间变化后高亮歌词的索引
        function getHighLightIndex(curS, formatTimeArr) {
            var curSInt = Math.floor(curS);
            var highLightIndex = 0;
            var nextIndex = 0;
            // console.log(curSInt + "|" + formatTimeArr);
            for (var i = 0; i < formatTimeArr.length; i++) {
                nextIndex = i + 1;
                if (curSInt >= formatTimeArr[i] && curSInt <= formatTimeArr[nextIndex]) {
                    highLightIndex = i;
                    break;
                }
                if (curSInt >= formatTimeArr[i] && !formatTimeArr[nextIndex]) {
                    highLightIndex = formatTimeArr.length - 1;
                    break;
                }
            }
            return highLightIndex;
        }
        // 判断歌曲列表滑动到底部的函数
        function isScrollToBottom($dom, boxWinH, scrollTop) {
            var boxH = $dom.height();
            var dis = (boxH - boxWinH) * 0.5;
            // console.log(scrollTop + "|" + dis);
            return scrollTop >= dis ? true : false;
        }
        return {
            rescale: rescale,
            addAnimationDelay: addAnimationDelay,
            formatTime: formatTime,
            updataTime: updataTime,
            updateProgress: updateProgress,
            updateBarPos: updateBarPos,
            timeToPercent: timeToPercent,
            makeRandom: makeRandom,
            setItem: setItem,
            getItem: getItem,
            createArrMap: createArrMap,
            formatLyricTime: formatLyricTime,
            getMoveDis: getMoveDis,
            getHighLightIndex: getHighLightIndex,
            isScrollToBottom: isScrollToBottom,

        };
    })();



    var Dom = {
        index: $("#index"),

        playPage: $(".play"),
        iconPMode: $(".m-playoptions .icon"),

        audio: $("#audio")[0], //Dom节点

        navBox: $("#index .m-nav"),


        songContainerWrap: $(".g-songlist"),
        sliderWrap: $(".sliderWrap"),
        songListContainer: $("#songlist"),
        lSongListContainer: $("#lsonglist"),
        song: $("#songlist .song"),
        lsong: $("#lsonglist .song"),

        psongname: $("#psongname"),
        psinger: $("#psinger"),
        lrcbox: $("#lrcbox"),
        lrcwrap: $("#lrc-wrap"),
        lrc: $("#lrc-wrap p"),
        lrcbg: $("#lrc-bg"),
        lrcimg: $("#lrcimg"),

        btnBack: $(".play .back"),
        btnControl: $(".btn-control"),
        btnPlay: $(".btn-play"),
        songCount: $("#totalsong"),

        start: $("#start"),
        end: $("#end"),

        msProgress: $(".m-progress-song"), // 歌曲进度条容器
        sProgress: $("#songprogress"),
        songbar: $("#songbar"),
        mvProgress: $(".m-progress-volume"), // 歌曲声音控制容器
        vProgress: $("#volprogress"),
        vbar: $("#volbar"),

        prev: $(".btn-prev"),
        next: $(".btn-next"),

        random: $(".icon-random"),
        menu: $(".icon-menu"),
        loop: $(".icon-loop"),

        footer: $(".g-footer")


    };
    var winH = $(window).height();

    var songNum = 0; //当前列表歌曲数目
    var lrcHighIndex = 0; // 歌词高亮索引
    var lrcMoveIndex = 0; // 歌词移动单位索引
    var moveDis = 0; // 单句歌词每次移动距离

    var duration = 0; // 当前歌曲的时间
    var index = 0; //当前播放歌曲的索引
    var songInfo = null; // 当前歌曲信息
    var songModelUI = null; // 当前歌曲UI模型
    var timeArr = []; //当前歌曲时间数组
    var formatTimeArr = []; //当前歌曲时间数组(格式化为秒数)

    Util.rescale();

    // 入口函数
    function main() {
        initUIFrame();
        var initModel = PlayerModel();

        var songListUI = ModelUIFrame(Dom.songListContainer);
        var lsongListUI = ModelUIFrame(Dom.lSongListContainer);

        initModel.getSongList("data/data.json", function (data) {
            // 生成所有歌曲列表
            songListUI.renderList(data, 0, null, function () {
                songListUI.updateList();
            });

            // 生成喜爱歌曲列表
            initModel.getLoveSongArr(function (lSongArr) {
                lsongListUI.renderList(data, 1, lSongArr);
            });

            // 添加动画
            Util.addAnimationDelay(Dom.song);

            // 保存歌词数据
            initModel.saveLyric(data);

        });



        EventHandler();
    }

    // =================================================================初始化UI模块
    function initUIFrame() {
        typeof (Settings.playmode) !== "undefined" && Dom.iconPMode.eq(Settings.playmode).addClass('active');
        typeof (Settings.volume) !== "undefined" && Util.updateProgress(Dom.vProgress, (Settings.volume * 100) + "%") && Util.updateBarPos(Dom.vbar, (Settings.volume * 100) + "%") && (Dom.audio.volume = Settings.volume);
    }

    // =================================================================实现数据交互的方法模块
    function PlayerModel() {
        function getSongList(url, callback, reqData) {
            $.ajax({
                    url: url,
                    type: 'GET',
                    data: reqData || "",
                })
                .done(function (data) {
                    callback && callback(data);
                })
                .fail(function () {
                    console.log("error");
                })
                .always(function () {
                    console.log("complete");
                });
        }

        function saveLyric(data) {
            $.each(data, function (index, item) {
                //jQuery实现break，使用return false;continue,使用return true.
                if (Util.getItem("lyric" + index) !== null) {
                    return;
                }
                Util.setItem("lyric" + index, item.lyric);
            });
        }

        function getLoveSongArr(callback) {
            var lSongArr = Util.getItem("lsonglist");
            callback && callback(lSongArr);
        }
        return {
            getSongList: getSongList,
            saveLyric: saveLyric,
            getLoveSongArr: getLoveSongArr
        };
    }

    // =================================================================模型动态UI模块
    function ModelUIFrame(container) {
        // Handlerbar 模板
        var sListTpl = $("#sListTpl").html();
        var lyricTpl = $("#lyricTpl").html();
        /**
         * 生成歌曲列表信息
         * @param  {[Arr]}   data     [歌曲数据列表]
         * @param  {[Number]}   type       [列表类型] 0：所有歌曲 1：喜爱歌曲 2：搜索歌曲
         * @param  {Function} callback [回调]
         */
        function renderList(data, type, lsongArr, callback) {
            // 生成所有歌曲列表
            function renderAllList(data) {
                var preTpl;
                var lsongArr = Util.getItem('lsonglist') === null ? [] : JSON.parse(Util.getItem('lsonglist'));
                // 生成列表
                if (!sListTpl) {
                    // 后续动态生成歌曲
                    var tpl = "";
                    var songIndex = songNum;
                    $.each(data, function (index, el) {
                        if (index >= songIndex && index < songIndex + Settings.reqNum) {
                            tpl += "<li class='song btm-line' data-src='res/music/" + songNum + ".mp3' data-index='" + songNum + "'><div class='poster'><img src='./img/poster/" + songNum + "-thumbnail.jpg'></div><div class='songinfo'><h2 class='lsongname'>" + el.songName + "</h2><sub class='lsinger'>" + el.singer + "</sub></div><div class='loveflag'><i class='icon icon-love '></i></div></li>";
                            songNum++;
                        }
                    });
                    $(container).append($(tpl));
                } else {
                    // 首次生成歌曲
                    preTpl = Handlebars.compile(sListTpl);
                    $(container).html(preTpl(data));
                }
                // 更新喜爱图标
                if (lsongArr.length !== 0) {
                    $.each(lsongArr, function (index, val) {
                        Dom.songListContainer.find(".song").eq(val).find(".icon-love").addClass('active');
                    });
                }
            }
            // 生成喜爱歌曲列表
            function renderLSongList(data, lsongArr) {
                var lSongArr = lsongArr;
                var tpl = "";
                if (typeof lSongArr !== "object") {
                    lSongArr = JSON.parse(lsongArr);
                    lSongArr.sort(function (a, b) {
                        return a - b;
                    });
                }
                if (lSongArr && lSongArr.length !== 0) {
                    Dom.lSongListContainer.html("");
                    $.each(data, function (index, el) {
                        if (lSongArr[0] === index) {
                            tpl += "<li class='song btm-line' data-src='res/music/" + index + ".mp3' data-index='" + index + "'><div class='poster'><img src='./img/poster/" + index + "-thumbnail.jpg'></div><div class='songinfo'><h2 class='lsongname'>" + el.songName + "</h2><sub class='lsinger'>" + el.singer + "</sub></div><div class='loveflag'><i class='icon icon-love active'></i></div></li>";
                            lSongArr.shift();
                        }
                    });
                    $(container).append($(tpl));
                }
                Dom.lsong = $("#lsonglist .song");
            }
            (type === 0) && renderAllList(data);
            (type === 1) && renderLSongList(data, lsongArr);

            callback && callback();
        }
        // 更新歌曲列表信息
        function updateList() {
            Dom.song = $("#songlist .song");
            songNum = Dom.song.length;
            $("#totalsong").html(songNum);
        }
        // 生词歌曲信息（包括歌名|歌手名|歌词）
        function updateSongInfo(songinfo) {
            Dom.psongname.text(songinfo.songname);
            Dom.psinger.text(songinfo.singer);
            renderLyric(songinfo);
            Dom.lrcwrap.css({
                "top": 0
            });
            Dom.lrcimg.attr("src", songinfo.lrcimg);
            Dom.lrc = Dom.lrcwrap.find("p");
        }
        // 生成歌词
        function renderLyric(songinfo) {
            var arrMap = Util.createArrMap(songinfo.lyric);
            if (!lyricTpl) {
                var tpl = "";
                $.each(arrMap.lyricArr, function (index, lyric) {
                    var lyricContent = lyric === "" ? "--------------" : lyric;
                    tpl += "<p class='' data-point='" + arrMap.timeArr[index] + "'>" + lyricContent + "</p>";
                });
                Dom.lrcwrap.html(tpl);
                return;
            }
            var preTpl = Handlebars.compile(lyricTpl);
            Dom.lrcwrap.html(preTpl(arrMap));
        }

        // 歌词同步
        function syncLyric(curS, formatTimeArr) {
            // console.log(Math.floor(curS) + "|" + lrcHighIndex);
            if (Math.floor(curS) >= formatTimeArr[lrcHighIndex]) {
                Dom.lrc.eq(lrcHighIndex).addClass('current').siblings().removeClass('current');
                if (lrcHighIndex >= 1) {
                    lrcMoveIndex = lrcHighIndex - 2;
                    moveDis += Util.getMoveDis(lrcMoveIndex);
                    Dom.lrcwrap.animate({
                        "top": "-" + moveDis + "px"
                    }, 100);
                    lrcMoveIndex++;
                }
                lrcHighIndex++;
            }
        }

        function updateLrcView(curS, formatTimeArr) {
            moveDis = 0;
            lrcHighIndex = Util.getHighLightIndex(curS, formatTimeArr);
            lrcMoveIndex = lrcHighIndex - 2;
            Dom.lrc.eq(lrcHighIndex).addClass('current').siblings().removeClass('current');
            for (var i = 0; i < lrcHighIndex - 1; i++) {
                moveDis += Util.getMoveDis(i);
            }
            Dom.lrcwrap.animate({
                "top": "-" + moveDis + "px"
            }, 100);

        }
        return {
            renderList: renderList,
            updateList: updateList,
            updateSongInfo: updateSongInfo,
            syncLyric: syncLyric,
            updateLrcView: updateLrcView,
        };
    }

    // =================================================================事件绑定模块
    function EventHandler() {

        // 根据手机屏幕调整布局
        $(window).on("resize", function () {
            Util.rescale();
        });

        // 滚动加载
        Dom.sliderWrap.eq(0).on("scroll", function (e) {
            var updateSongModel = PlayerModel();
            var updateSongListUI = ModelUIFrame(Dom.songListContainer);
            var scrT = $(this).scrollTop();
            var listBoxWinH = Dom.songContainerWrap.height();

            if (Util.isScrollToBottom($(this), listBoxWinH, scrT)) {
                updateSongModel.getSongList("data/data.json", function (data) {
                    // 生成歌曲列表
                    var beUpdSongNum = songNum; // 记录更新前歌曲的总数
                    updateSongListUI.renderList(data, 0, null, function () {
                        updateSongListUI.updateList();
                    });
                    Util.addAnimationDelay(Dom.song, beUpdSongNum);
                    // 保存歌词数据
                    updateSongModel.saveLyric(data);
                });
            }
        });

        // 歌曲播放完毕事件
        Dom.audio.onended = function () {
            // 触发点击下一首歌的事件
            $(Dom.next).trigger("click");
        };

        // 监听歌曲播放时间发生变化事件
        $(Dom.audio).on("timeupdate", function () {
            var curS = Dom.audio.currentTime;
            var curPercent = Util.timeToPercent(curS, duration);

            // 歌词同步 
            songModelUI.syncLyric(curS, formatTimeArr);

            // 更新歌曲时间，进度条
            Util.updataTime(Dom.start, curS);
            Util.updateProgress(Dom.sProgress, curPercent);
            Util.updateBarPos(Dom.songbar, curPercent);
        });

        // 点击一首歌曲
        $(".g-songlist").on("click", ".poster", function (e) {
            e.preventDefault();
            e.stopPropagation();

            // 列表视图相关
            var listType = Dom.navBox.find(".nav.active").index();
            if (listType === 0) {
                Dom.songContainerWrap.find(".m-songlist").eq(1).find(".song").removeClass('active');
            } else if (listType === 1) {
                Dom.songContainerWrap.find(".m-songlist").eq(0).find(".song").removeClass('active');
            }

            $(this).parents(".song").addClass("active").siblings().removeClass("active");
            Dom.index.addClass('hide');

            Dom.playPage.css({
                transform: "translateY(0%)"
            });

            // 音频相关
            if (Dom.audio.src == rootPath + $(this).parents(".song").data("src")) {
                return;
            }
            Dom.audio.src = $(this).parents(".song").data("src");
            Dom.audio.play();
            Dom.btnPlay.removeClass("btn-play").addClass("btn-pause");

            Dom.audio.setAttribute("index", $(this).parents(".song").data("index"));
            index = $(this).parents(".song").data("index");

            Dom.audio.oncanplay = function () {
                duration = this.duration;
                formatDuration = Util.formatTime(duration);
                Dom.end.html(formatDuration);

            };

            // 播放视图相关
            songInfo = {
                songname: $(this).parents(".song").find(".lsongname").text(),
                singer: $(this).parents(".song").find(".lsinger").text(),
                lrcimg: "img/poster/" + $(this).parents(".song").data("index") + "-origin.jpg",
                lyric: Util.getItem("lyric" + $(this).parents(".song").data("index"))
            };
            timeArr = Util.createArrMap(songInfo.lyric).timeArr;
            formatTimeArr = Util.formatLyricTime(timeArr);
            songModelUI = ModelUIFrame();
            songModelUI.updateSongInfo(songInfo);

            lrcMoveIndex = 0;
            lrcHighIndex = 0;
            moveDis = 0;
        });

        // 点击后退按钮
        Dom.btnBack.on("click", function (e) {
            e.preventDefault();
            e.stopPropagation();
            Dom.index.removeClass('hide');
            Dom.playPage.css({
                transform: "translateY(-100%)"
            });
        });

        function saveLoveSong() {
            var cIndex = $(this).parents(".song").data("index"); // 当前点击歌曲索引
            var loveFlag = $(this).find(".icon-love").hasClass('active');
            var lsongArr = Util.getItem('lsonglist') === null ? [] : Util.getItem('lsonglist'); // 记录喜爱歌曲索引的数组

            if (loveFlag) {
                if (lsongArr.length === 0) {
                    return;
                } else {
                    lsongArr = JSON.parse(lsongArr);
                    $.each(lsongArr, function (index, value) {
                        if (value === cIndex) {
                            lsongArr.splice(index, 1);
                            Util.setItem("lsonglist", lsongArr);
                            return;
                        }
                    });
                }
            } else {
                if (lsongArr.length === 0) {
                    lsongArr.push(cIndex);
                } else {
                    lsongArr = JSON.parse(lsongArr);
                    lsongArr.push(cIndex);
                }
                Util.setItem("lsonglist", lsongArr);
            }
        }
        // 点击喜爱按钮
        $(".g-songlist").on("click", ".loveflag", function (e) {
            e.preventDefault();
            e.stopPropagation();

            saveLoveSong.call(this);
            $(this).find(".icon-love").toggleClass('active');
        });

        // 播放或暂停按钮
        Dom.btnControl.on("click", function () {
            if ($(this).hasClass("btn-play")) {
                Dom.audio.play();
                $(this).removeClass('btn-play').addClass('btn-pause');
            } else {
                Dom.audio.pause();
                $(this).removeClass('btn-pause').addClass('btn-play');
            }
        });
        /**
         * @param  {[Number]} listType [0:歌曲列表，1：我的最爱]
         * @param  {[String]} 点击按钮类型 ["prev":上一首 "next":下一首]
         * @param  {[String]} 播放模式
         * @return {[Number]} [返回下一首播放的index]
         */
        function getNextIndex(listType, clickType, playmode) {
            var activeIndex;
            var nextIndex;
            // 单击类型：下一首
            if (clickType === "prev") {
                if (listType === 0) {
                    switch (playmode) {
                        case 0:
                            nextIndex = (index - 1) < 0 ? songNum - 1 : index - 1;
                            break;
                        case 1:
                            nextIndex = Util.makeRandom(index, songNum);
                            break;
                        case 2:
                            nextIndex = index;
                            break;
                    }
                } else if (listType === 1) {
                    activeIndex = Dom.lSongListContainer.find(".song.active").index();
                    switch (playmode) {
                        case 0:
                            nextIndex = (activeIndex - 1) < 0 ? songNum - 1 : activeIndex - 1;
                            break;
                        case 1:
                            nextIndex = Util.makeRandom(activeIndex, songNum);
                            break;
                        case 2:
                            nextIndex = activeIndex;
                            break;
                    }
                }

            } else if (clickType === "next") { // 单击类型：下一首
                if (listType === 0) {
                    switch (playmode) {
                        case 0:
                            nextIndex = (index + 1) > songNum - 1 ? 0 : index + 1;
                            break;
                        case 1:
                            nextIndex = Util.makeRandom(index, songNum);
                            break;
                        case 2:
                            nextIndex = index;
                            break;
                    }
                } else if (listType === 1) {

                    activeIndex = Dom.lSongListContainer.find(".song.active").index();

                    switch (playmode) {
                        case 0:
                            nextIndex = (activeIndex + 1) > songNum - 1 ? 0 : activeIndex + 1;
                            break;
                        case 1:
                            nextIndex = Util.makeRandom(activeIndex, songNum);
                            break;
                        case 2:
                            nextIndex = activeIndex;
                            break;
                    }
                }
            }
            return nextIndex;
        }

        // 上一首
        var src = ""; // 记录歌曲地址变量
        var lrcIndex; // 歌词本地查找索引：歌曲列表中lrcIndex = index；我的最爱中lrcIndex可能和index不相等 
        var listType; // 当前所处列表类型： 0为歌曲列表 1为我的最爱
        Dom.prev.on("click", function () {
            listType = Dom.navBox.find(".nav.active").index();
            index = getNextIndex(listType, "prev", Settings.playmode);

            if (listType === 0) {
                Dom.song.eq(index).addClass("active").siblings().removeClass('active');
                src = Dom.song.eq(index).data("src");
                lrcIndex = Dom.song.eq(index).data("index");
            } else if (listType === 1) {
                Dom.lsong.eq(index).addClass("active").siblings().removeClass('active');
                src = Dom.lsong.eq(index).data("src");
                lrcIndex = Dom.lsong.eq(index).data("index");
            }
            Dom.audio.src = src;
            Dom.audio.play();

            // 播放视图相关
            songInfo = {
                songname: Dom.song.eq(lrcIndex).find(".lsongname").text() || Dom.lsong.eq(index).find(".lsongname").text(), // 当播放的是“歌曲列表”未加载的歌曲时，使用“我的最爱”列表中的歌曲信息
                singer: Dom.song.eq(lrcIndex).find(".lsinger").text() || Dom.lsong.eq(index).find(".lsinger").text(),
                lrcimg: rootPath + "img/poster/" + lrcIndex + "-origin.jpg",
                lyric: Util.getItem("lyric" + lrcIndex)
            };
            lrcMoveIndex = 0;
            lrcHighIndex = 0;
            moveDis = 0;

            timeArr = Util.createArrMap(songInfo.lyric).timeArr;
            formatTimeArr = Util.formatLyricTime(timeArr);
            songModelUI = ModelUIFrame();
            songModelUI.updateSongInfo(songInfo);

        });

        //下一首
        Dom.next.on("click", function () {

            listType = Dom.navBox.find(".nav.active").index();
            index = getNextIndex(listType, "next", Settings.playmode);

            if (listType === 0) {
                Dom.song.eq(index).addClass("active").siblings().removeClass('active');
                src = Dom.song.eq(index).data("src");
                lrcIndex = Dom.song.eq(index).data("index");

            } else if (listType === 1) {
                Dom.lsong.eq(index).addClass("active").siblings().removeClass('active');
                src = Dom.lsong.eq(index).data("src");
                lrcIndex = Dom.lsong.eq(index).data("index");
            }
            Dom.audio.src = src;
            Dom.audio.play();

            // 播放视图相关
            songInfo = {
                songname: Dom.song.eq(lrcIndex).find(".lsongname").text() || Dom.lsong.eq(index).find(".lsongname").text(), // 当播放的是“歌曲列表”未加载的歌曲时，使用“我的最爱”列表中的歌曲信息
                singer: Dom.song.eq(lrcIndex).find(".lsinger").text() || Dom.lsong.eq(index).find(".lsinger").text(),
                lrcimg: rootPath + "img/poster/" + lrcIndex + "-origin.jpg",
                lyric: Util.getItem("lyric" + lrcIndex)
            };
            lrcMoveIndex = 0;
            lrcHighIndex = 0;
            moveDis = 0;

            timeArr = Util.createArrMap(songInfo.lyric).timeArr;
            formatTimeArr = Util.formatLyricTime(timeArr);
            songModelUI = ModelUIFrame();
            songModelUI.updateSongInfo(songInfo);
        });

        //随机播放
        Dom.random.on("click", function () {
            $(this).addClass("active").siblings().removeClass("active");
            Settings.playmode = 1;
        });

        //列表循环
        Dom.menu.on("click", function () {
            $(this).addClass("active").siblings().removeClass("active");
            Settings.playmode = 0;
        });

        //单曲循环播放
        Dom.loop.on("click", function () {
            $(this).addClass("active").siblings().removeClass("active");
            Settings.playmode = 2;
        });

        //歌曲进度条滑块滑动
        Dom.songbar.on("touchstart", function (e) {
            e.preventDefault();
            e.stopPropagation();

            $(Dom.audio).off("timeupdate");
            Dom.audio.pause();

            var totalW = $(Dom.msProgress).width();
            var leftDis = $(Dom.sProgress).offset().left;
            var curS = 0;
            var curPercent = 0;
            var percent = "";
            var touchMove = e.originalEvent.changedTouches[0].clientX;
            var dis = e.originalEvent.changedTouches[0].clientX - leftDis;
            Dom.songbar.on("touchmove", function (e) {
                e.preventDefault();
                e.stopPropagation();
                touchMove = e.originalEvent.targetTouches[0].clientX;
                dis = touchMove - leftDis > totalW ? totalW : touchMove - leftDis;
                dis = touchMove - leftDis < 0 ? 0 : dis;
                percent = Math.floor(dis / totalW * 100) + "%";
                Util.updateProgress(Dom.sProgress, percent);
                Util.updateBarPos(Dom.songbar, percent);

            });
            Dom.songbar.on("touchend", function (e) {
                e.preventDefault();
                e.stopPropagation();

                if (Dom.audio.paused) {
                    Dom.audio.play();
                }

                percent = Math.floor(dis / totalW * 100) + "%";
                Util.updateProgress(Dom.sProgress, percent);
                Util.updateBarPos(Dom.songbar, percent);
                curS = duration * parseInt(percent.replace("%", "")) / 100;
                Dom.audio.currentTime = curS;

                // 播放视图相关
                songModelUI.updateLrcView(curS, formatTimeArr);
                Dom.audio.ontimeupdate = function () {
                    var curS = Dom.audio.currentTime;
                    var curPercent = Util.timeToPercent(curS, duration);

                    // 歌词同步 
                    songModelUI.syncLyric(curS, formatTimeArr);

                    // 更新歌曲时间，进度条
                    Util.updataTime(Dom.start, curS);
                    Util.updateProgress(Dom.sProgress, curPercent);
                    Util.updateBarPos(Dom.songbar, curPercent);
                };

                Dom.songbar.off("touchmove touchend");
            });
        });

        // 歌曲进度条点击
        Dom.msProgress.on("mousedown", function (e) {
            $(Dom.audio).off("timeupdate");

            var totalW = $(Dom.msProgress).width();
            var leftDis = $(Dom.sProgress).offset().left;
            var curS = 0;
            var curPercent = 0;
            var dis = e.pageX - leftDis > totalW ? totalW : e.pageX - leftDis;
            percent = Math.floor(dis / totalW * 100) + "%";

            Dom.msProgress.on("mouseup", function (e) {
                Util.updateProgress(Dom.sProgress, percent);
                Util.updateBarPos(Dom.songbar, percent);
                curS = duration * parseInt(percent.replace("%", "")) / 100;
                Dom.audio.currentTime = curS;

                // 播放视图相关
                songModelUI.updateLrcView(curS, formatTimeArr);
                Dom.audio.ontimeupdate = function () {
                    var curS = Dom.audio.currentTime;
                    var curPercent = Util.timeToPercent(curS, duration);

                    // 歌词同步 
                    songModelUI.syncLyric(curS, formatTimeArr);

                    // 更新歌曲时间，进度条
                    Util.updataTime(Dom.start, curS);
                    Util.updateProgress(Dom.sProgress, curPercent);
                    Util.updateBarPos(Dom.songbar, curPercent);
                };

                Dom.msProgress.off("mouseup");
            });

        });

        //音量控制
        Dom.vbar.on("touchstart", function (e) {
            var totalW = $(Dom.mvProgress).width();
            var leftDis = $(Dom.sProgress).offset().left;
            var percent = "";
            e.preventDefault();
            e.stopPropagation();
            Dom.vbar.on("touchmove", function (e) {
                e.preventDefault();
                e.stopPropagation();
                var touchMove = e.originalEvent.targetTouches[0].clientX;
                var dis = touchMove - leftDis > totalW ? totalW : touchMove - leftDis;
                dis = touchMove - leftDis < 0 ? 0 : dis;
                percent = Math.floor(dis / totalW * 100) + "%";
                Dom.audio.volume = (dis / totalW).toFixed(1);
                Util.updateProgress(Dom.vProgress, percent);
                Util.updateBarPos(Dom.vbar, percent);
            });
            Dom.vbar.on("touchend", function (e) {
                e.preventDefault();
                e.stopPropagation();
                Dom.vbar.off("touchmove touchend");
            });
        });

        // 歌词海报切换
        Dom.lrcbox.on("click", function () {
            $(this).find(".lrc-no").toggleClass("hide");
            $(this).find(".lrc").toggleClass("hide");
        });

        // 歌曲列表向上或向下滑动
        var top = 0;
        Dom.sliderWrap.each(function () {
            $(this).on("scroll", function () {
                var tempTop = $(this).scrollTop();
                if (tempTop - top > 10) { //防止弹性滚动造成的不是预期的效果
                    // 向下
                    Dom.footer.stop(true).animate({
                        bottom: "-100%"
                    }, 1000);
                } else if (tempTop - top < -10) {
                    // 向上
                    Dom.footer.stop(true).animate({
                        bottom: "0%"
                    }, 1000);
                }
                top = tempTop;
            });
        });

        // 列表切换(点击)
        $(".nav").on("click", function () {
            var navIndex = $(this).index();
            songNum = Dom.songContainerWrap.find(".m-songlist").eq(navIndex).find(".song").length;
            // 切换
            $(this).addClass('active').siblings().removeClass('active');
            Dom.songContainerWrap.css({
                "transform": "translateX(" + (-navIndex * 1 / 3) * 100 + "%)"
            });

            // 更新歌曲数据
            Dom.songCount.text(songNum);
        });

        // 点击用户头像
        $(".icon-user").on("click", function () {
            $(".g-user").css({
                transform: "translateX(0%)"
            });
        });

        // 点击用户头像页面
        $(".g-user").on("click", function () {
            $(".g-user").css({
                transform: "translateX(100%)"
            });
        });

        // 阻止默认滚动事件
        $(window).on('scroll', function (e) {
            console.log("window");
            e.preventDefault();
            e.stopPropagation();
        });
        $("body").on('scroll', function (e) {
            e.preventDefault();
            e.stopPropagation();
        });
        $(".index").on('scroll', function (e) {
            e.preventDefault();
            e.stopPropagation();
        });
        $(".g-header").on('scroll', function (e) {
            console.log("g-header");
            e.preventDefault();
            e.stopPropagation();
            var navIndex = Dom.navBox.find(".nav.active").index();
            Dom.sliderWrap.eq(navIndex).trigger('scroll');
        });


    }
    main();

});