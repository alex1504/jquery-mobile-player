# 项目说明
![UI图](http://huzerui.com/blog/img/post/2016-10-30-how-to-make-a-mobile-html5-player.jpg)

项目完成于一年前，那时候刚刚了解前端，jQuery似乎是成为了必会的工具，为了提升实战能力于是做了此案例，由于项目包含的MP3文件较大，github仓库移除了res文件夹，完整项目文件见[码云仓库地址](https://gitee.com/alex1504/jquery-mobile-player)，希望该教程对新人有所启发。

预览地址：请猛击[这里](http://alex1504.gitee.io/jquery-mobile-player)

注意：使用PC浏览最好打开**移动设备模式**，使用移动设备浏览需要关闭无痕浏览模式（否则无法使用本地存储，一般浏览器都是默认不开启），项目需要在**本地服务器**或**线上服务器**运行，以file:///形式的地址打开是无法进行ajax请求的，从而无法看到音乐数据。

# 项目实现的功能及所用知识 #
- 播放器的基础操作，上一首，下一首(顺序播放、随机播放、单曲循环)，播放暂停，滑动时间轴的歌词定位
- 初始handlebar模板渲染音乐列表数据，下拉滚动加载音乐列表数据。
- 歌曲列表可添加喜爱音乐，于下次刷新时更新喜爱音乐列表，基于HTML5本地存储。
- 布局采用rem布局，自适应移动端手机设备。
- iconfont在线图标应用的使用

# 项目目录文件结构 #
- css：存放样式文件
- lib： 存放公共脚本库
- js： 存放项目脚本文件
- img： 存放图片
- fonts： 项目字体文件
- res： 项目音乐资源
- ui：项目ui文件（psd）

# 项目js文件结构 #
```javascript
// ============================配置变量================================
var rootPath = window.location.href.replace(/\/\w+\.\w+/, "/");
var Settings = {
    playmode: 0, //0列表循环，1随机，2为单曲循环
    volume: 0.5, //音量
    initNum: 10, //列表初始化歌曲数
    reqNum: 10 //后续请求歌曲数
};

// ============================工具函数================================
var Util = (function() {
    return {

    }
})()
// ============================Dom选择器================================
var Dom = {
    
}

// ============================全局变量================================
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

// ============================入口函数================================
function main() {
    initUIFrame();
    var initModel = PlayerModel();

    var songListUI = ModelUIFrame(Dom.songListContainer);
    var lsongListUI = ModelUIFrame(Dom.lSongListContainer);
    initModel.getSongList("data/data.json", function(data) {
        // 生成所有歌曲列表
        songListUI.renderList(data, 0, null, function() {
            songListUI.updateList();
        });
        // 生成喜爱歌曲列表
        initModel.getLoveSongArr(function(lSongArr) {
            lsongListUI.renderList(data, 1, lSongArr);
        });
        // 添加动画
        Util.addAnimationDelay(Dom.song);
        // 保存歌词数据
        initModel.saveLyric(data);

    });
    EventHandler();
}
// ============================初始化UI函数================================
function initUIFrame() {

}
// ============================实现数据交互方法================================
function PlayerModel() {
    
}
// ============================模型动态UI模块================================
function ModelUIFrame(container) {
    
}
// ============================事件绑定模块================================
function EventHandler() {
    
}
// 调用入口函数
 main();
 ```

# 功能点详解 #
## Handlebar.js初次渲染及滚动加载 ##
使用前端模板优点是把数据和结构分离出来，代码更清晰。但后来发现handlerbar.js似乎无法在js中示例模板对象，而html中的handlebar在初次进入页面便会被编译了，因此后续添加音乐还是采用传统的拼接字符串的方式，如果你有更优雅的动态加载方式，欢迎讨论交流。

**html:** handlebars模板包含在script标签之中并且type类型为"text/x-handlebars-template"，在初始化页面的时候根据js获取数据植入后就渲染出相应的html。
```html
<script id="sListTpl" type="text/x-handlebars-template">
{{#each this}}
{{#isInitData this @index}}
<li class="song btm-line" data-src={{songSrc}} data-index={{id}}>
    <div class="poster">
        <img src={{poster.thumbnail}}>
    </div>
    <div class="songinfo">
        <h2 class="lsongname">{{songName}}</h2>
        <sub class="lsinger">{{singer}}</sub>
    </div>
    <div class="loveflag">
        <i class="icon icon-love {{#if loveFlag}}active{{/if}}"></i>
    </div>
</li>
{{/isInitData}}
{{/each}}
</script>
<!-- END歌曲列表模块 -->
```
**js:**

```javascript
function renderAllList(data) {
    var preTpl;
    var lsongArr = Util.getItem('lsonglist') === null ? [] : JSON.parse(Util.getItem('lsonglist'));
    // 生成列表
    if (!sListTpl) {
        // 后续动态生成歌曲
        var tpl = "";
        var songIndex = songNum;
        $.each(data, function(index, el) {
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
        $.each(lsongArr, function(index, val) {
            Dom.songListContainer.find(".song").eq(val).find(".icon-love").addClass('active');
        });
    }
}
```

## rem布局自适应方案 ##
大体上指的是html根元素上定义一个字体大小，然后css样式定义时使用rem作为单位，包括margin、paddding、用于绝对定位的单位等等。然后js根据手机设备的屏幕大小，改变根字体的大小，这样整个页面也会跟着相应的缩小或放大。

```javascript
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
    } else if (width == 412) {
        // Nexus 5X
        docEle.style.fontSize = "57px";
    } else if (width == 768) {
        //ipad 
        docEle.style.fontSize = "88px";
    } else {
        docEle.style.fontSize = Math.round(width / 640 * 100) + "px";
    }
}
```
更多详解，请看先前一篇文章《移动端自适应布局解决方案——rem》，您可以猛击[这里](http://huzerui.com/blog/2016/06/16/mobile-rem/)跳转。

## 关于歌词的同步方案实现 ##
目前音乐播放器的歌词同步显示大概有两种，一种是精确到单个文字，一种是精确到单行歌词。本文实现的是第二种。
## 整体实现思路 ##
页面初始化时，请求歌曲数据json（本地json文件模拟），其中歌名、歌手、图片等按需渲染到html中，将歌词存储到localStorage中。此时，F12打开chrome调试器，进入Application-LocalStorage可以看到：
![歌词本地存储](http://huzerui.com/blog/img/post/2016-10-30-lyric-localstorage.jpg)

点击一首歌进入播放页面后，歌词就会从本地存储中读取，此时你会看到生成这样的歌词结构：
![歌词结构](http://huzerui.com/blog/img/post/2016-10-30-lyric-html.jpg)
每一行歌词都将要将歌词时间绑定在data-point上，监听歌曲播放的timeupdate事件，当歌曲的时间(经过取整处理)与当前data-point值相等时，就为当前歌词高亮（相当于给p添加current类名），并且根据当前高亮歌词的index索引将整个歌词盒子向上移动**p标签的高度+margin-top的高度**。

### lrc歌词的结构 ###
来自网易云音乐的歌词数据：
```javascript
[00:14.64]如果不是那镜子\n[00:16.73]不像你不藏秘密\n[00:21.26]我还不肯相信\n[00:23.02]没有你我的笑更美丽\n[00:28.99]那天听你在电话里略带抱歉的关心\n

[00:16.959]摘一颗苹果\n[00:19.800]等你从门前经过\n[00:22.700]送到你的手中帮你解渴\n[00:25.570]像夏天的可乐\n

[00:00.00] 作曲 : 周杰伦\n[00:01.00] 作词 : 周杰伦\n[00:05.620]\n[00:37.980]亲吻你的手\n
```
可以看到**格式 = [时间点] + 要显示的文字 + \n**
这里有两个坑需要注意：
- 有的歌词秒数是精确到**小数点后两位**，**有的是三位**。
- 有的歌词（周杰伦《算什么男人》）格式是 **[时间点]+\n**

### 时间歌词创建映射 ###
首先以\n将歌词字符串分割成以**[时间点]文字**的数组，但由于这样分割之后最后一个元素是空的，所以用**tempArr.splice(-1, 1)**删除最后一个元素。

接下来循环遍历这个临时数组，由于上面提到的秒数精确度的问题，所以判断一下index为9是否为数字，若为数字则将该位数字删除。(采用字符串截取方式，若你对js字符串方法不熟悉，可以猛击[这里](http://huzerui.com/blog/2016/06/14/js-string-method/))

经过这样的处理之后，临时数组的元素格式不再有区别了，此时再进行字符串截取，将截取到的时间点放入timeArr，将截取的歌词放入lyricArr，并以返回保存着这两个变量的对象。
```javascript
function createArrMap(lyric) {
    var timeArr = [],
        lyricArr = [];
    var tempArr = lyric.split("\n");
    tempArr.splice(-1, 1);
    var tempStr = "";
    $(tempArr).each(function(index) {
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
```

### 生成歌词 ###
由于上面歌词格式造成时间点对应的歌词为空，此时如果渲染出一个<p>标签的高度将为0，这会影响歌词向上移动距离的不统一。因此下面作出个判断如果为空，则替换为“--------------”。（为空的时候大多数是歌曲中间停顿或过渡的时候）
```javascript
function renderLyric(songinfo) {
    var arrMap = Util.createArrMap(songinfo.lyric);
    var tpl = "";
    $.each(arrMap.lyricArr, function(index, lyric) {
        var lyricContent = lyric === "" ? "--------------" : lyric;
        tpl += "<p class='' data-point='" + arrMap.timeArr[index] + "'>" + lyricContent + "</p>";
    });
    Dom.lrcwrap.html(tpl);
}
```

### 歌词同步 ###
歌词同步我写在了syncLyric方法中，监听audio元素的timeupdate事件调用。
这个方法接收两个参数，第一个是当前播放歌曲时间（秒），第二个是转化为秒数的时间点数组。
如果当前时间>=时间点，那么高亮当前歌词（以lrcHighIndex）存储，并且lrcHighIndex自增1。
当歌词高亮索引lrcHighIndex>=1即歌词高亮不为第一句时，计算索引并让歌词盒子向上移动。
```javascript
function syncLyric(curS, formatTimeArr) {
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
```

# 后记（于2017-11-9）
时隔两年，回顾当年所走的路，不仅感概前端的变化远快于自己的成长速度，不过庆幸的是自己并没有选错这条路，因为我发现开发不仅已经成为了自己的工作，更是融入了自己的生活，成为生活的一部分；其次，这是开发者最好的时代，我不仅能从互联网挖掘我所有想要深入的知识，也感受者开源社区带给我的魅力，希望自己能从知识的接收者变成知识的传播者，与您共勉。
