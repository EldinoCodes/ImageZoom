# ImageZoom
ImageZoom.js is a simple javascript library to implement image zoom and drag.  I needed to implement an image zoom in a recent project and found that the libraries were complex and had a bunch of features I didnt need.  Frustrated, I built this little project to cover basic image zoom functionality without needing a bunch of other stuff.  

Currently this project supports mouse and touch events on both desktop and mobile platforms.  The intention is to keep this library as simple and concise as possible and not depend on any other libraries.  This is so people can read through the code and understand how it works.

Check out the [demo](https://eldinocodes.github.io/ImageZoom/example) for a working example.

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
- `options(options)`: Update the instance options with the provided object.
- `image(imageUrl)`: Change the image to the specified URL.
- `imageFit()`: Adjusts the imagge to fit within the container and resets base zoom to match.
- `position(x, y)`: Sets the position of the image relative to the container *(can only happen if image is zoomed in)*.
- `rotateLeft()`: Rotates the image 90 degrees to the left.
- `rotateRight()`: Rotates the image 90 degrees to the right.
- `zoom(zoomLevel, x, y)`: Sets zoom level between `minZoom` and `maxZoom` values, center relative to `x` and `y`.
- `zoomIn()`: Increases the zoom level by the `zoomFactor`.
- `zoomOut()`: Decreases the zoom level by the `zoomFactor`.
- `rebuild()`: Rebuilds the zoomImage object from the initial state.
- `destroy()`: Removes all event listeners and restores previous image state.

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

## Whats Next?
Here are some ideas for future enhancements:
- Add image save functionality to allow reorienting images before save.

## Notes
`ImageZoom` works by taking an image element and moving the `src` to the element `background-image` CSS property and replacing the `src` property with a empty svg base64 image.  All image manipulation is done against the `background-image` of the dom element.  This allows for complex functionality without needing to modify the dom structure at all.
Known issues:
- due to how `ImageZoom` handles image manipulation, to achieve rotation we have to fetch an image, convert it to base64 and then embed that into a svg which is then converted into base64 and is slipped into the `background-image` CSS property.  Due to this, when any image is rotated it can cause both memory issues with large images and slows down general interaction.

## License
This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.