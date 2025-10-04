# ImageZoom
[![.github/workflows/main.yaml](https://github.com/EldinoCodes/ImageZoom/actions/workflows/main.yaml/badge.svg)](https://github.com/EldinoCodes/ImageZoom/actions/workflows/main.yaml)

ImageZoom.js is a simple javascript library to implement image zoom and drag.  I needed to implement an image zoom in a recent project and found that the libraries were complex and had a bunch of features I didnt need.  Frustrated, I built this little project to cover basic image zoom functionality without needing a bunch of other stuff.  

Currently this project supports mouse and touch events on both desktop and mobile platforms.  The intention is to keep this library as simple and concise as possible and not depend on any other libraries.  This is so people can read through the code and understand how it works.

Check out the [Demo](https://eldinocodes.github.io/ImageZoom/example) for a working example.

## Usage
This is an example of the most basic usage for the ImageZoom.js library.

1. Include the script in your html file:
```html
<script src="path/to/imagezoom.js"></script>
```
2. Add an image to your html file:
```html
<img id="myImage" src="path/to/image.jpg" alt="Zoomable Image">
```
3. Initialize the ImageZoom on the image element with some javascript:
```javascript
  const imgElement = document.getElementById('myImage');
  const image1 = new ImageZoom(imgElement, {
	zoomFactor: 0.1,  // Optional: default is 0.1
	maxZoom: 15,      // Optional: default is 20
	minZoom: 10       // Optional: default is 20
  });
```
4. Now you can zoom in and out using the mouse wheel or touch gestures, and drag the image around.

## Options
The `ImageZoom` constructor accepts an options object to customize its behavior. Here are the available options:
- `imageUrl`: The URL of the image to be zoomed. Default is the `src` attribute of the provided image element.
- `minZoom`: The minimum zoom level. Default is `-20`.
- `maxZoom`: The maximum zoom level. Default is `20`.
- `zoomFactor`: The amount to zoom in or out with each scroll or pinch. Default is `0.1`.
- `keyboardControl`: Enable or disable keyboard controls. Default is `true`.
- `mouseDrag`: Enable or disable dragging with the mouse. Default is `true`.
- `touchDrag`: Enable or disable dragging with touch. Default is `true`.
- `touchZoom`: Enable or disable zooming with touch gestures. Default is `true`.
- `wheelZoom`: Enable or disable zooming with the mouse wheel. Default is `true`.

## Methods
The `ImageZoom` provides the following methods:
- `image(imageUrl)`: Change the image to the specified URL.
- `imageFit()`: Adjusts the imagge to fit within the container and resets base zoom to match.
- `imageReset()`: Resets image to original state.
- `imageExport(fileName)` : Allow export of the image with current rotation applied.

- `imagePosition(x, y)`: Sets the position of the image relative to the container.
- `imageMoveUp()`: Moves the position of the image up.
- `imageMoveDown()`:  Moves the position of the image down.
- `imageMoveLeft()`:  Moves the position of the image left.
- `imageMoveRight()`: Moves the position of the image right.

- `imageZoom(zoomLevel, x, y)`: Sets zoom level between `minZoom` and `maxZoom` values, center relative to `x` and `y`.
- `imageZoomIn()`: Increases the zoom level by the `zoomFactor`.
- `imageZoomOut()`: Decreases the zoom level by the `zoomFactor`.

- `imageRotate(rotationIndex)`: Rotates the image by `rotationIndex`, [0, 90, 180, 270] degrees to the left.
- `imageRotateLeft()`: Rotates the image 90 degrees to the left.
- `imageRotateRight()`: Rotates the image 90 degrees to the right.

- `options(options)`: Update the instance options with the provided object.
- `rebuild()`: Rebuilds the zoomImage object from the initial state.
- `destroy()`: Removes all event listeners and restores previous image state.

<span style='color:orange'>* *Position methods can only fire if image is larger than the frame i.e. zoomed in*</span>

## Events
The `ImageZoom` events object will contain current state and option information along with pertinent information for the event.  These are the emitted events:
- `iz.imageLoaded` : Image has been loaded.
- `iz.positionChange` : Position change has been requested. *(will include `x` and `y` of new position)*
- `iz.positionChanged` : Position change has been completed.
- `iz.zoomChange` : Zoom change has been requested. *(will include `zoomLevel`, `x`, and `y` of new zoom)*
- `iz.zoomChanged` : Image change has been completed.
- `iz.rotateChange` : Rotate change has been requested. *(will include `rotationLevel`, and `degrees` of rotation)*
- `iz.rotateChanged` : Rotate change has been completed.
- `iz.initialized` : ImageZoom has been initialized.
- `iz.destroyed` : ImageZoom has been destroyed.

## Notes
`ImageZoom` works by taking an image element and moving the `src` into a canvas generated blob and referencing that blob as the element `background-image` CSS property, then replacing the `src` property with a empty svg base64 image.  All image manipulation is done against the underlying canvas where the blob is manipulated and `background-image` of the dom element is updated.  This allows for complex functionality without needing to modify the dom structure at all.

## License
This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.