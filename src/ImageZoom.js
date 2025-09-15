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
            imageUrl: undefined,
            minZoom: -20,
            maxZoom: 20,
            zoomRate: 0.1,
            mouseDrag: true,
            touchDrag: true,
            wheelZoom: true
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
            zoomLevel: 0                                // zoom level of the image
        },
        fns = {
            isArray: o => Array.isArray(o) || (
                o &&                                // o is not null, undefined, etc.
                typeof o === "object" &&            // o is an object
                isFinite(o.length) &&               // o.length is a finite number
                o.length >= 0 &&                    // o.length is non-negative
                o.length === Math.floor(o.length) &&  // o.length is an integer
                o.length < 4294967296               // o.length < 2^32
            ),
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

            frameInit: (element) => {
                if (!element) throw "Invalid ImageZoom Element!";
                if (fns.isArray(element) || element.tagName != 'IMG') throw "Invalid ImageZoom Element!";

                vars.frame = element;
                fns.frameState();

                // if frame has an image, use that as imageUrl but override if options has imageUrl
                if (vars.frame.src !== '')
                    options = fns.extend(true, opts, { imageUrl: vars.frame.src }, options || {});

                vars.frame.src = emptySvgUri;

                fns.frameDimensions();
                fns.frameResize();
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
                vars.frameObserver = new ResizeObserver((entries) => {
                    if (entries[0].target !== vars.frame) return;
                    fns.frameDimensions(entries[0].contentRect);
                    fns.imageUpdate();
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
            },
            frameRebuild: () => {
                fns.frameDestroy();
                fns.frameInit(vars.frame);
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
                };
                img.src = opts.imageUrl;
            },
            imagePosition: (x, y) =>  {
                vars.imagePosition.x = x;
                vars.imagePosition.y = y;

                fns.imageUpdate();
            },
            imageCenter: () => {
                vars.imagePosition.x = (vars.frameDimensions.width - vars.zoomDimensions.width) / 2;
                vars.imagePosition.y = (vars.frameDimensions.height - vars.zoomDimensions.height) / 2;
                fns.imageUpdate();
            },
            imageFit: () => {
                if (vars.imageDimensions.width > vars.imageDimensions.height) {
                    //landscape
                    vars.baseDimensions.height = (vars.imageDimensions.height / vars.imageDimensions.width) * vars.frameDimensions.width;
                    vars.baseDimensions.width = vars.frameDimensions.width;
                } else {
                    // portrait
                    vars.baseDimensions.width = (vars.imageDimensions.width / vars.imageDimensions.height) * vars.frameDimensions.height;
                    vars.baseDimensions.height = vars.frameDimensions.height;
                }
                vars.zoomDimensions = {
                    width: vars.baseDimensions.width,
                    height: vars.baseDimensions.height
                };
                vars.zoomLevel = 0;
                fns.imageUpdate();
            },
            imageZoom: (level) => {
                if (level < 0) level = Math.max(level, opts.minZoom);
                if (level > 0) level = Math.min(level, opts.maxZoom);
                let width = vars.baseDimensions.width,
                    height = vars.baseDimensions.height;
                for (let i = 1; i <= Math.abs(level); i++)
                {
                    let rate = level < 0 ? -opts.zoomRate : opts.zoomRate;
                    width += width * rate;
                    height += height * rate;
                }
                vars.zoomLevel = level;
                vars.zoomDimensions.width = width;
                vars.zoomDimensions.height = height;

                fns.imageUpdate();
            },
            imageZoomIn: () => {
                fns.imageZoom(vars.zoomLevel + 1);
                fns.imageCenter();
            },
            imageZoomOut: () => {
                fns.imageZoom(vars.zoomLevel - 1);
                fns.imageCenter();
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
                vars.imagePosition.x += (e.pageX - vars.dragPosition.pageX);
                vars.imagePosition.y += (e.pageY - vars.dragPosition.pageY);
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
                if (!opts.touchDrag) return;
                vars.frame.addEventListener("touchstart", fns.onTouchStart, { passive: false });
            },
            onTouchStart: (e) => {
                e.preventDefault();
                vars.dragPosition = e.touches[0];
                if (e.touches.length == 2)
                {
                    debugger;
                }
                document.addEventListener('touchmove', fns.onTouchMove, { passive: false });
                document.addEventListener('touchend', fns.onTouchEnd, { passive: false });
            },
            onTouchMove: (e) => {
                e.preventDefault();
                if (!vars.dragPosition) return;
                if (e.touches.length == 2)
                {
                    var dist = Math.hypot(
                        e.touches[0].pageX - e.touches[1].pageX,
                        e.touches[0].pageY - e.touches[1].pageY
                    );
                } else {
                    let touch = e.touches[0];
                    vars.imagePosition.x += (touch.pageX - vars.dragPosition.pageX);
                    vars.imagePosition.y += (touch.pageY - vars.dragPosition.pageY);
                    vars.dragPosition = touch;
                }
                fns.imageUpdate();
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
                    offsetX = e.pageX - rect.left - window.scrollX,
                    offsetY = e.pageY - rect.top - window.scrollY,
                    ratioX = (offsetX - vars.imagePosition.x) / vars.zoomDimensions.width,
                    ratioY = (offsetY - vars.imagePosition.y) / vars.zoomDimensions.height,
                    zoomLevel = vars.zoomLevel;

                zoomLevel += delta < 0 ? 1 : -1;

                fns.imageZoom(zoomLevel);
                fns.imagePosition(
                    offsetX - (vars.zoomDimensions.width * ratioX),
                    offsetY - (vars.zoomDimensions.height * ratioY)
                );
            },
            unbindWheel: () => {
                vars.frame.removeEventListener('wheel', fns.onWheel, { passive: false });
            }

            /* will add pinch binding next */
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
