[![MIT License][license-image]][license-url]

[![Support](https://www.totaljs.com/img/button-support.png?v=2)](https://www.totaljs.com/support/)

# Dashboard

This application has to be modified by your requirements. Current version __v3.0.0__.

- Homepage: [www.totaljs.com/dashboard](https://www.totaljs.com/dashboard)
- [__Live chat with professional support__](https://messenger.totaljs.com)
- [__HelpDesk with professional support__](https://helpdesk.totaljs.com)

## Installation

__License__: [MIT](license.txt). 

- install latest Total.js `npm install total.js` (minimal version: __+v2.4.0__)
- download source-code
- run `node debug.js`

---

## Used Linux commands for server monitoring

- `mpstat`
- `df`
- `free`
- `ps`
- `tail`
- `ifconfig`
- `netstat`

## Users

Default user:

- username: `admin`
- password: `admin`

---

## Creating widget

- [Download: __Widget maker__](https://github.com/totaljs/dashboard/blob/master/public/maker.html) and start to develop on your localhost

```javascript
// WIDGET(name, declaration, [initialization]);

WIDGET('WidgetName', function() {  // DECLARATION

    var self = this;

    // ==== PROPERTIES ====
    // self.options   (readonly)      --> custom options according to the @config
    // self.element   (readonly)      --> current jQuery element
    // self.dom       (readonly)      --> current DOM element (without jQuery)
    // self.size      (readonly)      --> current dimension + position
    
    // ==== METHODS ====
    // self.html(html)                --> sets HTML into the current element
    // self.append(html)              --> appends HTML into the current element
    // self.empty()                   --> clears content
    // self.rename(value)             --> can rename `value` according to the dictionary, default returns `value`
    // self.refresh()                 --> refresh datasource and executes `render` when the data are OK.
    // self.center(boolean)           --> toggles centering
    // self.nodata([visible]);        --> creates a layer with `no data` information
    // self.config(name, [value])     --> can read and write custom name/value (the configuration persists because is stored in DB on the server)
    // self.success(message)          --> shows a success message
    // self.warning(message)          --> shows a warning message
    // self.tooltip(element, html, [width], [offX], [offY]) --> shows Tooltip
    // self.tooltip(x, y, html, [width]) --> shows Tooltip
    // self.notify(font-awesome-icon, message, [callback])   --> creates a notification
    // self.confirm(message, buttons_labels_array, [callback(index)]) --> creates a confirm dialog
    // self.use('METHOD url', [data], [headers], [cookies]) --> executes prepare && render with `response data`
    // self.ajax('METHOD url', [data], [callback(err, response)], [headers], [cookies]) --> self.ajax('POST http://yourserver.com/data/', { dashboard: 'is the best!!!' }, function(err, response) { ... })
    
    // ==== HANDLERS ====

    self.make = function(dimension) {
        // optional
        // widget is created
        // here you can create the whole nested elements
    };

    self.destroy = function() {
        // optional
        // widget is destroyed
    };

    self.resize = function(dimension) {
        // optional
        // widget is resized
    };

    self.render = function(value) {
        // optional
        // widget is pre-rendered
        // value ==> raw datasource response
    };

    self.state = function(type, changes) {
        // optional
        // widget is initialized or reconfigure
        // type === 0    : widget is initialized
        // type === 1    : widget is reconfigured
        // changes       : array of all changes (keys/properties) when is the widget reconfigured
    };

    // ==== CUSTOM EVENTS ====
    
    self.emit('event-name', 'argument1', 1000, 'argumentN');

    self.on('event-name', function(arg1, argN) {

    });

}, function(config) { // INITIALIZATION

    // config(key, label, default_value, [type], [max], [min], [step]);
    // `config` creates custom configuration for the widget

    // ==== WIDGET META INFORMATION ====
    this.title = 'Widget name in widget list'; // optional
    this.author = 'Author'; // optional
    this.url = 'URL to widget information'; // optional
    this.preview = 'URL to widget preview (image jpg/gif/png)'; // optional
    this.category = 'Category'; // optional
    this.sizes = ['1x1', '2x2']; // ROWSxCOLS --> it will be enabled only for this grid
    
    // Data-source example (can be JSON or plain OBJECT)
    this.example = { count: 10, min: 304, max: 340394 }; // optional
});
```

### Widget configuration types

Widget settings can contain different types of configuration fields. Type is defined as `[type]` in `config(key, label, value, [type], [max], [min], [step]);`

__Basic types__:

- type: `string` (when is the value `string` you don't need to define the type)
- type: `number` (when is the value `number` you don't need to define the type)
- type: `boolean` (when is the value `boolean` you don't need to define the type)
- type: `date` (when is the value `date` you don't need to define the type)

__Simple Array__:

```javascript
config('Language', 'sk', ['sk', 'en', 'de']);
```

__Advanced Array__:

```javascript
config('Language', 1, [{ text: 'sk', value: 1}, { text: 'en', value: 2}, { text: 'de', value: 3}]);
```

__Dynamic codelist__:

```javascript
// A REST services has to respond with Simple or Advanced Array.
config('List', 'DefaultValue', '/relative/url/address/');
config('List', 'DefaultValue', 'https://...absolute/url/address/');
```


__Color__:

Dashboard uses this color scheme: <http://codepen.io/devi8/pen/lvIeh> and the declaration below will show all colors in the widget settings.

```javascript
config('Background', '#FC6E51', 'Color');
```

### Additional helpers

Use async operations, AJAX calls, date and number formatting, etc. in your widgets.

- read jComponent documentation: [Section Tools](https://github.com/totaljs/jComponent#tools)
- supports [Tangular template engine](https://github.com/totaljs/tangular)

__Global variables__:

```javascript
TAU;               // returns 2 * Math.PI
DAYS;              // returns array with day names e.g. ['Sunday', 'Monday', etc.]
DAYS_SHORT;        // returns array with short day names e.g. ['SU', 'MO', etc.]
MONTH;             // returns array with month names e.g. ['January', 'February', etc.]
MONTH_SHORT;       // returns array with short month names e.g. ['Jan.', 'Feb.', etc.]
user;              // returns an instance of the current user
```

## How to import own widgets?

- put your widgets into the some script e.g. `my-widgets.js`
- open Dashboard applications
- click on the `Repository`
- add URL to script with your widgets

### Interesting

- each `widget` container element contains a class of the current display size `noxs`, xs`, `sm`, `md` or `lg` (you can adjust you CSS with display size selector e.g. `.lg .my-widget-text { font-size: 300% }`.
- each `widget` container element contains a style of percentual size of font `100% = 100px`, you can adjust `font-size` according to the widget width (`6 cols === 100%`, `1 cols === 50%`).
- each `widets` container element contains a class of current count of rows and columns, e.g. `cols6 rows3 g3x6` or `cols1 rows1 g1x1`.

- `widget.size.percentageW` explanation: `percentageW = 100` when `100%: cols === 6`, `0%: cols === 0`.
- `widget.size.percentageH` explanation: `percentageH = 100` when `100%: rows === 6`, `0%: rows === 0`
- `widget.size.ratioW` contains `width` percentual difference between current display size and `lg` (large display)
- `widget.size.ratioH` contains `height` percentual difference between current display size and `lg` (large display)
- `widget.size.ratio` contains `1.1` value and this value is size ratio between `lg` and current display size

__License__: [MIT](license.txt).

[license-image]: https://img.shields.io/badge/license-MIT-blue.svg?style=flat
[license-url]: license.txt