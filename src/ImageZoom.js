/*!
 * ImageZoom 1.0.0
 * https://github.com/EldinoCodes/ImageZoom
 *
 * Released under the MIT license
 * https://github.com/EldinoCodes/ImageZoom/blob/main/LICENSE
 * 
 * Tired of bloated libraries for simple tasks? Me too.
 */

((root, factory) => {
    typeof define === 'function' && define.amd
        ? define(['exports'], factory)
        : typeof exports === 'object' && typeof module !== 'undefined'
            ? factory(exports)
            : (root = root || self, factory(root));
})(this, (exports) => {
    'use strict';

    let imageZoom = (element, options) => {
        const base64EncodedSvg = btoa('<svg xmlns="http://www.w3.org/2000/svg" width="0" height="0"></svg>');
        const emptySvgUri = `data:image/svg+xml;base64,${base64EncodedSvg}`;

        let opts = {
            imageUrl: undefined,                        // url to image
            minZoom: -20,                               // min zoom level
            maxZoom: 20,                                // max zoom level 
            zoomFactor: 0.1,                            // zoom factor per zoom level
            keyboardControl: true,                      // flag to enable keyboard control
            mouseDrag: true,                            // flag to enable mouse drag
            touchDrag: true,                            // flag to enable touch drag 
            touchZoom: true,                            // flag to enable touch pinch zoom
            wheelZoom: true                             // flag to enable mouse wheel zoom
        },
        vars = {
            frame: undefined,                           // our main element
            frameState: undefined,                      // store initial element state for destroy
            frameObserver: undefined,                   // resize observer for frame
            frameDimensions: { width: 0, height: 0 },   // frame dimensions to calculate image size
            canvas: undefined,                          // canvas for image manipulation
            context: undefined,                         // canvas 2d context
            image: undefined,                           // image base64
            imageUrl: undefined,                        // current image url
            imageDimensions: { width: 0, height: 0 },   // image dimensions
            imagePosition: { x: 0, y: 0 },              // image position within frame, zeros if image is within frame
            imageRotation: 0,                           // image rotation in 90 degree increments
            baseDimensions: { width: 0, height: 0 },    // base image dimensions (size to make image fit frame) as zoom level 0
            zoomDimensions: { width: 0, height: 0 },    // zoom image dimensions for current zoom level            
            zoomLevel: 0,                               // zoom level of the image
            dragPosition: undefined,                    // stores previous drag position for calculating drag movement
            touchDistance: 0                            // distance between two touch points for pinch zoom            
        },
        fns = {
            extend: function() {
                let s = fns, e = {}, d = false, i = 0;
                if (Object.prototype.toString.call(arguments[0]) === '[object Boolean]') { d = arguments[0]; i++; }
                let m = function (o) {
                    for (var p in o) {
                        if (!Object.prototype.hasOwnProperty.call(o, p)) continue;
                        e[p] = d && Object.prototype.toString.call(o[p]) === '[object Object]'
                            ? s.extend.apply(s, [d, e[p], o[p]])
                            : o[p];
                    }
                };
                for (; i < arguments.length; i++)  m(arguments[i]);
                return e;
            },
            getPointDistance: (point1, point2) => {
                const dx = point2.clientX - point1.clientX;
                const dy = point2.clientY - point1.clientY;
                return Math.sqrt(Math.pow(dx, 2) + Math.pow(dy, 2));
            },
            getPointCenter: (point1, point2) => {
                const midX = (point1.clientX + point2.clientX) / 2;
                const midY = (point1.clientY + point2.clientY) / 2;
                return { x: midX, y: midY };
            },
            getDifference: (number1, number2) => {
                return number1 > number2
                    ? number1 - number2
                    : number2 - number1;
            },
            imageGetObjectUrl: (imageUrl, base64) => {
                URL.revokeObjectURL(imageUrl);
                if (!base64) return;
                let imageArray = base64.split(','),
                    mime = imageArray[0].match(/:(.*?);/)[1],
                    decoded = atob(imageArray[1]),
                    idx = decoded.length,
                    dataArray = new Uint8Array(idx);
                while (idx--) {
                    dataArray[idx] = decoded.charCodeAt(idx);
                }
                let blob = new Blob([dataArray], { type: mime });
                return URL.createObjectURL(blob);
            },
            triggerEvent: (eventName, data) => {
                if (!vars.frame) return;
                if (!eventName) return;
                let eventData = fns.extend(true, {
                    options: {
                        imageUrl: opts.imageUrl,
                        minZoom: opts.minZoom,
                        maxZoom: opts.maxZoom,
                        zoomFactor: opts.zoomFactor,
                        mouseDrag: opts.mouseDrag,
                        touchDrag: opts.touchDrag,
                        touchZoom: opts.touchZoom,
                        wheelZoom: opts.wheelZoom
                    },
                    state: {
                        imagePosition: vars.imagePosition,
                        imageDimensions: vars.imageDimensions,
                        imageRotation: vars.imageRotation,
                        frameDimensions: vars.frameDimensions,
                        zoomDimensions: vars.zoomDimensions,
                        zoomLevel: vars.zoomLevel
                    }
                }, data || {});
                let event = new CustomEvent(eventName, { detail: eventData });
                vars.frame.dispatchEvent(event);
            },

            canvasInit: () => {
                vars.canvas = vars.canvas || document.createElement('canvas');
                vars.context = vars.canvas.getContext('2d');
            },
            canvasClear: () => {
                vars.context.clearRect(0, 0, vars.canvas.width, vars.canvas.height);
            },
            canvasImageLoad: () => {
                if (!vars.image) return;

                vars.canvas.width = vars.image.naturalWidth;
                vars.canvas.height = vars.image.naturalHeight;

                vars.context.restore();
                vars.context.drawImage(vars.image, 0, 0, vars.canvas.width, vars.canvas.height);
                vars.context.save();
            },
            canvasImageRotate: (rotateIndex, callback) => {
                let realIndex = [0, 1, 2, 3].at(rotateIndex % 4),
                    radians = realIndex * (Math.PI / 2),
                    altView = realIndex % 2 != 0;

                vars.canvas.width = altView ? vars.image.naturalHeight : vars.image.naturalWidth;
                vars.canvas.height = altView ? vars.image.naturalWidth : vars.image.naturalHeight;

                vars.context.save();

                switch(realIndex)
                {
                    case 0: vars.context.translate(0, 0); break;
                    case 1: vars.context.translate(vars.canvas.width, 0); break;
                    case 2: vars.context.translate(vars.canvas.width, vars.canvas.height); break;
                    case 3: vars.context.translate(0, vars.canvas.height); break;                    
                }
                vars.context.rotate(radians);
                vars.context.drawImage(vars.image, 0, 0);

                vars.context.restore();

                if(callback) callback();
            },
            canvasToBase64: () => {
                return vars.canvas.toDataURL('image/png');
            },

            frameInit: (element) => {
                if (!element) throw "Invalid ImageZoom Element!";
                if (element instanceof NodeList || element.tagName != 'IMG') throw "Invalid ImageZoom Element!";

                vars.frame = element;
                fns.frameState();

                // if frame has an image, use that as imageUrl but override if options has imageUrl
                if (vars.frame.src !== '')
                    options = fns.extend(true, opts, { imageUrl: vars.frame.src }, options || {});

                vars.frame.src = emptySvgUri

                fns.frameDimensions();
                fns.frameResize();

                fns.triggerEvent('iz.initialized');
            },
            frameState: () => {
                vars.frameState = {
                    src: vars.frame.src,
                    backgroundImage: vars.frame.style.backgroundImage,
                    backgroundSize: vars.frame.style.backgroundSize,
                    backgroundPosition: vars.frame.style.backgroundPosition,
                    backgroundRepeat: vars.frame.style.backgroundRepeat
                };
            },
            frameDimensions: (rect) => {
                rect = rect || vars.frame.getBoundingClientRect();
                vars.frameDimensions = {
                    width: rect.width,
                    height: rect.height
                }
            },
            frameResize: () => {
                if (vars.frameObserver) vars.frameObserver.disconnect();
                vars.frameObserver = new ResizeObserver((entries) => {
                    if (entries[0].target !== vars.frame) return;
                    fns.frameDimensions(entries[0].contentRect);
                    fns.imageUpdate();
                    fns.triggerEvent('iz.imageResize');
                });
                vars.frameObserver.observe(vars.frame);
            },
            frameDestroy: () => {
                fns.imageGetObjectUrl(vars.imageUrl);

                vars.frame.src = vars.frameState.src;                
                vars.frame.style.backgroundImage = vars.frameState.backgroundImage;
                vars.frame.style.backgroundSize = vars.frameState.backgroundSize;
                vars.frame.style.backgroundPosition = vars.frameState.backgroundPosition;
                vars.frame.style.backgroundRepeat = vars.frameState.backgroundRepeat;

                vars.frameObserver.unobserve(vars.frame);

                fns.unbindMouse();
                fns.unbindTouch();
                fns.unbindWheel();

                fns.triggerEvent('iz.destroyed');
            },
            frameRebuild: () => {
                fns.frameDestroy();
                fns.frameInit(vars.frame);
                fns.optionsInit(options);
                fns.imageUpdate();
            },

            imageInit: (imageUrl) =>  {
                if (!imageUrl) throw "Invalid imageUrl!";

                fns.imageLoad(imageUrl, () => {
                    let base64 = fns.canvasToBase64();

                    vars.imageUrl = fns.imageGetObjectUrl(vars.imageUrl, base64);

                    fns.imageFit();
                });
            },
            imageLoad: (imageUrl, callback) => {
                /// load image obj, store image dimensions and draw to canvas
                if (!imageUrl) throw "Invalid imageUrl!";
                if (!callback) throw "Invalid callback!";

                vars.image = new Image();
                vars.image.onerror = function () {
                    console.error("Error loading image:", imageUrl);
                    vars.image.src = emptySvgUri;
                };
                vars.image.onload = function () {                    
                    vars.imageDimensions = {
                        width: this.naturalWidth,
                        height: this.naturalHeight
                    };
                    vars.imagePosition = { x: 0, y: 0 };
                    vars.imageRotation = 0;
                    fns.canvasImageLoad();
                    callback();
                }
                vars.image.src = imageUrl;
            },            
            imagePosition: (x, y) => {
                fns.triggerEvent('iz.positionChange', { x: x, y: y });
                vars.imagePosition.x = x;
                vars.imagePosition.y = y;                
                fns.imageUpdate();
                fns.triggerEvent('iz.positionChanged');                
            },
            imagePositionUp: () => {
                fns.imagePosition(vars.imagePosition.x, vars.imagePosition.y + 10);
            }                    ,
            imagePositionDown: () => {
                fns.imagePosition(vars.imagePosition.x, vars.imagePosition.y - 10);
            },
            imagePositionLeft: () => {
                fns.imagePosition(vars.imagePosition.x + 10, vars.imagePosition.y);
            },
            imagePositionRight: () => {
                fns.imagePosition(vars.imagePosition.x - 10, vars.imagePosition.y);
            },
            imageCenter: () => {
                fns.imagePosition(
                    (vars.frameDimensions.width - vars.zoomDimensions.width) / 2,
                    (vars.frameDimensions.height - vars.zoomDimensions.height) / 2
                );
            },
            imageReset: () => {
                fns.imageInit(opts.imageUrl);
            },
            imageFit: () => {
                let scale = Math.min(
                    vars.frameDimensions.width / vars.imageDimensions.width,
                    vars.frameDimensions.height / vars.imageDimensions.height
                );
                vars.baseDimensions.width = vars.imageDimensions.width * scale;
                vars.baseDimensions.height = vars.imageDimensions.height * scale;
                vars.zoomDimensions = {
                    width: vars.baseDimensions.width,
                    height: vars.baseDimensions.height
                };
                vars.zoomLevel = 0;
                fns.imageUpdate();
            },
            imageZoom: (level, x, y) => {
                if (level < 0) level = Math.max(level, opts.minZoom);
                if (level > 0) level = Math.min(level, opts.maxZoom);

                x = x || (vars.frameDimensions.width / 2);
                y = y || (vars.frameDimensions.height / 2);

                fns.triggerEvent('iz.zoomChange', { level: level, x: x, y: y });

                let offsetX = x - window.scrollX,
                    offsetY = y - window.scrollY,
                    ratioX = (offsetX - vars.imagePosition.x) / vars.zoomDimensions.width,
                    ratioY = (offsetY - vars.imagePosition.y) / vars.zoomDimensions.height,
                    width = vars.baseDimensions.width,
                    height = vars.baseDimensions.height;

                for (let i = 1; i <= Math.abs(level); i++)
                {
                    let rate = level < 0 ? -opts.zoomFactor : opts.zoomFactor;
                    width += width * rate;
                    height += height * rate;
                }
                vars.zoomLevel = level;
                vars.zoomDimensions.width = width;
                vars.zoomDimensions.height = height;
                
                fns.imagePosition(
                    offsetX - (vars.zoomDimensions.width * ratioX),
                    offsetY - (vars.zoomDimensions.height * ratioY)
                );
                fns.triggerEvent('iz.zoomChanged');
            },
            imageZoomIn: () => {
                fns.imageZoom(vars.zoomLevel + 1);
            },
            imageZoomOut: () => {
                fns.imageZoom(vars.zoomLevel - 1);
            },
            imageRotate: (rotateIndex) => {
                let rotation = [0, 90, 180, 270],
                    realIndex = (rotateIndex % 4),
                    degrees = rotation[realIndex];

                fns.triggerEvent('iz.rotationChange', { rotation: realIndex, degrees: degrees });

                vars.imageRotation = realIndex;

                fns.canvasImageRotate(realIndex, () => {
                    let base64 = fns.canvasToBase64();
                    vars.imageDimensions = {
                        width: vars.canvas.width,
                        height: vars.canvas.height
                    };
                    vars.imageUrl = fns.imageGetObjectUrl(vars.imageUrl, base64);

                    fns.imageFit();

                    fns.triggerEvent('iz.rotationChanged', { rotation: realIndex, degrees: degrees });
                });
            },
            imageRotateLeft: () => {
                fns.imageRotate(vars.imageRotation - 1);
            },
            imageRotateRight: () => {
                fns.imageRotate(vars.imageRotation + 1);
            },
            imageUpdate: () => {
                let minX = vars.frameDimensions.width - vars.zoomDimensions.width,
                    minY = vars.frameDimensions.height - vars.zoomDimensions.height;

                // only center if image is smaller than frame, else allow drag within bounds
                if (vars.zoomDimensions.width <= vars.frameDimensions.width) {
                    vars.imagePosition.x = (vars.frameDimensions.width - vars.zoomDimensions.width) / 2;
                } else {
                    if (vars.imagePosition.x < minX) vars.imagePosition.x = minX;
                    if (vars.imagePosition.x > 0) vars.imagePosition.x = 0;
                }

                if (vars.zoomDimensions.height <= vars.frameDimensions.height) {
                    vars.imagePosition.y = (vars.frameDimensions.height - vars.zoomDimensions.height) / 2;
                } else {
                    if (vars.imagePosition.y < minY) vars.imagePosition.y = minY;
                    if (vars.imagePosition.y > 0) vars.imagePosition.y = 0;
                }
                vars.frame.src = emptySvgUri;
                vars.frame.style.backgroundRepeat = 'no-repeat';
                vars.frame.style.backgroundImage = 'url("' + vars.imageUrl + '")';
                vars.frame.style.backgroundSize = vars.zoomDimensions.width + 'px ' + vars.zoomDimensions.height + 'px';
                vars.frame.style.backgroundPosition = vars.imagePosition.x + 'px ' + vars.imagePosition.y + 'px';
            },
            imageExport: (fileName) => {
                let aTag = document.createElement('a');
                aTag.href = vars.imageUrl;
                aTag.download = fileName || 'image.png';
                document.body.appendChild(aTag);
                aTag.click();
                document.body.removeChild(aTag);
            },
            
            optionsInit: (o) => {
                if (!o) return;

                opts = fns.extend(true, opts, o || {});

                if (o.imageUrl) fns.imageInit(opts.imageUrl);

                fns.bindKeyboard();
                fns.bindMouse();
                fns.bindWheel();
                fns.bindTouch();
            },

            bindKeyboard: () => {
                if (!opts.keyboardControl) return;
                fns.unbindKeyboard();
                document.addEventListener('keydown', fns.onKeyboard, { passive: false });
            },
            onKeyboard: (e) => {
                switch (e.key) {
                    case '+':
                    case 'PageUp': fns.imageZoomIn(); break;
                    case '-':
                    case 'PageDown': fns.imageZoomOut(); break;
                    case '0':
                    case 'Home': fns.imageFit(); break;
                    case 'ArrowUp': fns.imagePositionUp(); break;
                    case 'ArrowDown': fns.imagePositionDown(); break;
                    case 'ArrowLeft': fns.imagePositionLeft(); break;
                    case 'ArrowRight': fns.imagePositionRight(); break;
                }
            },
            unbindKeyboard: () => {
                document.removeEventListener('keydown', fns.onKeyboard, { passive: false });
            },

            bindMouse: () => {
                if (!opts.mouseDrag) return;
                fns.unbindMouse();
                vars.frame.addEventListener('mousedown', fns.onMouseDown, { passive: false });
            },
            onMouseDown: (e) => {
                e.preventDefault();
                vars.dragPosition = e;
                vars.frame.style.cursor = 'grabbing';
                document.addEventListener('mousemove', fns.onMouseMove, { passive: false });
                document.addEventListener('mouseup', fns.onMouseUp, { passive: false });
            },
            onMouseMove: (e) => {
                e.preventDefault();
                if (!vars.dragPosition) return;
                fns.imagePosition(
                    vars.imagePosition.x += (e.pageX - vars.dragPosition.pageX),
                    vars.imagePosition.y += (e.pageY - vars.dragPosition.pageY)
                );
                vars.dragPosition = e;
                fns.imageUpdate();
            },
            onMouseUp: (e) => {
                vars.dragPosition = undefined;
                vars.frame.style.cursor = 'initial';
                document.removeEventListener('mouseup', fns.onMouseUp, { passive: false });
                document.removeEventListener('mousemove', fns.onMouseMove, { passive: false });
            },
            unbindMouse: () => {
                vars.frame.removeEventListener('mousedown', fns.onMouseDown, { passive: false });
            },
            
            bindWheel: () => {
                if (!opts.wheelZoom) return;
                fns.unbindWheel();
                vars.frame.addEventListener('wheel', fns.onWheel, { passive: false });
            },
            onWheel: (e) => {
                let delta = e.deltaY || -e.wheelDelta || 0;
                if (delta === 0) return;

                let rect = vars.frame.getBoundingClientRect(),
                    zoomLevel = vars.zoomLevel += delta < 0 ? 1 : -1;

                fns.imageZoom(zoomLevel, e.pageX - rect.left, e.pageY - rect.top);
            },
            unbindWheel: () => {
                vars.frame.removeEventListener('wheel', fns.onWheel, { passive: false });
            },

            bindTouch: () => {
                fns.unbindTouch();
                vars.frame.addEventListener("touchstart", fns.onTouchStart, { passive: false });
            },
            onTouchStart: (e) => {
                e.preventDefault();
                if (opts.touchDrag == true) vars.dragPosition = e.touches[0];

                document.addEventListener('touchmove', fns.onTouchMove, { passive: false });
                document.addEventListener('touchend', fns.onTouchEnd, { passive: false });
            },
            onTouchMove: (e) => {
                e.preventDefault();
                fns.onTouchMoveDrag(e);
                fns.onTouchMoveZoom(e);
                fns.imageUpdate();
            },
            onTouchMoveDrag: (e) => {
                if (!opts.touchDrag || e.touches.length != 1) return;

                let dragPosition = e.touches[0];
                fns.imagePosition(
                    vars.imagePosition.x += (dragPosition.pageX - vars.dragPosition.pageX),
                    vars.imagePosition.y += (dragPosition.pageY - vars.dragPosition.pageY)
                );
                vars.dragPosition = dragPosition;
            },
            onTouchMoveZoom: (e) => {
                if (!opts.touchZoom || e.touches.length != 2) return;

                let touchDistance = fns.getPointDistance(e.touches[0], e.touches[1]),
                    previousTouchDistance = vars.touchDistance || touchDistance;

                if (fns.getDifference(previousTouchDistance, touchDistance) > (100 / vars.baseDimensions.width)) {
                    let midTouch = fns.getPointCenter(e.touches[0], e.touches[1]),
                        zoomLevel = vars.zoomLevel += touchDistance > previousTouchDistance ? 1 : -1;
                    fns.imageZoom(zoomLevel, midTouch.x, midTouch.y);
                }
                vars.touchDistance = touchDistance;
            },
            onTouchEnd: (e) => {
                vars.dragPosition = undefined;
                document.removeEventListener('touchend', fns.onTouchEnd, { passive: false });
                document.removeEventListener('touchmove', fns.onTouchMove, { passive: false });
            },
            unbindTouch: () => {
                vars.frame.removeEventListener('touchstart', fns.onTouchStart, { passive: false });
            },
        };

        fns.canvasInit();
        fns.frameInit(element);
        fns.optionsInit(options);

        return {
            image: fns.imageInit,
            imageFit: fns.imageFit,
            imageReset: fns.imageReset,            
            imageExport: fns.imageExport,

            imagePosition: fns.imagePosition,
            imageMoveUp: fns.imagePositionUp,
            imageMoveDown: fns.imagePositionDown,
            imageMoveLeft: fns.imagePositionLeft,
            imageMoveRight: fns.imagePositionRight,

            imageZoom: fns.imageZoom,
            imageZoomIn: fns.imageZoomIn,
            imageZoomOut: fns.imageZoomOut,

            imageRotate: fns.imageRotate,
            imageRotateLeft: fns.imageRotateLeft,
            imageRotateRight: fns.imageRotateRight,

            options: fns.optionsInit,            
            rebuild: fns.frameRebuild,
            destroy: fns.frameDestroy
        };
    };

    exports.imageZoom = imageZoom;
});

// class loader
class ImageZoom {    
    constructor(element, options) {
        let fns = window.imageZoom(element, options);
        for(let key in fns)
            this[key] = fns[key];
    }
}