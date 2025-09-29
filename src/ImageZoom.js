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
            imageDimensions: { width: 0, height: 0 },   // raw image dimensions
            baseDimensions: { width: 0, height: 0 },    // base image dimensions (size to make image fit frame) as zoom level 0
            zoomDimensions: { width: 0, height: 0 },    // zoom image dimensions for current zoom level
            imagePosition: { x: 0, y: 0 },              // image position within frame, zeros if image is within frame
            dragPosition: undefined,                    // stores previous drag position for calculating drag movement
            touchDistance: 0,                           // distance between two touch points for pinch zoom
            zoomLevel: 0                                // zoom level of the image
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
                        frameDimensions: vars.frameDimensions,
                        zoomDimensions: vars.zoomDimensions,
                        zoomLevel: vars.zoomLevel
                    }
                }, data || {});
                let event = new CustomEvent(eventName, { detail: eventData });
                vars.frame.dispatchEvent(event);
            },

            frameInit: (element) => {
                if (!element) throw "Invalid ImageZoom Element!";
                if (element instanceof NodeList || element.tagName != 'IMG') throw "Invalid ImageZoom Element!";

                vars.frame = element;
                fns.frameState();

                // if frame has an image, use that as imageUrl but override if options has imageUrl
                if (vars.frame.src !== '')
                    options = fns.extend(true, opts, { imageUrl: vars.frame.src }, options || {});

                vars.frame.src = emptySvgUri;

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

                opts.imageUrl = imageUrl;

                let img = new Image();
                img.onload = function () {
                    vars.imageDimensions = {
                        width: this.naturalWidth,
                        height: this.naturalHeight
                    };
                    fns.imageFit();
                    fns.triggerEvent('iz.imageLoaded');
                };
                img.src = opts.imageUrl;
            },
            imagePosition: (x, y) => {
                fns.triggerEvent('iz.positionChange', { x: x, y: y });
                vars.imagePosition.x = x;
                vars.imagePosition.y = y;                
                fns.imageUpdate();
                fns.triggerEvent('iz.positionChanged');                
            },
            imageCenter: () => {
                fns.imagePosition(
                    (vars.frameDimensions.width - vars.zoomDimensions.width) / 2,
                    (vars.frameDimensions.height - vars.zoomDimensions.height) / 2
                );
            },
            imageFit: () => {
                let scale = Math.min(
                    vars.frameDimensions.width / vars.imageDimensions.width,
                    vars.frameDimensions.height / vars.imageDimensions.height
                );
                vars.baseDimensions.height = vars.imageDimensions.height * scale;
                vars.baseDimensions.width = vars.imageDimensions.width * scale;
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

                fns.triggerEvent('iz.zoomChanged');

                fns.imagePosition(
                    offsetX - (vars.zoomDimensions.width * ratioX),
                    offsetY - (vars.zoomDimensions.height * ratioY)
                );                
            },
            imageZoomIn: () => {
                fns.imageZoom(vars.zoomLevel + 1);
            },
            imageZoomOut: () => {
                fns.imageZoom(vars.zoomLevel - 1);
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
                vars.frame.style.backgroundImage = 'url("' + opts.imageUrl + '")';
                vars.frame.style.backgroundSize = vars.zoomDimensions.width + 'px ' + vars.zoomDimensions.height + 'px';
                vars.frame.style.backgroundPosition = vars.imagePosition.x + 'px ' + vars.imagePosition.y + 'px';
            },

            optionsInit: (o) => {
                if (!o) return;

                opts = fns.extend(true, opts, o || {});

                if (o.imageUrl) fns.imageInit(opts.imageUrl);

                fns.bindWheel();
                fns.bindMouse();
                fns.bindTouch();
            },

            bindMouse: () => {
                if (!opts.mouseDrag) return;
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

            bindTouch: () => {                
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

            bindWheel: () => {
                if (!opts.wheelZoom) return;
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
            }
        };

        fns.frameInit(element);
        fns.optionsInit(options);

        return {
            image: fns.imageInit,
            options: fns.optionsInit,
            zoom: fns.imageZoom,
            zoomIn: fns.imageZoomIn,
            zoomOut: fns.imageZoomOut,
            zoomFit: fns.imageFit,
            position: fns.imagePosition,
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