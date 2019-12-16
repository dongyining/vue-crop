$(document).ready(function () {
    // 添加钢笔和橡皮擦图形dom
    $('#tools').html('<img src="' + window.webPlayOrigin + '/public/images/ip_rubber.png" class="rubber" alt=""><img src="' + window.webPlayOrigin + '/public/images/pen.png" class="pen" alt="">')
    $('body').css('display', 'block')
    // 初始化阿里云播放器界面
    var player = new Aliplayer({
        id: 'videoPlayer',
        autoplay: false,
        isLive: false,
        playsinline: true,
        width: '100%',
        height: '100%',
        controlBarVisibility: 'always',
        useH5Prism: true,
        useFlashPrism: false,
        preload: true,
        x5_video_position: 'center',
        x5_type: 'h5',
        x5_fullscreen: true,
        x5_orientation: 'landscape',
        source: '',
        cover: 'https://xuehaifile.oss-cn-hangzhou.aliyuncs.com/HTML/WORKCLOUD/imgs/background.jpg',
        skinLayout: [{ name: 'bigPlayButton', align: 'blabs', x: 30, y: 80 },
            { name: 'H5Loading', align: 'cc' },
            {
                name: 'controlBar', align: 'blabs', x: 0, y: 0, children: [{ name: 'progress', align: 'blabs', x: 0, y: 44 },
                    { name: 'playButton', align: 'tl', x: 15, y: 12 },
                    { name: 'fullScreenButton', align: 'tr', x: 10, y: 12 },
                    { name: 'timeDisplay', align: 'tl', x: 10, y: 7 },
                    { name: 'volume', align: 'tr', x: 5, y: 10 }]
            },
            {
                name: 'fullControlBar', align: 'tlabs', x: 0, y: 0, children: [{ name: 'fullTitle', align: 'tl', x: 25, y: 6 },
                    { name: 'fullTimeDisplay', align: 'tr', x: 10, y: 12 },
                    { name: 'fullNormalScreenButton', align: 'tr', x: 24, y: 13 },
                    { name: 'fullZoom', align: 'cc' }]
            }]
    }, function (player) {
        // 初始化三层canvas绘制对象
        var ctx1 = c1.getContext('2d')
        var ctx2 = c2.getContext('2d')
        var ctx3 = c3.getContext('2d')
        var isCWP = 0
        // var insertVideo = 0; //是否为插入视频
        var isKeep = 1// 是否为保持视频连续播放
        var stoptime = 0 // 设置暂停时间
        var insertTime = 0// 设置插入视频时间
        var playerTime = 0// 设置播放器canvas时间
        var commitData = []
        var keepdata = {}
        var timers = [] // 定时器个数
        var imgPosition = ''
        var obj = {} // 图像数组的对象 {x:XX，y:XX}
        var picArr = [] // 图像数组
        var colorArr = []
        var eraserHalf// 橡皮擦半径
        var MAX_PEN_SIZE = 2.5// 最大笔迹宽度
        var MIN_PEN_SIZE = 1// 最小笔迹宽度
        var PAINT_SIZE = 2// 默认笔迹宽度
        var pathsList = []// 存储画线轨迹集合
        var pathInfo = { list: [] }// 存储每根线轨迹
        var list = [] // 画曲线路径 [{x:XX,y:XX},{x:XX,y:XX}]
        var eliminateList = [] // 消除笔画曲线路径 [{x:XX,y:XX},{x:XX,y:XX}]
        var pointsList = []// 橡皮擦集合
        var touchPoint = {}// 橡皮擦触摸点
        var oldPoint = {}// 橡皮擦起始点
        colorArr['clBlue'] = '#00f'
        colorArr['clWhite'] = '#fff'
        colorArr['clRed'] = '#f00'
        colorArr['clTransparent'] = '#00f'
        colorArr['transparent'] = 'rgba(0,0,0,0)'
        var scalePercent = 1 // 缩放百分比
        var onetime// 设置显示隐藏的定时器
        // 截取参数
        function getParam(name, url) {
            var reg = new RegExp('(^|&)' + name + '=([^&]*)(&|$)')
            if (url == undefined) {
                url = window.location.search.substr(1)
            }
            var r = url.match(reg)
            if (r != null) return unescape(r[2])
            return null
        }

        // 如果有返回url 显示关闭
        var webPlayUrl = parent.$('#webPlay').attr('data-url') && parent.$('#webPlay').attr('data-url').split('?')[1]
        if (getParam('backUrl') != null || getParam('backUrl', webPlayUrl) != null) {
            $(' .playHeader .back').css('display', 'inline-block').attr('backurl', getParam('backUrl'))
        }
        var param = getParam('src') == null ? getParam('url') : getParam('src')
        if (param == null) {
            param = getParam('src', webPlayUrl) == null ? getParam('url', webPlayUrl) : getParam('src', webPlayUrl)
        }
        var typeArr = param.split('.')
        // 文件后缀
        var suffix = typeArr[typeArr.length - 1].toUpperCase()
        /**
         * 钢笔或橡皮擦运动
         */
        var rubberImg = $('.rubber')
        var penImg = $('.pen')
        var videoName = $('.videoName')
        $.XHPlay = function () {
            return {
                completeSeekTimer: '', // 定义完成跳转的定时器cgjhfjhfj
                video: $('video'),
                content: $('.content'),
                eliminateTimer: '', // 设置消除笔定时器
                /** 直线起点 **/
                moveDownX: 0,
                moveDownY: 0,
                /** 记录笔记 辅助参数 **/
                prepare: 1, // 开始准备
                deletePathInfoList: [], // 之前的删除笔记记录数组
                currentPathInfoList: [], // 之前的笔记记录数组
                pathInfoList: [], // 所有笔记记录数组
                pathInfo: {}, // 单线条
                obj: {}, // 对象
                /** ***************************/
                init: function () {
                    this.start()
                    this.listener()
                },
                /**
                 * 添加各按钮所需要的监听事件
                 */
                listener: function () {
                    // 点击waitModel 不响应任何事件
                    $('.waitModel').on('click', function (event) {
                        event.stopPropagation()
                    })
                    // 监听空格暂停播放
                    $(document).keypress(function (e) {
                        if (e.keyCode == 32) {
                            if ($('video').attr('src') != undefined) {
                                if ($('video')[0].paused) {
                                    player.play()
                                } else {
                                    player.pause()
                                }
                            }
                        }
                    })
                    // 点击关闭 跳转到之前的页面
                    $(' .playHeader .back').on('click', function () {
                        window.location.href = $(this).attr('backurl')
                    })
                    // 点击ppt全屏 取消冒泡事件
                    $('.content').on('click', '.pptCover', function (event) {
                        event.stopPropagation()
                    })
                    $(window).resize(function () {
                        $.XHPlay.webPlayResize()
                        if (isCWP && (player.getCurrentTime() != '0') && (player.getCurrentTime() != player.getDuration())) {
                            player.pause()
                            // 预防1s内多次拖拽定点
                            clearTimeout($.XHPlay.completeSeekTimer)
                            $.XHPlay.completeSeekTimer = setTimeout(function () {
                                $.XHPlay.drag(player.getCurrentTime())
                            }, 1000)

                        }
                    })
                    // 点击全屏
                    player.on('requestFullScreen', function () {
                        launchIntoFullscreen(document.documentElement) // the whole page
                        $.XHPlay.webPlayResize()
                    })
                    // 退出全屏
                    player.on('cancelFullScreen', function () {
                        $.XHPlay.webPlayResize()
                    })
                    // 点击模板显示头尾
                    $('.content,.prism-controlbar,.prism-big-play-btn').on('click', function () {
                        window.clearTimeout(onetime)
                        if (suffix == 'WAV' || suffix == 'MP3' || suffix == 'AMR' || suffix == 'MP4' || suffix == 'CWP' || suffix == 'XH') { // 如果是doc ppt
                            $('.playHeader').fadeIn()
                            $('.prism-controlbar').fadeIn()
                            onetime = setTimeout(function () {
                                $('.playHeader').fadeOut()
                                $('.prism-controlbar').fadeOut()
                            }, 5000)
                        }
                    })
                    player.on('ready', function () {
                        if (isCWP) {
                            $.XHPlay.pathInfoList = []
                            $.XHPlay.getPathInfoList()// 加载完毕 记录所有笔记
                        }
                    })
                    player.on('play', function () {
                        if (isCWP) {
                            if (insertTime) {
                                $.XHPlay.keepCanvas(insertTime)
                                insertTime = 0
                            } else {
                                if (player.getCurrentTime() == 0 && (stoptime == player.getDuration() || stoptime == 0)) {// 如果是播放完或者刚开始播放
                                    $('#insertImage').html('')
                                    $.XHPlay.clearCanvas(0)
                                    $.XHPlay.keepCanvas(0)
                                } else {
                                    $.XHPlay.keepCanvas(stoptime)
                                }
                            }

                        }
                        setTimeout(function () {
                            $('.prism-big-play-btn').attr('style', 'display:none')
                        }, 100)
                    })
                    // 完成拖拽
                    player.on('seeked', function () {
                        if (isCWP) {
                            player.pause()
                            // 预防1s内多次拖拽定点
                            clearTimeout($.XHPlay.completeSeekTimer)
                            $.XHPlay.completeSeekTimer = setTimeout(function () {
                                $.XHPlay.drag(player.getCurrentTime())
                            }, 1000)
                        }
                    })
                    player.on('pause', function () {
                        if (isCWP) {
                            for (var i = 0; i < timers.length; i++) {
                                window.clearTimeout(timers[i])
                            }
                            stoptime = player.getCurrentTime()
                        }
                    })
                    player.on('ended', function (e) {
                        // 播放完成回调
                        penImg.css('display', 'none')
                        rubberImg.css('display', 'none')
                    })
                    player.on('timeupdate', function (e) {
                    })
                    // 返回cwp
                    $('.playReturn').on('click', function () {
                        $.XHPlay.video.css('display', 'none')
                        player.pause()
                        isCWP = 1
                        isKeep = 1
                        stoptime = insertTime
                        $('.playContent').css('display', 'block')
                        $('.videoName').html('课件播放器 v3.0(全功能版)').prev().css('display', 'none')
                        player.loadByUrl($('#mediaUrl').attr('value'), insertTime)
                        player.seek(insertTime)
                        player.pause()
                        $.XHPlay.drag(insertTime)
                    })
                },
                drag: function (time) {
                    if (isCWP) {
                        isKeep = 0
                        $('.waitModel').css('display', 'inline-block')// 拖拽中不能进行控制栏操作
                        $.XHPlay.currentPathInfoList = $.XHPlay.getCurrentPathInfoList(time * 1000)
                        $.XHPlay.drawLines('draw', function () {
                            $('.waitModel').css('display', 'none')// 拖拽完成可进行控制栏操作
                            isKeep = 1
                            player.play()
                        })
                    }
                },
                start: function () {
                    $.XHPlay.webPlayResize()
                    if (suffix == 'PPT' || suffix == 'PPTX' || suffix == 'DOC' || suffix == 'DOCX') {
                        // 如果是doc ppt
                        $('.prism-big-play-btn,.prism-controlbar>div:not(\'.prism-fullscreen-btn\'),video,.imgContainer').css('display', 'none')
                        $('.prism-player .prism-controlbar').css('height', '48px')
                        $('.prism-fullscreen-btn').attr('style', 'margin-top:13px;float: right;margin-right: 20px;')
                        // var html = "<iframe id='docFrame' src='https://view.officeapps.live.com/op/embed.aspx?src=" + $("#mediaUrl").val() + "&wdAr=1.7777777777777777' width='100%' height='100%'frameborder='0'><\/iframe><div class='pptCover'></div>";
                        var html = '<iframe id=\'docFrame\' src=\'https://view.officeapps.live.com/op/embed.aspx?src=' + $('#mediaUrl').val() + '&wdAr=1.7777777777777777\' width=\'100%\' height=\'100%\'frameborder=\'0\'><\/iframe>'
                        $.XHPlay.content.append(html)
                    } else {
                        if (suffix == 'MP4') {
                            $.XHPlay.video.css('display', 'block')
                            $('video').attr('poster', 'https://xuehaifile.oss-cn-hangzhou.aliyuncs.com/HTML/WORKCLOUD/imgs/background.jpg')
                            // 如果是视频
                            var videoUrl = ($('#mediaUrl').val()).replace('http://', 'https://')
                            player.loadByUrl(videoUrl)
                        } else if (suffix == 'WAV' || suffix == 'MP3' || suffix == 'AMR') {
                            // 如果是音频
                            $.XHPlay.content.append('<img src class="imgContainer" alt=""/>')
                            player.loadByUrl($('#mediaUrl').val())
                            $('.imgContainer').attr('src', window.webPlayOrigin + '/images/music.jpg').css('width', '100%').css('height', '100%')
                            player.on('play', function () {
                                $('.imgContainer').attr('src', window.webPlayOrigin + '/images/music.gif')
                            })
                            player.on('pause', function () {
                                $('.imgContainer').attr('src', window.webPlayOrigin + '/images/music.jpg')
                            })
                        } else if (suffix == 'JPG' || suffix == 'PNG' || suffix == 'JPEG' || suffix == 'GIF') {
                            // 如果是图片
                            $.XHPlay.content.append('<img src class="imgContainer" alt=""/>')
                            $('.prism-big-play-btn,.prism-controlbar>div:not(\'.prism-fullscreen-btn\'),video').css('display', 'none')
                            $('.imgContainer').css('position', 'absolute')
                            var marginTop = 0
                            var marginLeft = 0
                            setTimeout(function () {
                                $.XHPlay.getImageSize($('#mediaUrl').val(), function (w, h) {
                                    if (w <= parseInt($.XHPlay.content.css('width')) && h <= parseInt($.XHPlay.content.css('height'))) {
                                        marginTop = -h / 2 + 'px'
                                        marginLeft = -w / 2 + 'px'
                                        $('.imgContainer').css('top', '50%').css('left', '50%').css('margin-left', marginLeft).css('margin-top', marginTop)
                                    } else {
                                        var scale = w / h
                                        if (scale > parseInt($.XHPlay.content.css('width')) / parseInt($.XHPlay.content.css('height'))) {
                                            marginTop = -(h * parseInt($.XHPlay.content.css('width')) / w) / 2 + 'px'
                                            $('.imgContainer').css('top', '50%').css('margin-top', marginTop)
                                        } else {
                                            marginLeft = -(w * parseInt($.XHPlay.content.css('height')) / h) / 2 + 'px'
                                            $('.imgContainer').css('left', '50%').css('margin-left', marginLeft)
                                        }
                                    }
                                })
                            }, 100)
                            $('.imgContainer').attr('src', $('#mediaUrl').val())
                            // 点击全屏
                            $('.prism-fullscreen-btn').on('click', function () {
                                if (!$(this).hasClass('fullscreen')) {
                                    setTimeout(function () {
                                        $.XHPlay.setImgContainer()
                                    }, 100)
                                }
                            })
                            $(window).resize(function () {
                                $('.imgContainer').css('margin-top', marginTop).css('margin-left', marginLeft)
                            })
                        } else if (suffix == 'CWP' || suffix == 'XH') {
                            isCWP = 1
                            $.XHPlay.video.css('display', 'none')
                            // 数据没有加载完成先隐藏
                            $('.prism-big-play-btn').attr('style', 'display:none;')
                            // 隐藏控制栏
                            $('.prism-controlbar').css('display', 'none')
                            $('.waitModel').css('display', 'inline-block')
                            // 未加载前添加转动
                            $('.prism-hide').addClass('prism-loading')
                            // 如果是cwp
                            $.XHPlay.cwpPlay()
                        } else {
                            alert('不支持的文件格式(' + suffix + ')!')
                        }
                    }
                },
                // 全屏情况下需要计算缩放比控制canvas画布的transform变化
                fullScreen: function () {
                    $('.playHeader').fadeOut()
                    if (suffix == 'PPT' || suffix == 'PPTX' || suffix == 'DOC' || suffix == 'DOCX') { // 如果是doc ppt
                        $('.prism-controlbar').css('display', 'none')
                    }
                    $.XHPlay.video.css('height', '100%').css('padding', '0').css('top', '0')
                    $.XHPlay.content.css('width', $.XHPlay.video.css('width')).css('height', $.XHPlay.video.css('height'))
                    //  设置content
                    $.XHPlay.content.css('top', '0')
                    if (isCWP) {
                        // 计算百分比，放置到工具函数中
                        $('.playHeader').fadeIn()
                        $.XHPlay.content.css('height', parseInt($.XHPlay.video.css('height')) + 'px')
                        $.XHPlay.content.css('top', '0')
                        var w = 1280
                        var h = 800
                        var scale = w / h
                        if (scale > (parseInt($.XHPlay.content.css('width')) / parseInt($.XHPlay.content.css('height')))) {
                            scalePercent = parseInt($.XHPlay.content.css('width')) / 1280
                            $('.playContent').css('transform', 'scale(' + scalePercent + ')').css('transform-origin', '0 0').css('top', '50%').css('margin-top', -(800 * scalePercent) / 2 + 'px').css('left', '0').css('margin-left', '0px')
                        } else {
                            scalePercent = parseInt($.XHPlay.content.css('height')) / 800
                            $('.playContent').css('transform', 'scale(' + scalePercent + ')').css('transform-origin', '0 0').css('left', '50%').css('margin-left', -(1280 * scalePercent) / 2 + 'px').css('top', '0').css('margin-top', '0px')
                        }
                    }
                },
                webPlayResize: function () {
                    $.XHPlay.video.css('height', '400px').css('padding', '0').css('display', 'inline-block')
                    if ($.XHPlay.IsPC()) {
                        $('#videoPlayer').css('height', '500px')
                        if (isCWP) {
                            $('.prism-controlbar').css('display', 'none')
                        } else {
                            $('.prism-controlbar,.prism-fullscreen-btn,.playHeader').css('display', 'block')
                        }
                        $.XHPlay.video.css('top', '56px')
                        $('.content').css('top', '56px')
                        // 设置content（包含canvas ppt jpg mp3）
                        $.XHPlay.content.css('width', '100%').css('height', '400px')
                        if (suffix == 'DOC' || suffix == 'DOCX') {
                            $('#docFrame').attr('height', window.outerHeight + 'px')
                            $('.prism-controlbar').append('<span class=\'textHelp\'>点击全屏查看</span>')
                            $('.content').css('overflow', 'hidden')
                        }
                        // 判断是否Safari浏览器
                        if ($.isSafari()) {
                            $('.prism-fullscreen-btn').css('display', 'none')
                        }
                    } else {
                        $('.area').css('maxWidth', 'none')
                        if ($(window).width() < $(window).height()) {
                            $('body').css('transform', '90deg')
                        }
                        $('.prism-fullscreen-btn').css('display', 'none')
                        $('.area').css('width', '100%')
                        $('#videoPlayer').css('height', $(window).height() + 'px')
                        $.XHPlay.video.css('height', $(window).height() + 'px')
                        // 设置content（包含canvas ppt jpg mp3）
                        $.XHPlay.content.css('width', '100%').css('height', $(window).height() + 'px').css('top', '0px')
                        if (suffix == 'PPT' || suffix == 'PPTX' || suffix == 'DOC' || suffix == 'DOCX' || suffix == 'JPG' || suffix == 'PNG' || suffix == 'JPEG' || suffix == 'GIF') {
                            // 如果是doc ppt
                            $('.playHeader').css('display', 'none')
                        }
                        if (isCWP) {
                            $('.prism-controlbar').css('display', 'none')
                        }
                    }
                    var w = 1280
                    var h = 800
                    var scale = w / h
                    if (scale > (parseInt($.XHPlay.content.css('width')) / parseInt($.XHPlay.content.css('height')))) {
                        scalePercent = parseInt($.XHPlay.content.css('width')) / 1280
                        $('.playContent').css('transform', 'scale(' + scalePercent + ')').css('transform-origin', '0 0').css('top', '50%').css('margin-top', -(800 * scalePercent) / 2 + 'px').css('left', '0').css('margin-left', '0px')
                    } else {
                        scalePercent = parseInt($.XHPlay.content.css('height')) / 800
                        $('.playContent').css('transform', 'scale(' + scalePercent + ')').css('transform-origin', '0 0').css('left', '50%').css('margin-left', -(1280 * scalePercent) / 2 + 'px').css('top', '0').css('margin-top', '0px')
                    }
                    // 设置橡皮擦半径
                    eraserHalf = Math.floor(10 * scalePercent)
                    if ($('#videoPlayer').hasClass('prism-fullscreen') && $.XHPlay.IsPC()) {
                        $.XHPlay.fullScreen()
                    }
                },
                // 判断是否为桌面端浏览器
                IsPC: function () {
                    var userAgentInfo = navigator.userAgent
                    var Agents = ['Android', 'iPhone',
                        'SymbianOS', 'Windows Phone',
                        'iPad', 'iPod'
                    ]
                    var flag = true
                    for (var v = 0; v < Agents.length; v++) {
                        if (userAgentInfo.indexOf(Agents[v]) > 0) {
                            flag = false
                            break
                        }
                    }
                    return flag
                },
                /**
                 * 获取img长宽  $.XHPlay.getImageWidth($("#mediaUrl").val(), function (w, h) {}）；
                 * url imgUrl地址
                 * **/
                getImageSize: function (url, callback) {
                    var img = new Image()
                    img.src = url
                    // 如果图片被缓存，则直接返回缓存数据
                    if (img.complete) {
                        callback(img.width, img.height)
                    } else {
                        // 完全加载完毕的事件
                        img.onload = function () {
                            callback(img.width, img.height)
                        }
                    }
                },
                setImgContainer: function () {
                    // 设置图像全屏与非全屏显示
                    var imgContainer = $('.imgContainer')
                    setTimeout(function () {
                        if (imgContainer.css('margin-top') == '0px') {
                            imgContainer.css('margin-left', '-' + parseInt(imgContainer.css('width')) / 2 + 'px')
                        } else if (imgContainer.css('margin-left') == '0px') {
                            imgContainer.css('margin-top', '-' + parseInt(imgContainer.css('height')) / 2 + 'px')
                        }
                    }, 100)
                },
                cwpPlay: function () {
                    isCWP = 1
                    $('.playContent').css('display', 'block')
                    $.XHPlay.getDataFromServer()
                },
                /**
                 * 获取课件所有数据
                 * 判断后端数据是否已经加载完毕
                 */
                getDataFromServer: function () {
                    var timerTask = setInterval(function () {
                        $.ajax({
                            type: 'GET',
                            url: '/file/exist?md5=' + getParam('md5'),
                            dataType: 'json',
                            async: true,
                            success: function (res) {
                                if (res.code == 200) {
                                    // 清除定时器
                                    clearInterval(timerTask)
                                    // 调用获取笔记方法 TODO
                                    window.commitData = []
                                    var data = res.data
                                    window.data = data

                                    player.loadByUrl(data.audioUrl)
                                    $('#mediaUrl').attr('value', data.audioUrl)
                                    for (var i = 0; i < data.courseImage.picName.length; i++) {
                                        picArr['/' + data.courseImage.picName[i]] = data.courseImage.picUrl[i]
                                    }
                                    // 格式化笔记数据
                                    var arrs = data.handWritingUrl.split(/\n/)
                                    arrs.forEach(function (arr) {
                                        arr = arr.split(/,/)
                                        arr.pop()
                                        window.commitData.push(arr)
                                    })
                                    $.XHPlay.drawBackground()
                                    $('.prism-big-play-btn').attr('style', 'display:block;position:absolute;left:30px;bottom: 80px;')
                                    $('.prism-controlbar').show('slow')
                                    $('.waitModel').css('display', 'none')
                                    $('.prism-hide').removeClass('prism-loading')
                                }
                            }
                        })
                    }, 3000)
                },
                /**
                 * 获取笔记
                 */
                getFileData: function () {
                    var commitData = []
                    $.ajax({
                        type: 'GET',
                        url: window.webPlayOrigin + '/file/getFile/' + $('#fileMD5').val().replace('\"', '').replace('\"', ''),
                        dataType: 'json',
                        async: false,
                        success: function (data) {
                            // status:500 服务器数据还未准备好
                            // status:200 服务器数据可用
                            if (data.status == 200) {

                            }
                        }
                    })
                    // 显示控制按钮和控制栏

                    return commitData
                },
                /**
                 * 底图制作
                 *
                 */
                drawBackground: function () {
                    var baseImageArr = data.baseImage
                    for (var i = 0; i < baseImageArr.length; i++) {
                        var img = new Image()
                        img.src = baseImageArr[i].url
                        var x1 = baseImageArr[i].x1
                        var x2 = baseImageArr[i].x2
                        var y1 = baseImageArr[i].y1
                        var y2 = baseImageArr[i].y2
                        img.style.top = y1 + 'px'
                        img.style.left = x1 + 'px'
                        img.style.width = (x2 - x1) + 'px'
                        img.style.height = (y2 - y1) + 'px'
                        img.onload = function () {
                            var bgHeight = parseInt($('#backgoround').css('height'))
                            if (bgHeight > 3968) {
                                $('.canvasContent').css('height', bgHeight)
                                c1.height = bgHeight
                                c2.height = bgHeight
                                c3.height = bgHeight
                                $('#interface').css('height', bgHeight + 'px')
                                $('#insertImage').css('height', bgHeight + 'px')
                                $('#tools').css('height', bgHeight + 'px')
                            }
                        }
                        $('#backgoround').append(img)
                    }
                    $('.playContent').css('backgroundColor', 'rgb(' + (data.rgb == undefined ? '' : data.rgb) + ')')
                },
                drawTools: function (x, y, tool) {
                    if (tool == 'pen') {
                        penImg.css('display', 'block')
                        rubberImg.css('display', 'none')
                        penImg.css('top', y + 'px').css('left', x + 'px')
                    } else {
                        rubberImg.css('display', 'block')
                        penImg.css('display', 'none')
                        rubberImg.css('top', y + 'px').css('left', x + 'px')
                    }
                },
                /**
                 * 清楚所有绘图
                 */
                clearCanvas: function (pausetime, callback) {
                    // 重置所有绘图
                    ctx1.beginPath()
                    ctx1.clearRect(0, 0, c1.width, c1.height)
                    ctx1.closePath()
                    ctx2.beginPath()
                    ctx2.clearRect(0, 0, c2.width, c2.height)
                    ctx2.closePath()
                    ctx3.beginPath()
                    ctx3.clearRect(0, 0, c3.width, c3.height)
                    ctx3.closePath()
                    list = [] // 画曲线路径 [{x:XX,y:XX,pressure:z},{x:XX,y:XX,pressure:z}]
                    eliminateList = [] // 画曲线路径 [{x:XX,y:XX,pressure:z},{x:XX,y:XX,pressure:z}]
                    obj = {} // 图像数组的对象 {x:XX，y:XX,pressure:z}
                },
                /**
                 * 继续绘图
                 */
                keepCanvas: function (keeptime) {
                    var newData = []
                    if (window.commitData != undefined) {
                        if (keeptime == 0) {
                            newData = window.commitData
                        } else {
                            window.commitData.forEach(function (arr, index) {
                                if (keeptime * 1000 <= arr[13]) {
                                    newData.push(arr)
                                }
                            })
                        }

                    }
                    $.XHPlay.afterGetData(newData, keeptime)
                },
                /**
                 * 在曲线move状态下 删除绘制
                 */
                deleteHasLine: function (newData) {
                    ctx3.beginPath()
                    ctx3.clearRect(0, 0, c3.width, c3.height)
                    ctx3.closePath()
                    for (var i = 0; i < newData.length; i++) {
                        if ((newData[i][0] == 'WM_MOUSEMOVE' || newData[i][0] == 'WM_LBUTTONUP') && (newData[i][8] == '2')) {
                            newData.remove(i)
                            i -= 1
                        } else {
                            return newData
                        }
                    }
                    return newData
                },
                afterGetData: function (newData, keeptime) {
                    clearTimeout($.XHPlay.eliminateTimer)
                    newData = $.XHPlay.deleteHasLine(newData)
                    if (newData && newData.length) {
                        $('#interface').css('left', newData[0][5] + 'px').css('top', -newData[0][6] + 'px')
                        newData.forEach(function (arr, index) {
                            var timer = setTimeout(function () {
                                if (!$.XHPlay.video[0].paused) {
                                    $.XHPlay.stepDraw(arr)
                                    if (isKeep && arr[11] == 'clTransparent') {
                                        $.XHPlay.eliminateTimer = setTimeout(function () {
                                            $.XHPlay.eliminateDraw(arr)
                                        }, 1000)// 消除笔记去除
                                    }
                                }
                            }, (parseFloat(arr[13]) - parseFloat(keeptime) * 1000))
                            timers.push(timer)
                        })
                    }
                    if (insertTime) {
                        player.seek(keeptime)
                        insertTime = 0
                        return false
                    }
                },
                /**
                 * 消除笔操作的方法
                 */
                eliminateDraw: function (arr) {
                    switch (arr[0]) {
                    case 'WM_LBUTTONDOWN':
                        if (arr[8] == '2' || arr[8] == '10') {
                            obj = {
                                x: parseFloat(arr[1]),
                                y: parseFloat(arr[2]),
                                pressure: 4
                            }
                            eliminateList.push(obj)
                        }
                        break
                    case 'WM_MOUSEMOVE':
                        if (arr[8] == '2') {// 曲线
                            obj = {
                                x: parseFloat(arr[1]),
                                y: parseFloat(arr[2]),
                                pressure: 4
                            }
                            eliminateList.push(obj)
                        }

                        break
                    case 'WM_LBUTTONUP':
                        if (arr[8] == '2' || arr[8] == '10') {// 曲线
                            obj = {
                                x: parseFloat(arr[1]),
                                y: parseFloat(arr[2]),
                                pressure: 4
                            }
                            eliminateList.push(obj)
                            if (eliminateList.length > 1) {
                                $.XHPlay.line(eliminateList, arr[8], ctx3, colorArr[arr[11]], 'destination-out')
                            }
                        }
                        eliminateList = []
                        obj = {}
                        break
                    default:
                        break
                    }
                },
                /**
                 * 每步操作的方法
                 */
                stepDraw: function (arr) {
                    playerTime = arr[13] / 1000
                    switch (arr[0]) {
                    case 'WM_VSCROLL':
                        $('#interface').css('left', arr[5] + 'px').css('top', -arr[6] + 'px')
                        break
                    case 'WM_LBUTTONDOWN':
                        if (arr[8] == '2' || arr[8] == '10') {
                            if (arr[8] == '10') {
                                $.XHPlay.moveDownX = arr[1]
                                $.XHPlay.moveDownY = arr[2]
                            }
                            pathInfo = {
                                drawType: arr[8],
                                color: colorArr[arr[11]],
                                list: []
                            }
                            obj = {
                                x: parseFloat(arr[1]),
                                y: parseFloat(arr[2]),
                                pressure: ((arr[24] == undefined) ? 0 : arr[24])
                            }
                            pathInfo.list.push(obj)
                        }
                        else if (arr[8] == '7') {// 橡皮
                            obj = {
                                x: parseFloat(arr[1]),
                                y: parseFloat(arr[2])
                            }
                            pointsList.push(obj)
                            // 初始化的橡皮的点
                            oldPoint = obj
                            $.XHPlay.currentPathInfoList = $.XHPlay.getCurrentPathInfoList(arr[13])
                            deleteRecord(arr[1], arr[2], arr[13])
                        } else {
                            penImg.css('display', 'none')
                            rubberImg.css('display', 'none')
                        }
                        break
                    case 'WM_MOUSEMOVE':
                        // 曲线
                        ctx1.beginPath()
                        ctx3.beginPath()
                        if (arr[8] == '2') {// 曲线
                            obj = {
                                x: parseFloat(arr[1]),
                                y: parseFloat(arr[2]),
                                pressure: ((arr[24] == undefined) ? 0 : arr[24])
                            }
                            pathInfo.list.push(obj)
                            if (isKeep) {
                                if (arr[11] == 'clTransparent') {
                                    ctx3.globalCompositeOperation = 'source-over'
                                    if (pathInfo.list.length > 1) {
                                        ctx2.beginPath()
                                        ctx2.clearRect(0, 0, c2.width, c2.height)
                                        ctx2.closePath()
                                        $.XHPlay.line(pathInfo.list, arr[8], ctx2, colorArr[arr[11]], 'source-over')
                                    }
                                } else {
                                    ctx2.beginPath()
                                    ctx2.clearRect(0, 0, c2.width, c2.height)
                                    ctx2.closePath()
                                    $.XHPlay.line(pathInfo.list, arr[8], ctx2, colorArr[arr[11]], 'source-over')
                                }
                                $.XHPlay.drawTools(arr[1], arr[2], 'pen')
                            }
                        } else if (arr[8] == '7') {// 橡皮
                            obj = {
                                x: parseFloat(arr[1]),
                                y: parseFloat(arr[2])
                            }
                            pointsList.push(obj)
                            $.XHPlay.drawTools(arr[1], arr[2], 'rubber')
                            deleteRecord(arr[1], arr[2], arr[13])
                        } else if (arr[8] == '10') {// 直线
                            if (isKeep) {
                                ctx2.beginPath()
                                ctx2.clearRect(0, 0, c2.width, c2.height)
                                ctx2.moveTo($.XHPlay.moveDownX, $.XHPlay.moveDownY)
                                ctx2.lineCap = 'round'
                                ctx2.lineWidth = $.XHPlay.lineWidth(((arr[24] == undefined) ? 0 : arr[24]))
                                ctx2.strokeStyle = colorArr[arr[11]]
                                ctx2.lineTo(arr[1], arr[2])
                                ctx2.globalCompositeOperation = 'source-over'
                                ctx2.stroke()
                                ctx2.closePath()
                                $.XHPlay.drawTools(arr[1], arr[2], 'pen')
                            }
                        }
                        ctx1.closePath()
                        ctx3.closePath()
                        break
                    case 'WM_LBUTTONUP':
                        ctx2.beginPath()
                        ctx2.clearRect(0, 0, c2.width, c2.height)
                        ctx2.closePath()
                        if ((arr[8] == '2' || arr[8] == '10') && (arr[11] != 'clTransparent')) {
                            if (arr[8] == '10') {// 如果是直线记录最后一个点
                                obj = {
                                    x: parseFloat(arr[1]),
                                    y: parseFloat(arr[2]),
                                    pressure: ((arr[24] == undefined) ? 0 : arr[24])
                                }
                                pathInfo.list.push(obj)
                            }
                            if (isKeep) {
                                if (arr[8] == '10') {
                                    ctx1.beginPath()
                                    ctx1.moveTo($.XHPlay.moveDownX, $.XHPlay.moveDownY)
                                    ctx1.lineCap = 'round'
                                    ctx1.lineWidth = $.XHPlay.lineWidth((arr[24] == undefined) ? 0 : arr[24])
                                    ctx1.strokeStyle = colorArr[arr[11]]
                                    ctx1.lineTo(arr[1], arr[2])
                                    ctx1.globalCompositeOperation = 'source-over'
                                    ctx1.stroke()
                                    ctx1.closePath()
                                } else {
                                    $.XHPlay.line(pathInfo.list, arr[8], ctx1, colorArr[arr[11]], 'source-over')
                                }
                            }
                            var listX = []
                            var listY = [];
                            (pathInfo.list).forEach(function (listItem) {
                                listX.push(listItem.x)
                                listY.push(listItem.y)
                            })
                            pathInfo.left = listX.min()
                            pathInfo.right = listX.max()
                            pathInfo.top = listY.min()
                            pathInfo.bottom = listY.max()
                            pathsList.push(pathInfo)
                            pathInfo = { list: [] }
                            pointsList = []
                            obj = {}
                        } else if ((arr[8] == '2' || arr[8] == '10') && arr[11] == 'clTransparent') {
                            if (isKeep) {
                                if (arr[8] == '10') {
                                    ctx3.beginPath()
                                    ctx3.moveTo($.XHPlay.moveDownX, $.XHPlay.moveDownY)
                                    ctx3.lineCap = 'round'
                                    ctx3.lineWidth = $.XHPlay.lineWidth((arr[24] == undefined) ? 0 : arr[24])
                                    ctx3.strokeStyle = colorArr[arr[11]]
                                    ctx3.lineTo(arr[1], arr[2])
                                    ctx3.globalCompositeOperation = 'source-over'
                                    ctx3.stroke()
                                    ctx3.closePath()
                                } else {
                                    $.XHPlay.line(pathInfo.list, arr[8], ctx3, colorArr[arr[11]], 'source-over')
                                }
                            }
                        }
                        break
                    case 'WM_CANVASBMPLOAD_STATIC':
                    case 'WM_CANVASBMPLOAD':
                    case 'WM_INSERT_STANDARDPICTURES':
                    case 'WM_INSERT_STANDARDPICTURES_STATIC':
                        penImg.css('display', 'none')
                        rubberImg.css('display', 'none')
                        var img = new Image()
                        img.id = arr[21].split('/')[1]
                        img.src = picArr[arr[21]]
                        img.onload = function () {
                            img.style.top = arr[16] + 'px'
                            img.style.left = arr[15] + 'px'
                            img.style.width = (arr[19] - arr[15]) + 'px'
                            img.style.height = (arr[20] - arr[16]) + 'px'
                        }
                        $('#insertImage').append(img)
                        break
                    case 'WM_DELETE_PICTURES':
                        penImg.css('display', 'none')
                        rubberImg.css('display', 'none')
                        $('#' + arr[21].split('/')[1]).remove()
                        break
                    case 'WM_INSERT_STANDARDVIDEO':
                        penImg.css('display', 'none')
                        rubberImg.css('display', 'none')
                        if (isKeep) {
                            $.XHPlay.video.css('display', 'block')
                            $.XHPlay.insertVideo(arr)
                        }
                        break
                    case 'WM_GEOMETRIC_VIEW':// 插入几何图形
                        if (isKeep) {
                            var pointLocation = arr[26].split('#')[3].split('_')
                            $.XHPlay.drawTools(pointLocation[2], pointLocation[3], 'pen')// 几何图形插入时penImg的定位
                            switch (arr[8]) {
                            case '11':
                            case '12':
                            case '13':
                                $.XHPlay.polygon(arr)// 画多边形
                                break
                            case '14':
                                $.XHPlay.ellipse(arr)// 画椭圆
                                break
                            case '15':
                            case '16':
                                $.XHPlay.axis(arr)// 画坐标系和坐标轴
                                break
                            default:
                                break
                            }
                        }
                        break
                    default:
                        break
                    }
                },
                /**
                 * 获取之前所画线条
                 */
                getAlreayPathInfoList: function (time) {
                    var arr = []
                    $.each($.XHPlay.pathInfoList, function (i, data) {
                        if (parseInt(data.time) <= parseInt(time)) {
                            arr.push(data)
                        }
                    })
                    return arr
                },
                /**
                 * 获取之前所画线条
                 */
                getCurrentPathInfoList: function (time) {
                    var alreayPathInfoList = $.XHPlay.getAlreayPathInfoList(time)
                    var returnArr = []
                    if ($.XHPlay.deletePathInfoList.length) {
                        var deleteArr = []
                        $.each($.XHPlay.deletePathInfoList, function (i, data) {
                            if (parseInt(data.deletTime) <= parseInt(time)) {
                                deleteArr.push(data)
                            }
                            if (i == $.XHPlay.deletePathInfoList.length - 1) {
                                var arr = []
                                $.each(alreayPathInfoList, function (m, item) {
                                    var hasSame = 0
                                    $.each(deleteArr, function (k, deleItem) {
                                        if ((item.drawType == deleItem.drawType) && (item.time == deleItem.time)) {
                                            hasSame = 1
                                            return false
                                        }
                                    })
                                    if (!hasSame) {
                                        arr.push(item)
                                    }
                                    if (m == alreayPathInfoList.length - 1) {
                                        returnArr = arr
                                        return false
                                    }
                                })
                            }
                        })
                    } else {
                        returnArr = alreayPathInfoList
                    }
                    return returnArr
                },
                /**
                 * 记录cwp 文件会产生的线条文件
                 */
                getPathInfoList: function () {
                    ctx1.globalCompositeOperation = 'destination-out'
                    pointsList = []
                    $.each(window.commitData, function (i, arr) {
                        switch (arr[0]) {
                        case 'WM_LBUTTONDOWN':
                            if ((arr[8] == '2' || arr[8] == '10') && (arr[11] != 'clTransparent')) {
                                $.XHPlay.pathInfo = {
                                    drawType: arr[8],
                                    color: colorArr[arr[11]],
                                    list: [],
                                    time: arr[13]
                                }
                                $.XHPlay.obj = {
                                    x: parseFloat(arr[1]),
                                    y: parseFloat(arr[2]),
                                    pressure: ((arr[24] == undefined) ? 0 : arr[24])
                                }
                                $.XHPlay.pathInfo.list.push($.XHPlay.obj)
                            } else if (arr[8] == '7') {// 橡皮
                                obj = {
                                    x: parseFloat(arr[1]),
                                    y: parseFloat(arr[2])
                                }
                                pointsList.push(obj)
                                // 初始化的橡皮的点
                                oldPoint = obj
                                $.XHPlay.currentPathInfoList = $.XHPlay.getCurrentPathInfoList(arr[13])
                                deleteRecord(arr[1], arr[2], arr[13])
                            }
                            break
                        case 'WM_MOUSEMOVE':
                            if (arr[8] == '2' && (arr[11] != 'clTransparent')) {// 曲线
                                $.XHPlay.obj = {
                                    x: parseFloat(arr[1]),
                                    y: parseFloat(arr[2]),
                                    pressure: ((arr[24] == undefined) ? 0 : arr[24])
                                }
                                $.XHPlay.pathInfo.list.push($.XHPlay.obj)
                            } else if (arr[8] == '7') {// 橡皮
                                obj = {
                                    x: parseFloat(arr[1]),
                                    y: parseFloat(arr[2])
                                }
                                pointsList.push(obj)
                                deleteRecord(arr[1], arr[2], arr[13])
                            }
                            break
                        case 'WM_LBUTTONUP':
                            if ((arr[8] == '10' || arr[8] == '2') && (arr[11] != 'clTransparent')) {
                                $.XHPlay.obj = {
                                    x: parseFloat(arr[1]),
                                    y: parseFloat(arr[2]),
                                    pressure: ((arr[24] == undefined) ? 0 : arr[24])
                                }
                                $.XHPlay.pathInfo.list.push($.XHPlay.obj)
                                var arrX = []
                                var arrY = [];
                                ($.XHPlay.pathInfo.list).forEach(function (listItem) {
                                    arrX.push(listItem.x)
                                    arrY.push(listItem.y)
                                })
                                $.XHPlay.pathInfo.left = arrX.min()
                                $.XHPlay.pathInfo.right = arrX.max()
                                $.XHPlay.pathInfo.top = arrY.min()
                                $.XHPlay.pathInfo.bottom = arrY.max()
                                $.XHPlay.pathInfoList.push($.XHPlay.pathInfo)
                            }
                            break
                        case 'WM_GEOMETRIC_VIEW':// 插入几何图形
                            switch (arr[8]) {
                            case '11':
                            case '12':
                            case '13':
                                var data = arr[26].split('#')[2].split(';')
                                $.XHPlay.pathInfo = {
                                    drawType: 'polygon',
                                    color: colorArr[arr[11]],
                                    list: [],
                                    time: arr[13],
                                    arr: arr
                                }
                                $.each(data, function (i, item) {
                                    // 记录数据
                                    $.XHPlay.obj = {
                                        x: parseFloat(data[i].split('_')[0]),
                                        y: parseFloat(data[i].split('_')[1]),
                                        pressure: ((arr[24] == undefined) ? 0 : arr[24])
                                    }
                                    $.XHPlay.pathInfo.list.push($.XHPlay.obj)
                                    if (i == data.length - 1) {
                                        var arrX = []
                                        var arrY = [];
                                        ($.XHPlay.pathInfo.list).forEach(function (listItem) {
                                            arrX.push(listItem.x)
                                            arrY.push(listItem.y)
                                        })
                                        $.XHPlay.pathInfo.left = arrX.min()
                                        $.XHPlay.pathInfo.right = arrX.max()
                                        $.XHPlay.pathInfo.top = arrY.min()
                                        $.XHPlay.pathInfo.bottom = arrY.max()
                                        $.XHPlay.pathInfoList.push($.XHPlay.pathInfo)
                                    }
                                })
                                break
                            case '14':
                                var data = arr[26].split('#')[2].split(';')
                                var centerX = (parseFloat(data[0].split('_')[0]) + parseFloat(data[1].split('_')[0])) / 2
                                var centerY = (parseFloat(data[0].split('_')[1]) + parseFloat(data[2].split('_')[1])) / 2
                                var width = (parseFloat(data[1].split('_')[0]) - parseFloat(data[0].split('_')[0])) / 2
                                var height = (parseFloat(data[2].split('_')[1]) - parseFloat(data[0].split('_')[1])) / 2
                                $.XHPlay.pathInfo = {
                                    drawType: 'ellipse',
                                    list: [],
                                    arr: arr,
                                    centerX: centerX,
                                    centerY: centerY,
                                    width: width,
                                    height: height,
                                    left: centerX - width,
                                    right: centerX + width,
                                    top: centerY - height,
                                    bottom: centerY + height,
                                    time: arr[13]
                                }
                                $.XHPlay.pathInfoList.push($.XHPlay.pathInfo)
                                break
                            case '15':
                            case '16':
                                var data = arr[26].split('#')[2].split(';')
                                $.XHPlay.pathInfo = {
                                    drawType: 'axis',
                                    color: colorArr[arr[11]],
                                    list: [],
                                    arr: arr,
                                    time: arr[13]
                                }
                                if (data.length == 3) {
                                    // 画横向坐标轴
                                    var centerX = parseFloat(data[2].split('_')[0])
                                    var centerY = parseFloat(data[2].split('_')[1])
                                    var leftX = parseFloat(data[0].split('_')[0])
                                    var leftY = parseFloat(data[0].split('_')[1])
                                    var rightX = parseFloat(data[1].split('_')[0])
                                    var rightY = parseFloat(data[1].split('_')[1])
                                    $.XHPlay.drawAxisX(ctx1, centerX, centerY, leftX, leftY, 1)
                                    $.XHPlay.drawAxisX(ctx1, centerX, centerY, rightX, rightY, 1)
                                } else {
                                    // 画十字坐标轴
                                    var centerX = parseFloat(data[4].split('_')[0])
                                    var centerY = parseFloat(data[4].split('_')[1])
                                    var leftX = parseFloat(data[3].split('_')[0])
                                    var leftY = parseFloat(data[3].split('_')[1])
                                    var topX = parseFloat(data[0].split('_')[0])
                                    var topY = parseFloat(data[0].split('_')[1])
                                    var rightX = parseFloat(data[1].split('_')[0])
                                    var rightY = parseFloat(data[1].split('_')[1])
                                    var bottomX = parseFloat(data[2].split('_')[0])
                                    var bottomY = parseFloat(data[2].split('_')[1])
                                    $.XHPlay.drawAxisX(ctx1, centerX, centerY, leftX, leftY, 1)
                                    $.XHPlay.drawAxisX(ctx1, centerX, centerY, rightX, rightY, 1)
                                    $.XHPlay.drawAxisY(ctx1, centerX, centerY, topX, topY, 1)
                                    $.XHPlay.drawAxisY(ctx1, centerX, centerY, bottomX, bottomY, 1)
                                }
                                var arrX = []
                                var arrY = [];
                                ($.XHPlay.pathInfo.list).forEach(function (listItem) {
                                    arrX.push(listItem.x)
                                    arrY.push(listItem.y)
                                })
                                $.XHPlay.pathInfo.left = arrX.min()
                                $.XHPlay.pathInfo.right = arrX.max()
                                $.XHPlay.pathInfo.top = arrY.min()
                                $.XHPlay.pathInfo.bottom = arrY.max()
                                $.XHPlay.pathInfoList.push($.XHPlay.pathInfo)
                                break
                            default:
                                break
                            }
                            break
                        default:
                            break
                        }
                        if (i == window.commitData.length - 1) {
                            $.XHPlay.prepare = 0// 所有数据加载完成
                            ctx1.beginPath()
                            ctx1.clearRect(0, 0, c1.width, c1.height)
                            ctx1.closePath()
                            ctx2.beginPath()
                            ctx2.clearRect(0, 0, c2.width, c2.height)
                            ctx2.closePath()
                            ctx3.beginPath()
                            ctx3.clearRect(0, 0, c3.width, c3.height)
                            ctx3.closePath()
                        }
                    })
                },
                /**
                 * 计算lineWidth
                 */
                lineWidth: function (pressure) {
                    var penSize
                    if (pressure == undefined || parseFloat(pressure) <= 0 || (JSON.stringify(pressure).split('E').length > 1)) {
                        penSize = PAINT_SIZE
                    } else {
                        penSize = (MIN_PEN_SIZE + parseFloat(pressure) * (MAX_PEN_SIZE - MIN_PEN_SIZE)).toFixed(2)
                    }
                    return penSize
                },
                /**
                 *根据已知点获取第i个控制点的坐标
                 *param ps    已知曲线将经过的坐标点
                 *param i    第i个坐标点
                 *param a,b    可以自定义的正数
                 **/
                getCtrlPoint: function (ps, i, a, b) {
                    if (!a || !b) {
                        a = 0.25
                        b = 0.25
                    }
                    // 处理两种极端情形
                    if (i < 1) {
                        var pAx = ps[0].x + (ps[1].x - ps[0].x) * a
                        var pAy = ps[0].y + (ps[1].y - ps[0].y) * a
                    } else {
                        var pAx = ps[i].x + (ps[i + 1].x - ps[i - 1].x) * a
                        var pAy = ps[i].y + (ps[i + 1].y - ps[i - 1].y) * a
                    }
                    if (i > ps.length - 3) {
                        var last = ps.length - 1
                        var pBx = ps[last].x - (ps[last].x - ps[last - 1].x) * b
                        var pBy = ps[last].y - (ps[last].y - ps[last - 1].y) * b
                    } else {
                        var pBx = ps[i + 1].x - (ps[i + 2].x - ps[i].x) * b
                        var pBy = ps[i + 1].y - (ps[i + 2].y - ps[i].y) * b
                    }
                    return {
                        pA: { x: pAx, y: pAy },
                        pB: { x: pBx, y: pBy }
                    }
                },
                /**
                 * 画线条
                 * point:点组合 point=[{x:0,y:380,pressure:0.6},{x:100,y:430,pressure:0.5},{x:200,y:280,pressure:1}]
                 * drawType:2 曲线 10 直线
                 * ctx:canvas画板
                 * color:线条颜色
                 * globalCompositeOperation:清楚或者画图 destination-out source-over
                 */
                line: function (point, drawType, ctx, color, globalCompositeOperation) {
                    ctx.strokeStyle = color
                    ctx.lineCap = 'round'
                    ctx.globalCompositeOperation = globalCompositeOperation
                    var points = []
                    for (var i = 0; i < point.length; i++) {
                        if (point[i].pressure == undefined) {
                            break
                        } else {
                            points.push(point[i])
                        }
                    }
                    if (drawType == '10') {
                        ctx.beginPath()
                        ctx.moveTo(points[0].x, points[0].y)
                        ctx.lineTo(points[1].x, points[1].y)
                        ctx.lineWidth = $.XHPlay.lineWidth(points[0].pressure)
                        ctx.stroke()
                        ctx.closePath()
                    } else if (drawType == '2') {
                        for (var i = 0; i < points.length; i++) {
                            if (i == 0) {
                                ctx.beginPath()
                                ctx.moveTo(points[i].x, points[i].y)
                            } else {// 注意是从1开始
                                if (globalCompositeOperation == 'destination-out') {
                                    ctx.lineWidth = 4
                                } else {
                                    ctx.lineWidth = $.XHPlay.lineWidth(points[i].pressure)
                                }
                                var ctrlP = $.XHPlay.getCtrlPoint(points, i - 1)
                                ctx.bezierCurveTo(ctrlP.pA.x, ctrlP.pA.y, ctrlP.pB.x, ctrlP.pB.y, points[i].x, points[i].y)
                                ctx.stroke()
                                ctx.closePath()
                                ctx.beginPath()
                                ctx.moveTo(points[i].x, points[i].y)
                            }
                        }
                    }
                }
                ,
                /**
                 * 画多边形
                 */
                polygon: function (arr, isdestination) {
                    var data = arr[26].split('#')[2].split(';')
                    ctx1.beginPath()
                    ctx1.lineCap = 'round'
                    if (isdestination) {
                        ctx1.lineWidth = 4
                        ctx1.globalCompositeOperation = 'destination-out'
                    } else {
                        ctx1.lineWidth = $.XHPlay.lineWidth(arr[24])
                        ctx1.globalCompositeOperation = 'source-over'
                    }
                    ctx1.strokeStyle = colorArr[arr[11]]
                    $.each(data, function (i, item) {
                        if (i == 0) {
                            ctx1.moveTo(parseFloat(item.split('_')[0]), parseFloat(item.split('_')[1]))
                        } else {
                            ctx1.lineTo(parseFloat(item.split('_')[0]), parseFloat(item.split('_')[1]))
                        }
                        if (i == data.length - 1) {
                            ctx1.lineTo(parseFloat(data[0].split('_')[0]), parseFloat(data[0].split('_')[1]))
                            ctx1.stroke()
                            ctx1.closePath()
                        }
                    })
                },
                /**
                 * 画椭圆
                 */
                ellipse: function (arr, isdestination) {
                    var data = arr[26].split('#')[2].split(';')
                    var centerX = (parseFloat(data[0].split('_')[0]) + parseFloat(data[1].split('_')[0])) / 2
                    var centerY = (parseFloat(data[0].split('_')[1]) + parseFloat(data[2].split('_')[1])) / 2
                    var width = (parseFloat(data[1].split('_')[0]) - parseFloat(data[0].split('_')[0])) / 2
                    var height = (parseFloat(data[2].split('_')[1]) - parseFloat(data[0].split('_')[1])) / 2
                    ctx1.beginPath()
                    if (isdestination) {
                        ctx1.lineWidth = 4
                        ctx1.globalCompositeOperation = 'destination-out'
                    } else {
                        ctx1.lineWidth = $.XHPlay.lineWidth(arr[24])
                        ctx1.globalCompositeOperation = 'source-over'
                    }
                    ctx1.lineCap = 'round'
                    ctx1.strokeStyle = colorArr[arr[11]]
                    ctx1.ellipse(centerX, centerY, width, height, 0, 0, 2 * Math.PI, true)
                    ctx1.stroke()
                    ctx1.closePath()
                }
                ,
                /**
                 * 画坐标轴
                 */
                axis: function (arr, isdestination) {
                    ctx1.lineCap = 'round'
                    if (isdestination) {
                        ctx1.lineWidth = 4
                        ctx1.globalCompositeOperation = 'destination-out'
                    } else {
                        ctx1.lineWidth = $.XHPlay.lineWidth(arr[24])
                        ctx1.globalCompositeOperation = 'source-over'
                    }
                    ctx1.strokeStyle = colorArr[arr[11]]
                    ctx1.fillStyle = colorArr[arr[11]]
                    var data = arr[26].split('#')[2].split(';')
                    if (data.length == 3) {
                        // 画横向坐标轴
                        var centerX = parseFloat(data[2].split('_')[0])
                        var centerY = parseFloat(data[2].split('_')[1])
                        var leftX = parseFloat(data[0].split('_')[0])
                        var leftY = parseFloat(data[0].split('_')[1])
                        var rightX = parseFloat(data[1].split('_')[0])
                        var rightY = parseFloat(data[1].split('_')[1])
                        $.XHPlay.drawAxisCenter(ctx1, centerX, centerY)// 画中心点
                        $.XHPlay.drawAxisX(ctx1, centerX, centerY, leftX, leftY)
                        $.XHPlay.drawAxisX(ctx1, centerX, centerY, rightX, rightY)
                    } else {
                        // 画十字坐标轴
                        var centerX = parseFloat(data[4].split('_')[0])
                        var centerY = parseFloat(data[4].split('_')[1])
                        var leftX = parseFloat(data[3].split('_')[0])
                        var leftY = parseFloat(data[3].split('_')[1])
                        var topX = parseFloat(data[0].split('_')[0])
                        var topY = parseFloat(data[0].split('_')[1])
                        var rightX = parseFloat(data[1].split('_')[0])
                        var rightY = parseFloat(data[1].split('_')[1])
                        var bottomX = parseFloat(data[2].split('_')[0])
                        var bottomY = parseFloat(data[2].split('_')[1])
                        $.XHPlay.drawAxisCenter(ctx1, centerX, centerY)// 画中心点
                        $.XHPlay.drawAxisX(ctx1, centerX, centerY, leftX, leftY)
                        $.XHPlay.drawAxisX(ctx1, centerX, centerY, rightX, rightY)
                        $.XHPlay.drawAxisY(ctx1, centerX, centerY, topX, topY)
                        $.XHPlay.drawAxisY(ctx1, centerX, centerY, bottomX, bottomY)
                    }
                }
                ,
                /**
                 * 笛卡尔坐标轴x轴
                 * ctx:canvas
                 * x1 y1:起始位置
                 * x2 y2:最终位置
                 */
                drawAxisX: function (ctx, x1, y1, x2, y2, savePath) {
                    // 画轴
                    ctx.beginPath()
                    if (savePath) {
                        // 记录数据
                        $.XHPlay.obj = {
                            x: x1,
                            y: y1,
                            pressure: 0
                        }
                        $.XHPlay.pathInfo.list.push($.XHPlay.obj)
                        $.XHPlay.obj = {
                            x: x2,
                            y: y2,
                            pressure: 0
                        }
                        $.XHPlay.pathInfo.list.push($.XHPlay.obj)
                    }
                    ctx.moveTo(x1, y1)
                    ctx.lineTo(x2, y2)
                    ctx.stroke()
                    ctx.closePath()
                    // 画箭头
                    if (x2 > x1) {
                        ctx.beginPath()
                        ctx.moveTo(x2 - Math.cos($.XHPlay.getRad(15)) * 10, Math.sin($.XHPlay.getRad(15)) * 10 + y1)
                        ctx.lineTo(x2, y1)
                        ctx.lineTo(x2 - Math.cos($.XHPlay.getRad(15)) * 10, -Math.sin($.XHPlay.getRad(15)) * 10 + y1)
                        if (savePath) {
                            // 记录数据
                            $.XHPlay.obj = {
                                x: x2 - Math.cos($.XHPlay.getRad(15)) * 10,
                                y: Math.sin($.XHPlay.getRad(15)) * 10 + y1,
                                pressure: 0
                            }
                            $.XHPlay.pathInfo.list.push($.XHPlay.obj)
                            $.XHPlay.obj = {
                                x: x2,
                                y: y1,
                                pressure: 0
                            }
                            $.XHPlay.pathInfo.list.push($.XHPlay.obj)
                            $.XHPlay.obj = {
                                x: x2 - Math.cos($.XHPlay.getRad(15)) * 10,
                                y: -Math.sin($.XHPlay.getRad(15)) * 10 + y1,
                                pressure: 0
                            }
                            $.XHPlay.pathInfo.list.push($.XHPlay.obj)
                        }
                        ctx.stroke()
                        ctx.closePath()
                    }
                    // 画刻度
                    var x, y
                    y = -4
                    if (x2 > x1) {
                        for (x = x1; x < x2; x += 50) {
                            ctx.beginPath()
                            ctx.moveTo(x, y1)
                            ctx.lineTo(x, y + y1)
                            if (savePath) {
                                // 记录数据
                                $.XHPlay.obj = {
                                    x: x,
                                    y: y1,
                                    pressure: 0
                                }
                                $.XHPlay.pathInfo.list.push($.XHPlay.obj)
                                $.XHPlay.obj = {
                                    x: x,
                                    y: y + y1,
                                    pressure: 0
                                }
                                $.XHPlay.pathInfo.list.push($.XHPlay.obj)
                            }
                            ctx.stroke()
                            ctx.closePath()
                        }
                    } else {
                        for (x = x1; x > x2; x -= 50) {
                            ctx.beginPath()
                            ctx.moveTo(x, y1)
                            ctx.lineTo(x, y + y1)
                            if (savePath) {
                                // 记录数据
                                $.XHPlay.obj = {
                                    x: x,
                                    y: y1,
                                    pressure: 0
                                }
                                $.XHPlay.pathInfo.list.push($.XHPlay.obj)
                                $.XHPlay.obj = {
                                    x: x,
                                    y: y + y1,
                                    pressure: 0
                                }
                                $.XHPlay.pathInfo.list.push($.XHPlay.obj)
                            }
                            ctx.stroke()
                            ctx.closePath()
                        }
                    }
                }
                ,
                /**
                 * 笛卡尔坐标轴中心点绘制
                 * x y:圆心
                 */
                drawAxisCenter: function (ctx, x, y) {
                    // 画轴
                    ctx.beginPath()
                    ctx.ellipse(x, y, 4, 4, 0, 0, 2 * Math.PI, true)// radiusX:x方向上半径,radiusY：x方向上半径,0.5:rotation：旋转角度
                    ctx.fill()
                    ctx.closePath()
                },
                /**
                 * 笛卡尔坐标轴y轴
                 *  ctx:canvas
                 * x1 y1:起始位置
                 * x2 y2:最终位置
                 */
                drawAxisY: function (ctx, x1, y1, x2, y2, savePath) {
                    // 画轴
                    ctx.beginPath()
                    ctx.moveTo(x1, y1)
                    ctx.lineTo(x2, y2)
                    if (savePath) {
                        // 记录数据
                        $.XHPlay.obj = {
                            x: x1,
                            y: y1,
                            pressure: 0
                        }
                        $.XHPlay.pathInfo.list.push($.XHPlay.obj)
                        $.XHPlay.obj = {
                            x: x2,
                            y: y2,
                            pressure: 2
                        }
                        $.XHPlay.pathInfo.list.push($.XHPlay.obj)
                    }
                    ctx.stroke()
                    ctx.closePath()
                    // 画箭头
                    if (y2 < y1) {
                        ctx.beginPath()
                        ctx.moveTo(Math.sin($.XHPlay.getRad(165)) * 10 + x1, -Math.cos($.XHPlay.getRad(165)) * 10 + y2)
                        ctx.lineTo(x1, y2)
                        ctx.lineTo(-Math.sin($.XHPlay.getRad(165)) * 10 + x1, -Math.cos($.XHPlay.getRad(165)) * 10 + y2)
                        if (savePath) {
                            // 记录数据
                            $.XHPlay.obj = {
                                x: Math.sin($.XHPlay.getRad(165)) * 10 + x1,
                                y: -Math.cos($.XHPlay.getRad(165)) * 10 + y2,
                                pressure: 0
                            }
                            $.XHPlay.pathInfo.list.push($.XHPlay.obj)
                            $.XHPlay.obj = {
                                x: x1,
                                y: y2,
                                pressure: 0
                            }
                            $.XHPlay.pathInfo.list.push($.XHPlay.obj)
                            $.XHPlay.obj = {
                                x: -Math.sin($.XHPlay.getRad(165)) * 10 + x1,
                                y: -Math.cos($.XHPlay.getRad(165)) * 10 + y2,
                                pressure: 0
                            }
                            $.XHPlay.pathInfo.list.push($.XHPlay.obj)
                        }
                        ctx.stroke()
                        ctx.closePath()
                    }

                    // 画刻度
                    var x, y
                    x = 4
                    if (y2 > y1) {
                        for (y = y1; y < y2; y += 50) {
                            ctx.beginPath()
                            ctx.moveTo(x1 + x, y)
                            ctx.lineTo(x1, y)
                            if (savePath) {
                                // 记录数据
                                $.XHPlay.obj = {
                                    x: x1 + x,
                                    y: y,
                                    pressure: 0
                                }
                                $.XHPlay.pathInfo.list.push($.XHPlay.obj)
                                $.XHPlay.obj = {
                                    x: x1,
                                    y: y,
                                    pressure: 0
                                }
                                $.XHPlay.pathInfo.list.push($.XHPlay.obj)
                            }
                            ctx.stroke()
                            ctx.closePath()
                        }
                    } else {
                        for (y = y1; y > y2; y -= 50) {
                            ctx.beginPath()
                            ctx.moveTo(x1 + x, y)
                            ctx.lineTo(x1, y)
                            if (savePath) {
                                // 记录数据
                                $.XHPlay.obj = {
                                    x: x1 + x,
                                    y: y,
                                    pressure: 0
                                }
                                $.XHPlay.pathInfo.list.push($.XHPlay.obj)
                                $.XHPlay.obj = {
                                    x: x1,
                                    y: y,
                                    pressure: 0
                                }
                                $.XHPlay.pathInfo.list.push($.XHPlay.obj)
                            }
                            ctx.stroke()
                            ctx.closePath()
                        }
                    }
                },
                /**
                 * 箭头角度
                 */
                getRad: function (degree) {
                    return degree / 180 * Math.PI
                },
                /**
                 * 插入视频操作
                 */
                insertVideo: function (arr) {
                    player.pause()
                    isCWP = 0
                    for (var i = 0; i < timers.length; i++) {
                        window.clearTimeout(timers[i])
                    }
                    insertTime = parseInt(arr[13] / 1000) + 1
                    $('.videoName').html(arr[23]).prev().css('display', 'inline-block')
                    $('.playContent').css('display', 'none')
                    var videoUrl = arr[21].replace('http://', 'https://')
                    player.loadByUrl(videoUrl)
                    player.play()
                },
                /**
                 * 画现在的笔记
                 */
                drawLines: function (index, callback, time) {
                    if (index != 'draw') {
                        if ($.XHPlay.prepare) {
                            var arr = $.XHPlay.currentPathInfoList[index]
                            arr.deletTime = time
                            $.XHPlay.deletePathInfoList.push(arr)
                        }
                        $.XHPlay.currentPathInfoList.remove(index)
                    }
                    ctx1.beginPath()
                    ctx1.clearRect(0, 0, c1.width, c1.height)
                    ctx1.closePath()
                    ctx2.beginPath()
                    ctx2.clearRect(0, 0, c2.width, c2.height)
                    ctx2.closePath()
                    ctx3.beginPath()
                    ctx3.clearRect(0, 0, c3.width, c3.height)
                    ctx3.closePath()
                    list = [] // 画曲线路径 [{x:XX,y:XX,pressure:z},{x:XX,y:XX,pressure:z}]
                    eliminateList = [] // 画曲线路径 [{x:XX,y:XX,pressure:z},{x:XX,y:XX,pressure:z}]
                    obj = {} // 图像数组的对象 {x:XX，y:XX,pressure:z}
                    if ($.XHPlay.currentPathInfoList.length) {
                        $.each($.XHPlay.currentPathInfoList, function (i, data) {
                            switch (data.drawType) {
                            case 'ellipse':
                                $.XHPlay.ellipse(data.arr)
                                break
                            case 'axis':
                                $.XHPlay.axis(data.arr)
                                break
                            case 'polygon':
                                $.XHPlay.polygon(data.arr)
                                break
                            case '10':
                            case '2':
                                $.XHPlay.line(data.list, data.drawType, ctx1, data.color, 'source-over')
                                break
                            default:
                                break
                            }
                            if (i == $.XHPlay.currentPathInfoList.length - 1) {
                                callback && callback()
                            }
                        })
                    } else {
                        callback && callback()
                    }

                }
            }
        }()
        var userAgent = navigator.userAgent.toLowerCase(), uaMatch
        window.browser = {}

        /**
         * 判断是否为ie
         */
        function isIE() {
            return ('ActiveXObject' in window)
        }

        /**
         * 判断是否为谷歌浏览器
         */
        if (!uaMatch) {
            uaMatch = userAgent.match(/chrome\/([\d.]+)/)
            if (uaMatch != null) {
                window.browser['name'] = 'chrome'
                window.browser['version'] = uaMatch[1]
            }
        }
        /**
         * 判断是否为火狐浏览器
         */
        if (!uaMatch) {
            uaMatch = userAgent.match(/firefox\/([\d.]+)/)
            if (uaMatch != null) {
                window.browser['name'] = 'firefox'
                window.browser['version'] = uaMatch[1]
            }
        }
        /**
         * 判断是否为opera浏览器
         */
        if (!uaMatch) {
            uaMatch = userAgent.match(/opera.([\d.]+)/)
            if (uaMatch != null) {
                window.browser['name'] = 'opera'
                window.browser['version'] = uaMatch[1]
            }
        }
        /**
         * 判断是否为Safari浏览器
         */
        if (!uaMatch) {
            uaMatch = userAgent.match(/safari\/([\d.]+)/)
            if (uaMatch != null) {
                window.browser['name'] = 'safari'
                window.browser['version'] = uaMatch[1]
            }
        }
        /**
         * 最后判断是否为IE
         */
        if (!uaMatch) {
            if (userAgent.match(/msie ([\d.]+)/) != null) {
                uaMatch = userAgent.match(/msie ([\d.]+)/)
                window.browser['name'] = 'ie'
                window.browser['version'] = uaMatch[1]
            } else {
                /**
                 * IE10
                 */
                if (isIE() && !!document.attachEvent && (function () {
                    'use strict'
                    return !this
                }())) {
                    window.browser['name'] = 'ie'
                    window.browser['version'] = '10'
                }
                /**
                 * IE11
                 */
                if (isIE() && !document.attachEvent) {
                    window.browser['name'] = 'ie'
                    window.browser['version'] = '11'
                }
            }
        }

        /**
         * 注册判断方法
         */
        if (!$.isIE) {
            $.extend({
                isIE: function () {
                    return (window.browser.name == 'ie')
                }
            })
        }
        if (!$.isChrome) {
            $.extend({
                isChrome: function () {
                    return (window.browser.name == 'chrome')
                }
            })
        }
        if (!$.isFirefox) {
            $.extend({
                isFirefox: function () {
                    return (window.browser.name == 'firefox')
                }
            })
        }
        if (!$.isOpera) {
            $.extend({
                isOpera: function () {
                    return (window.browser.name == 'opera')
                }
            })
        }
        if (!$.isSafari) {
            $.extend({
                isSafari: function () {
                    return (window.browser.name == 'safari')
                }
            })
        }
        // 数组删除
        Array.prototype.remove = function (from, to) {
            var rest = this.slice((to || from) + 1 || this.length)
            this.length = from < 0 ? this.length + from : from
            return this.push.apply(this, rest)
        }
        // 数组最大值
        Array.prototype.max = function () {
            return Math.max.apply({}, this)
        }
        // 数组最小值
        Array.prototype.min = function () {
            return Math.min.apply({}, this)
        }

        function checkDeletePoint(startPoint, endPoint, touchX, touchY) {
            var startX = startPoint.x
            var startY = startPoint.y
            var endX = endPoint.x
            var endY = endPoint.y
            var minX = Math.min(startX, endX)
            var minY = Math.min(startY, endY)
            var maxX = Math.max(startX, endX)
            var maxY = Math.max(startY, endY)
            touchPoint = { x: touchX, y: touchY }
            // 检查两点在不在橡皮范围内
            if (checkDelete(endX, endY, touchX, touchY)) {
                return true
            }
            /* 检查两点形成的线段会不会与橡皮轨迹相交 ,这一步检查不能放在下一步之后，会遗露 */
            if (intersect1(startPoint, endPoint, oldPoint, touchPoint)) {
                return true
            }
            // 检查两点形成的线段会不会与橡皮范围相交
            if (touchX + eraserHalf < minX || touchX - eraserHalf > maxX
                || touchY + eraserHalf < minY || touchY - eraserHalf > maxY) {
                return false
            }
            var distance = pointToLine(startX, startY, endX, endY, touchX, touchY)
            return distance <= eraserHalf
        }

        // 检查点有没有在橡皮范围内
        function checkDelete(x, y, touchX, touchY) {
            return Math.pow(touchY - y, 2) + Math.pow(touchX - x, 2) <= Math.pow(eraserHalf, 2)
        }

        /**
         * aa, bb为一条线段两端点 cc, dd为另一条线段的两端点 相交返回true, 不相交返回false
         */
        function intersect1(aa, bb, cc, dd) {
            return Math.max(aa.x, bb.x) >= Math.min(cc.x, dd.x) &&
                Math.max(aa.y, bb.y) >= Math.min(cc.y, dd.y) &&
                Math.max(cc.x, dd.x) >= Math.min(aa.x, bb.x) &&
                Math.max(cc.y, dd.y) >= Math.min(aa.y, bb.y) &&
                mult(cc, bb, aa) * mult(bb, dd, aa) >= 0 &&
                mult(aa, dd, cc) * mult(dd, bb, cc) >= 0
        }

        /**
         * 叉积
         */
        function mult(a, b, c) {
            return (a.x - c.x) * (b.y - c.y) - (b.x - c.x) * (a.y - c.y)
        }

        /**
         * 计算点到线段所在直线的距离
         */
        function pointToLine(x1, y1, x2, y2, x0, y0) {
            var space
            var a, b, c
            a = lineSpace(x1, y1, x2, y2)// 线段的长度
            b = lineSpace(x1, y1, x0, y0)// (x1,y1)到点的距离
            c = lineSpace(x2, y2, x0, y0)// (x2,y2)到点的距离
            if (c <= 0.000001 || b <= 0.000001) {
                space = 0
                return space
            }
            if (a <= 0.000001) {
                space = b
                return space
            }
            if (c * c >= a * a + b * b) {
                space = b
                return space
            }
            if (b * b >= a * a + c * c) {
                space = c
                return space
            }
            var p = (a + b + c) / 2// 半周长
            var s = Math.sqrt(p * (p - a) * (p - b) * (p - c))// 海伦公式求面积
            space = 2 * s / a// 返回点到线的距离（利用三角形面积公式求高）
            return space
        }

        /**
         * 计算两点之间的距离
         */
        function lineSpace(x1, y1, x2, y2) {
            return Math.sqrt((x1 - x2) * (x1 - x2) + (y1 - y2) * (y1 - y2))
        }

        /* 检测并擦除橡皮碰到的线 */
        function deleteRecord(touchX, touchY, time) {
            var isDel = false // 用于记录是否有线被删除了
            var newData = []
            newData = $.XHPlay.currentPathInfoList
            for (var i = 0; i < newData.length; i++) {
                pathInfo = newData[i]
                if (pathInfo.drawType == 'ellipse') {
                    if (checkOvalDelete(pathInfo.centerX, pathInfo.centerY, pathInfo.width, pathInfo.height, parseInt(touchX), parseInt(touchY), parseInt(eraserHalf))) {
                        if (pointInfo.pressure != undefined || (($.XHPlay.currentPathInfoList[i].drawType != '2') && ($.XHPlay.currentPathInfoList[i].drawType != '10'))) {
                            $.XHPlay.drawLines(i, function () {
                            }, time)
                            i -= 1
                            isDel = true
                            continue
                        }
                    }
                } else {
                    pointsList = pathInfo.list
                    var pointSize = pointsList.length
                    if (pointSize == 0) {
                        continue
                    }
                    // 加入范围检查，来提高碰撞算法性能
                    if (touchX + eraserHalf < pathInfo.left
                        || touchY + eraserHalf < pathInfo.top
                        || touchX - eraserHalf > pathInfo.right
                        || touchY - eraserHalf > pathInfo.bottom) {
                        // if (oldX != -1) {
                        var pathInfoLeftTop = { x: pathInfo.left, y: pathInfo.top }
                        var pathInfoLeftBottom = { x: pathInfo.left, y: pathInfo.bottom }
                        var pathInfoRightBottom = { x: pathInfo.right, y: pathInfo.bottom }
                        var pathInfoRightTop = { x: pathInfo.right, y: pathInfo.top }
                        if (!intersect1(pathInfoLeftTop, pathInfoRightBottom, oldPoint, touchPoint)
                            && !intersect1(pathInfoLeftBottom, pathInfoRightTop, oldPoint, touchPoint)) {
                            continue
                        }
                        // }
                    }
                    // 先检查第一个点有没有在橡皮范围内
                    pointInfo = pointsList[0]
                    if (checkDelete(pointInfo.x, pointInfo.y, touchX, touchY)) {
                        if (pointInfo.pressure != undefined || (($.XHPlay.currentPathInfoList[i].drawType != '2') && ($.XHPlay.currentPathInfoList[i].drawType != '10'))) {
                            $.XHPlay.drawLines(i, function () {
                            }, time)
                            i -= 1
                            isDel = true
                            continue
                        }
                    }
                    // 再检查其它点及与前一个点形成的线是否与橡皮范围相交
                    for (var j = 1; j < pointSize; j++) {
                        prePointInfo = pointsList[j - 1]
                        pointInfo = pointsList[j]
                        if (checkDeletePoint(prePointInfo, pointInfo, touchX, touchY)) {
                            if (pointInfo.pressure != undefined || (($.XHPlay.currentPathInfoList[i].drawType != '2') && ($.XHPlay.currentPathInfoList[i].drawType != '10'))) {
                                $.XHPlay.drawLines(i, function () {
                                }, time)
                                i -= 1
                                isDel = true
                                break
                            }
                        }
                    }
                }
            }
        }

        /**
         * @param ovalX   椭圆中心点x轴坐标
         * @param ovalY   椭圆中心点y轴坐标
         * @param a       椭圆x轴半径
         * @param b       椭圆y轴半径
         * @param circleX 橡皮擦中心点x轴坐标
         * @param circleY 橡皮擦中心点y轴坐标
         * @param r       橡皮擦的半径
         */
        function checkOvalDelete(ovalX, ovalY, a, b, circleX, circleY, r) {
            /* 求两圆心形成的直线与圆的两个交点 */
            var points = []
            points = getPoint(circleX, circleY, r, ovalX, ovalY, circleX, circleY)

            /* 判断两交点是否在椭圆内 */
            return getValue(ovalX, ovalY, a, b, points[0].x, points[0].y) * getValue(ovalX, ovalY, a, b, points[1].x, points[1].y) <= 0.1
        }

        function getPoint(cx, cy, r, stx, sty, edx, edy) {
            // (x - cx )^2 + (y - cy)^2 = r^2
            // y = kx +b

            // 求得直线方程
            var k = ((edy - sty)) / (edx - stx)
            var b = edy - k * edx

            // 列方程
            /*
             * (1 + k^2)*x^2 - x*(2*cx -2*k*(b -cy) ) + cx*cx + ( b - cy)*(b - cy) -
             * r*r = 0
             */
            var x1, y1, x2, y2
            var c = cx * cx + (b - cy) * (b - cy) - r * r
            var a = (1 + k * k)
            var b1 = (2 * cx - 2 * k * (b - cy))
            // 得到下面的简化方程
            // a*x^2 - b1*x + c = 0;

            var tmp = Math.sqrt(b1 * b1 - 4 * a * c)
            x1 = (b1 + tmp) / (2 * a)
            y1 = k * x1 + b
            x2 = (b1 - tmp) / (2 * a)
            y2 = k * x2 + b

            // 判断求出的点是否在圆上
            var p = []
            var obj = {}
            obj.x = x1
            obj.y = y1
            p.push(obj)
            obj.x = x2
            obj.y = y2
            p.push(obj)
            return p

        }

        /* 计算x2/a2+y2/b2-1的值 */
        function getValue(ovalX, ovalY, a, b, x, y) {
            return Math.pow(x - ovalX, 2) / Math.pow(a, 2) + Math.pow(y - ovalY, 2) / Math.pow(b, 2) - 1
        }

        function launchIntoFullscreen(element) {
            if (element.requestFullscreen) {
                element.requestFullscreen()
            } else if (element.mozRequestFullScreen) {
                element.mozRequestFullScreen()
            } else if (element.webkitRequestFullscreen) {
                element.webkitRequestFullscreen()
            } else if (element.msRequestFullscreen) {
                element.msRequestFullscreen()
            }
        }

        $.XHPlay.init()
    }
    )
});
(function (win) {
    var doc = win.document
    // If there's a hash, or addEventListener is undefined, stop here
    if (!win.navigator.standalone && !location.hash && win.addEventListener) {
        // scroll to 1
        win.scrollTo(0, 1)
        var scrollTop = 1,
            getScrollTop = function () {
                return win.pageYOffset || doc.compatMode === 'CSS1Compat' && doc.documentElement.scrollTop || doc.body.scrollTop || 0
            },
            // reset to 0 on bodyready, if needed
            bodycheck = setInterval(function () {
                if (doc.body) {
                    clearInterval(bodycheck)
                    scrollTop = getScrollTop()
                    win.scrollTo(0, scrollTop === 1 ? 0 : 1)
                }
            }, 15)
        win.addEventListener('load', function () {
            setTimeout(function () {
                // at load, if user hasn't scrolled more than 20 or so...
                if (getScrollTop() < 20) {
                    // reset to hide addr bar at onload
                    win.scrollTo(0, scrollTop === 1 ? 0 : 1)
                }
            }, 0)
        }, false)
    }
})(this)