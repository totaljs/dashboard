[![MIT License][license-image]][license-url]

[![Support](https://www.totaljs.com/img/button-support.png?v=2)](https://www.totaljs.com/support/)

# Dashboard

This application has to be modified by your requirements.

- Homepage: [www.totaljs.com/dashboard](https://www.totaljs.com/dashboard)
- [__HelpDesk with professional support__](https://helpdesk.totaljs.com)

__Default mode__:

- it uses NoSQL embedded database `/models/*.js`
- it uses fake user profile `/definitions/auth.js`
- the application is [localized via Total.js localization](https://docs.totaljs.com/latest/en.html#pages~Localization)
- __it doesn't support__ lower resolution than __width<767px__ (mobile phones aren't supported now)

## Installation

__License__: [MIT](license.txt). 

- install latest Total.js `npm install total.js` (minimal version: __+v2.1.0__)
- download source-code
- run `node debug.js`

---

## Main libraries

- jQuery v3
- D3 v4
- Chart.js v2
- jComponent v5

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
    // self.read(path, obj, [def])    --> can read a value according to the `path` from the `obj`
    // self.redraw()                  --> redraw with the last datasource
    // self.refresh()                 --> refresh datasource and executes `render` when the data are OK.
    // self.center(boolean)           --> toggles centering
    // self.config(name, [value])     --> can read and write custom name/value (the configuration persists because is stored in DB on the server)
    // self.success(message)          --> shows a success message
    // self.warning(message)          --> shows a warning message
    // self.notify(icon, message, [callback])   --> creates a notification
    // self.confirm(message, buttons_labels_array, [callback(index)]) --> creates a confirm dialog
    // self.ajax('url', [data], [callback(err, response)], [headers]) --> self.ajax('POST http://yourserver.com/data/', { dashboard: 'is the best!!!' }, function(err, response) { ... })
    
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

    self.prepare = function(data) {
        // optional
        // this method can prepare data from datasource, this is a default implementation:
        return; data;
    };

    // ==== CUSTOM EVENTS ====
    
    self.publish('event-name', 'argument1', 1000, 'argumentN');

    self.subscribe('event-name', function(arg1, argN) {

    });

}, function(config, inject) { // INITIALIZATION

    // config(key, label, default_value, [type], [max], [min], [step]);
    // inject(url);

    // `config` creates custom configuration for the widget
    // `inject` can inject 3rd-party JavaScript, CSS or HTML

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
user;              // returns instance of the current user
```

## How to import own widgets?

- put your widgets into the some script e.g. `my-widgets.js`
- open Dashboard applications
- click on the `Repository`
- add URL to script with your widgets

### Interesting

- each `widget` container element contains a current display size `xs`, `sm`, `md` or `lg` (you can adjust you CSS with display size selector e.g. `.lg .my-widget-text { font-size: 300% }`.
- each `widget` container element contains a percentual size of font `100% = 14px`, you can adjust `font-size` according to the widget width (`6 cols === 100%`, `1 cols === 50%`).

__License__: [MIT](license.txt).

[license-image]: https://img.shields.io/badge/license-MIT-blue.svg?style=flat
[license-url]: license.txt