/* ==================================
 * @ 2017 FEZ 前端模块工程自动化构建工具
 * https://github.com/furic-zhao/fez
 * ================================== */

/**********************************
 * 用于检测浏览器是否支持webp的脚本源码
 **********************************/
// (function() {
//     //重置页面中的样式为webp.css
//     function setCssLink() {
//         var cssLink = document.getElementsByTagName("link");
//         for (var i = 0, linkLen = cssLink.length; i < linkLen; i++) {
//             cssLink[i].href = cssLink[i].getAttribute("href").replace(".css", ".webp.css");
//         }
//     }
//     //检测浏览器是否支持webp
//     function detectionWebp(setCssLink) {
//         var ls = window.localStorage;
//         if (ls !== undefined && ls.supportWebp !== undefined && ls.supportWebp === false) {
//             return false
//         } else {
//             if (ls !== undefined && ls.supportWebp !== undefined && ls.supportWebp === true) {
//                 setCssLink(true);
//                 return true;
//             } else {
//                 //检测浏览器是否支持webp
//                 var webp = new Image();
//                 webp.onerror = function() {
//                     //将浏览器支持情况缓存起来
//                     if (ls !== undefined) {
//                         ls.supportWebp = false;
//                     }
//                 };
//                 webp.onload = function() {
//                     //将浏览器支持情况缓存起来
//                     if (ls !== undefined) {
//                         ls.supportWebp = true;
//                     }
//                     setCssLink(true);
//                 };
//                 webp.src = 'data:image/webp;base64,UklGRjIAAABXRUJQVlA4ICYAAACyAgCdASoBAAEALmk0mk0iIiIiIgBoSygABc6zbAAA/v56QAAAAA==';
//             }
//         }
//     }
//     detectionWebp(setCssLink);
// })();

import gulp from 'gulp';

/**
 * 深度遍历目录/列出目录下所有文件
 * https://www.npmjs.com/package/rd
 */
import rd from 'rd';

/**
 * Nodejs处理文件
 * http://nodejs.cn/api/fs
 */
import fs from 'fs';

/**
 * Nodejs处理路径
 * http://nodejs.cn/api/path.html
 */
import path from 'path';

/**
 * 将图片转换为webp格式
 * https://github.com/sindresorhus/gulp-webp
 */
import gulpWebp from 'gulp-webp';

/**
 * 重命名文件
 * https://github.com/hparra/gulp-rename
 */
import rename from 'gulp-rename';

/**
 * 内容替换
 * https://github.com/lazd/gulp-replace
 */
import replace from 'gulp-replace';

/**
 * 在页面中插入内容
 * https://github.com/mikehazell/gulp-inject-string
 */
import injectString from 'gulp-inject-string';

export default (config, cb) => {

    const webpScript = `<script>;(function(){function setCssLink(){var a=document.getElementsByTagName("link");for(var i=0,linkLen=a.length;i<linkLen;i++){a[i].href=a[i].getAttribute("href").replace(".css",".webp.css")}}function detectionWebp(a){var b=window.localStorage;if(b!==undefined&&b.supportWebp!==undefined&&b.supportWebp===false){return false}else{if(b!==undefined&&b.supportWebp!==undefined&&b.supportWebp===true){a(true);return true}else{var c=new Image();c.onerror=function(){if(b!==undefined){b.supportWebp=false}};c.onload=function(){if(b!==undefined){b.supportWebp=true}a(true)};c.src='data:image/webp;base64,UklGRjIAAABXRUJQVlA4ICYAAACyAgCdASoBAAEALmk0mk0iIiIiIgBoSygABc6zbAAA/v56QAAAAA=='}}}detectionWebp(setCssLink)})();</script>`;

    let webpMap = {}; //暂存webp格式的文件
    let imgArr = []; //比较大小之后的webp文件
    let allImages = {}; //将所有的图片缓存起来 {"{图片名字}": 1, "{图片名字}": 0} 1 为可优化成 webp
    let reg = null;

    function render_webp(src) {
        if (!fs.existsSync(src)) return;

        /**
         * 通用查找所有的webp图片
         */
        rd.eachFileSync(src, function(file, stats) {
            let extname = path.extname(file);
            let basename = path.basename(file, extname);
            if (!(basename in webpMap)) {
                webpMap[basename] = {};
                webpMap[basename]['size'] = stats.size;
                webpMap[basename]['extname'] = extname;
            } else {
                /**
                 * 将转换后的 .webp 文件和原文件作比较，找出最小文件(有些转换后比原文件大)
                 */
                if ((webpMap[basename]['size'] > stats.size) && (extname === '.webp')) {
                    imgArr.push(basename + webpMap[basename]['extname']);
                    allImages[basename + webpMap[basename]['extname']] = 1;
                } else {
                    allImages[basename + webpMap[basename]['extname']] = 0;
                }
            }
        });
    }


    /**
     * 将 编译过的 sprite 目录下的图片转换成 .webp 格式
     */
    function compileWebpSprite() {
        return gulp.src(`${config.paths.tmp.sprite}/**/*`)
            .pipe(gulpWebp())
            .pipe(gulp.dest(config.paths.tmp.sprite));
    }
    /**
     * 将 编译过的 images 目录下的图片转换成 .webp 格式
     */
    function compileWebpImg() {
        return gulp.src(`${config.paths.tmp.img}/**/*`)
            .pipe(gulpWebp())
            .pipe(gulp.dest(config.paths.tmp.img));
    }
    /**
     * 找到所有编译后的webp图片文件 将文件名赋给正则
     */
    function webpImgNames(cb) {
        render_webp(config.paths.tmp.sprite);
        render_webp(config.paths.tmp.img);
        if (imgArr.length) {
            reg = eval('/(' + imgArr.join('|') + ')/ig');
        }
        cb();
    }

    /**
     * 将样式中所有的图片地址替换为webp格式，并复制一份命名为webp.css
     */
    function compileWebpCss() {
        return gulp.src([`${config.paths.tmp.css}/**/*.css`, `!${config.paths.tmp.css}/**/*.webp.css`])
            .pipe(rename({
                suffix: '.webp'
            }))
            .pipe(replace(reg, function(match) {
                if (match) {
                    return match.substring(0, match.lastIndexOf('.')) + '.webp';
                }
            }))
            .pipe(gulp.dest(config.paths.tmp.css));
    }

    /**
     * 将用于检测浏览器是否支持webp的js代码插入到页面
     */
    function injectWebpJs() {
        return gulp.src(`${config.paths.tmp.html}/**/*.html`)
            .pipe(injectString.before('</head>', webpScript))
            .pipe(gulp.dest(config.paths.tmp.html));
    }

    return function() {
        return gulp.series(
            compileWebpSprite,
            compileWebpImg,
            webpImgNames,
            compileWebpCss,
            injectWebpJs
        );
    }
}
