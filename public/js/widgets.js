var WIDGETS_DATABASE = {};
var WIDGETS_DASHBOARD = [];
var WIDGETS_EVENTS = {};
var WIDGETS_MANAGER = {};
var WIDGETS_USERSETTINGS = {};
var WIDGETS_WIDGETSETTINGS = {};
var WIDGETS_CURRENTREPOSITORY = '';
var WIDGETS_DATASOURCE = {};
var WIDGETS_DATASOURCE_KEYS = [];

function WIDGET(name, make, init) {

	var obj = {};
	obj.make = make;
	obj.async = 0;
	obj.options = {};
	obj.example = '';
	obj.name = name;
	obj.preview = '';
	obj.author = '';
	obj.example = '';
	obj.category = '';
	obj.url = '';
	obj.repository = WIDGETS_CURRENTREPOSITORY;

	var done = function(name, obj) {
		WIDGETS_DATABASE[name] = obj;
	};

	init && init.call(obj, function(key, label, def, type, max, min, step, validator) {

		if (typeof(type) === 'number') {
			validator = step;
			step = min;
			min = max;
			max = type;
			type = 'number';
		} else if (!type)
			type = def instanceof Date ? 'date' : typeof(def);

		var values;

		if (type instanceof Array) {

			values = [];

			type.forEach(function(val) {
				values.push({ text: val.text || val, value: val.text != null ? val : val });
			});

			type = 'array';
		}

		if (validator && typeof(validator) !== 'function')
			validator = null;

		obj.options[key] = { name: key, label: label, type: type.toLowerCase(), def: def, max: max, min: min, step: step, value: def, values: values, validator: validator };
	}, function(url) {
		obj.async++;
		IMPORT('ONCE ' + url, function() {
			obj.async--;
			setTimeout(function() {
				if (obj.async)
					return;
				done && done(name, obj);
				done = null;
			}, 50);
		});
	});

	if (typeof(obj.example) === 'object')
		obj.example = JSON.stringify(obj.example);

	setTimeout(function() {

		if (obj.async)
			return;

		if (done) {
			done(name, obj);
			done = null;
		}

	}, 50);
}

function WIDGET_COMPONENT(id, name, element, options) {

	this.$render = 0;
	self.$datasource = 0;
	this.$dimension = {};
	this.id = id;
	this.name = name;
	this.element = element;
	this.options = options;
	this.dom = element.get(0);
	this.prepare = function(data) {
		return data;
	};

/*
	this.make = function(size) {};
	this.resize = function(size, dimension) {};
	this.destroy = function() {};
	this.render = function(value) {};
	this.state = function(type) {
		// 0 - init
		// 1 - reconfigure
	};
	*/
}

WIDGET_COMPONENT.prototype.dimension = function(device, size, values) {

	var self = this;

	if (!device) {
		var tmp = self.$dimension[self.size.device + self.size.cols + 'x' + self.size.rows];
		if (tmp)
			return tmp();
		return EMPTYOBJECT;
	}

	if (!values) {
		var tmp = self.$dimension[device + size];
		if (tmp)
			return tmp();
		return EMPTYOBJECT;
	}

	self.$dimension[device + size] = new Function('return { ' + values + '}');
	return self;
};

WIDGET_COMPONENT.prototype.html = function(value) {
	this.element.empty().append(value);
	return this;
};

WIDGET_COMPONENT.prototype.center = function(enable) {
	this.element.parent().parent().toggleClass('widget-nocenter', !enable);
	return this;
};

WIDGET_COMPONENT.prototype.notify = function(icon, message, callback) {
	SETTER('notifications', 'append', icon, message, callback);
	return this;
};

WIDGET_COMPONENT.prototype.warning = function(message, icon) {
	SETTER('message', 'warning', message, icon);
	return this;
};

WIDGET_COMPONENT.prototype.success = function(message, icon) {
	SETTER('message', 'success', message, icon);
	return this;
};

WIDGET_COMPONENT.prototype.confirm = function(message, buttons, callback) {
	SETTER('confirm', 'confirm', message, buttons, callback);
	return this;
};

WIDGET_COMPONENT.prototype.tooltip = function() {
	var component = FIND('tooltip');

	if (!component)
		return this;

	if (arguments[0] === false) {
		component.hide();
		return this;
	}

	component.show.apply(component, arguments);
	return this;
};

WIDGET_COMPONENT.prototype.nodata = function(visible) {

	if (visible === undefined)
		visible = true;

	if (!visible) {
		this.$nodata && this.$nodata.addClass('hidden');
		return this;
	}

	if (this.$nodata) {
		this.$nodata.removeClass('hidden');
		return this;
	}

	this.element.append('<div class="widget-nodata"><div><div><i class="fa fa-ban"></i></div></div></div>');
	this.$nodata = self.find('.widget-nodata');
	return this;
};

WIDGET_COMPONENT.prototype.config = function(name, value) {
	if (value === undefined) {
		var o = WIDGETS_WIDGETSETTINGS[this.id];
		return o ? o[name] : undefined;
	}
	if (!WIDGETS_WIDGETSETTINGS[this.id])
		WIDGETS_WIDGETSETTINGS[this.id] = {};
	WIDGETS_WIDGETSETTINGS[this.id][name] = value;
	return value;
};

WIDGET_COMPONENT.prototype.find = function(selector) {
	return this.element.find(selector);
};

WIDGET_COMPONENT.prototype.css = WIDGET_COMPONENT.prototype.style = function(name, value) {
	this.element.css(name, value);
	return this;
};

WIDGET_COMPONENT.prototype.append = function(value) {
	this.element.append(value);
	return this;
};

WIDGET_COMPONENT.prototype.empty = function() {
	this.element.empty();
	return this;
};

WIDGET_COMPONENT.prototype.subscribe = function(name, fn) {
	if (!WIDGETS_EVENTS[name])
		WIDGETS_EVENTS[name] = [];
	WIDGETS_EVENTS[name].push({ id: this.id, fn: fn, instace: this });
	return this;
};

WIDGET_COMPONENT.prototype.datasource = function(url, data, headers) {
	if (typeof(data) === 'function') {
		headers = callback;
		callback = data;
		data = undefined;
	} else if (typeof(callback) === 'object') {
		var tmp = headers;
		headers = callback;
		callback = tmp;
	}

	var index = url.indexOf(' ');
	var self = this;
	AJAX('POST /api/ajax/', { method: url.substring(0, index).trim(), url: url.substring(index).trim(), data: typeof(data) === 'object' ? JSON.stringify(data) : data, headers: headers }, function(response, err) {
		response && self.render && self.render(self.prepare(response), self.size, self.$datasource++);
	});
	return self;
};

WIDGET_COMPONENT.prototype.ajax = function(url, data, callback, headers) {

	if (typeof(data) === 'function') {
		headers = callback;
		callback = data;
		data = undefined;
	} else if (typeof(callback) === 'object') {
		var tmp = headers;
		headers = callback;
		callback = tmp;
	}

	var index = url.indexOf(' ');
	AJAX('POST /api/ajax/', { method: url.substring(0, index).trim(), url: url.substring(index).trim(), data: typeof(data) === 'object' ? JSON.stringify(data) : data, headers: headers }, function(response, err) {
		callback && callback(err, response);
	});
};

WIDGET_COMPONENT.prototype.rename = function(name) {
	return this.dictionary ? (this.dictionary[name] || name) : name;
};

WIDGET_COMPONENT.prototype.configure = function() {
	var self = this;
	var w = WIDGETS_DATABASE[self.name];
	var options = $.extend({}, w.options);

	Object.keys(options).forEach(function(key) {
		options[key].value = self.options[key];
	});

	var obj = {};
	obj.id = self.id;
	obj.options = options;
	obj.tab = 'settings';
	obj.datasource = self.datasource;
	obj.interval = self.interval / 1000;
	obj.dictionary = self.dictionary || {};
	obj.example = w.example;
	obj.preview = w.preview;
	obj.author = w.author;
	obj.name = w.name;

	if (window.dashboard && window.dashboard.paths)
		window.dashboard.paths = null;

	IMPORTSET('formconfigure', 'common.form', 'configure');
	SET('formconfigure', obj);
	return self;
};

WIDGET_COMPONENT.prototype.read = function(path, value, def) {
	return readdatasource(path, value, def);
};

WIDGET_COMPONENT.prototype.publish = function(name) {

	var items = WIDGETS_EVENTS[name];
	if (items === undefined)
		return this;

	var argv = [];
	for (var i = 1; i < arguments.length; i++)
		argv.push(arguments[i]);

	var context = {};
	context.id = this.id;
	context.name = this.name;

	items.forEach(function(w) {
		w.fn.apply(context, argv);
	});

	return this;
};

WIDGET_COMPONENT.prototype.redraw = function() {
	var self = this;
	var response = WIDGETS_DATASOURCE[self.datasource];

	if (!response || !response.response)
		return self;

	response = response.response;

	if (response instanceof Array)
		obj = response.slice(0);
	else if (response) {
		if (typeof(response) === 'object')
			obj = JSON.parse(JSON.stringify(response));
		else
			obj = response;
	} else
		obj = null;

	obj && self.render && self.render(self.prepare(obj), self.size, self.$render++);
	return self;
};

WIDGET_COMPONENT.prototype.getDimension = function() {
	var self = this;
	return self.size.device + self.size.rows + 'x' + self.size.cols;
};

WIDGET_COMPONENT.prototype.toggle = function(cls, enable) {
	var self = this;
	self.element.toggleClass(cls, enable);
	return self;
};

WIDGET_COMPONENT.prototype.refresh = function() {
	var self = this;

	if (!self.datasource)
		return self;

	var data = SINGLETON('proxy');
	data.url = self.datasource;

	AJAX('GET /api/proxy/', data, function(response, err) {

		if (err)
			return;

		var datasource = WIDGETS_DATASOURCE[self.datasource];
		if (!datasource)
			datasource = WIDGETS_DATASOURCE[self.datasource] = {};

		datasource.counter = 0;
		datasource.response = response;
		self.redraw();
	});

	return self;
};

function WIDGETS_SAVE() {
	var obj = {};

	obj.options = WIDGETS_USERSETTINGS;
	obj.widgets = [];

	WIDGETS_DASHBOARD.forEach(function(item) {

		var index = [];

		$('.gridcontainer').find('.col-sm-2').each(function() {
			var el = $(this);
			el.find('[data-id="{0}"]'.format(item.id)).each(function() {
				index.push(el.index());
			});
		});

		obj.widgets.push({ id: item.id, datasource: item.datasource, interval: item.interval, name: item.name, index: index, dictionary: item.dictionary });
	});

	return obj;
}

function WIDGETS_LOAD(obj) {

	SETTER('dashboard', 'clear');

	WIDGETS_USERSETTINGS = obj.options || {};

	obj.widgets.forEach(function(item) {
		$('.gridcontainer').find('.col-sm-2').each(function() {
			var el = $(this);
			var index = el.index();
			item.index.indexOf(index) !== -1 && el.find('div').addClass('grid-disabled').attr('data-id', item.id);
		});
	});

	FIND('dashboard').resize(function() {

		obj.widgets.forEach(function(item) {
			WIDGET_MAKE(item.id, item.name, $('[data-instance="{0}"]'.format(item.id)), item.dictionary, item.datasource, item.interval);
		});

		WIDGETS_REFRESH_DATASOURCE(true);
	});
}

function WIDGET_GETSIZE(element) {
	var size = new Function('return {0}{1}{2}'.format('{', element.attr('data-size'), '}'))();
	size.device = WIDTH();
	return size;
}

function WIDGET_CONFIG(name, options) {
	var w = WIDGETS_DATABASE[name];
	var obj = {};
	Object.keys(w.options).forEach(function(m) {
		obj[m] = options && options[m] !== undefined ? options[m] : w.options[m].def;
	});
	return obj;
}

function WIDGET_MAKE(id, name, element, dictionary, datasource, interval) {
	var w = WIDGETS_DATABASE[name];

	if (!w) {
		window.console && console.warn('Widget "{0}" not found.'.format(name));
		return;
	}

	element.attr('data-widget', name);
	element.find('.widget-container').append('<div class="widget-body" />');
	var component = new WIDGET_COMPONENT(id, name, element.find('.widget-body'), WIDGET_CONFIG(name, WIDGETS_USERSETTINGS[id]));
	component.$name = name;
	component.dictionary = dictionary;
	component.datasource = datasource || '';
	component.interval = typeof(interval) !== 'number' ? 60000 : interval;
	WIDGETS_DASHBOARD.push(component);
	UPDATE('WIDGETS_DASHBOARD');
	w.make.call(component);
	component.size = WIDGET_GETSIZE(element);
	component.make && component.make(component.size);
	component.state && component.state(0);
	component.element.css({ width: component.size.w, height: component.size.h });
	element.removeClass('xs sm md lg').addClass(component.size.device);
	WIDGETS_DATASOURCE[datasource] && WIDGETS_DATASOURCE[datasource].response && component.redraw();
}

function WIDGETS_REFRESH_DATASOURCE(init) {

	var cache = {};

	WIDGETS_DATASOURCE_KEYS.forEach(function(key) {
		var data = WIDGETS_DATASOURCE[key];
		if (data.response)
			cache[key] = data.response;
	});

	WIDGETS_DATASOURCE = {};

	WIDGETS_DASHBOARD.forEach(function(widget) {
		if (!widget.interval || !widget.datasource)
			return;
		if (!WIDGETS_DATASOURCE[widget.datasource])
			WIDGETS_DATASOURCE[widget.datasource] = { url: widget.datasource, response: cache[widget.datasource] || null, counter: 0, interval: 60000 * 10, widgets: [] };
		WIDGETS_DATASOURCE[widget.datasource].widgets.push(widget);
		WIDGETS_DATASOURCE[widget.datasource].interval = Math.min(widget.interval, WIDGETS_DATASOURCE[widget.datasource].interval);
		if (cache[widget.datasource])
			return;
		WIDGETS_DATASOURCE[widget.datasource].counter = WIDGETS_DATASOURCE[widget.datasource].interval;
		WIDGETS_DATASOURCE[widget.datasource].widgets.forEach(function(widget) {
			!widget.$render && widget.redraw();
		});
	});

	WIDGETS_DATASOURCE_KEYS = Object.keys(WIDGETS_DATASOURCE);
	WIDGETS_SERVICE();
}

function WIDGET_REMOVE(id) {
	var index = WIDGETS_DASHBOARD.findIndex('id', id);
	if (index === -1)
		return false;

	var w = WIDGETS_DASHBOARD[index];
	var container = w.element.parent().parent();

	WIDGETS_DASHBOARD.splice(index, 1);
	UPDATE('WIDGETS_DASHBOARD');
	container.hide().off().remove();

	w.element.off();
	w.element.find('*').off();
	w.destroy && w.destroy();
	w.dom = null;
	w.make = null;
	w.render = null;
	w.publish = null;
	w.element = null;
	w = null;

	delete WIDGETS_USERSETTINGS[id];

	Object.keys(WIDGETS_EVENTS).forEach(function(e) {
		var index = 0;
		while (true) {
			var index = WIDGETS_EVENTS[e].findIndex('id', id);
			if (index === -1)
				break;
			WIDGETS_EVENTS[e].splice(index, 1);
		}
	});

	return true;
}

function analyse(output, obj, path, isarr) {

	if (obj instanceof Array) {
		analyse(output, obj[0], (path ? path + '.' : '') + '[]', path ? true : false);
		return;
	}

	Object.keys(obj).forEach(function(key, index) {
		var val = obj[key];
		var skip = false;

		if (val instanceof Array) {
			type = typeof(val[0]);
			if (type === 'object')
				return analyse(output, val, (path ? path + '.' : '') + key, true);
			isarr = true;
			skip = true;
		} else
			isarr = false;

		if (val == null)
			return;

		if (!skip) {
			var type = typeof(val);
			if (type === 'object')
				return analyse(output, val, (path ? path : '') + '["' + key + '"]');
		}

		output.push({ name: key, path: (path ? path : '') + '["' + key +'"]' + (isarr ? '.[]' : ''), type: type });
	});

	return output;
}

function readdatasource(field, response, def) {
	var fn = field.replace(/\.\[\].*?$/, function(text) {
		return '.readdatasource(\"{0}\")'.format(text.substring(3).replace(/\"/g, '\''));
	});

	try {
		return new Function('a', 'return a' + fn)(response);
	} catch(e) {
		return def;
	}
}

Array.prototype.readdatasource = function(path) {

	var fn = new Function('a', path ? 'return a' + path : ' return a');
	var values = [];

	for (var i = 0, length = this.length; i < length; i++) {
		var val = fn(this[i]);
		val != null && values.push(val);
	}

	return values;
};

function WIDGETS_SERVICE() {
	if (!WIDGETS_DATASOURCE_KEYS.length)
		return;

	WIDGETS_DATASOURCE_KEYS.forEach(function(key) {
		var item = WIDGETS_DATASOURCE[key];

		item.counter += 3000;

		if (item.counter < item.interval)
			return;

		item.counter = 0;

		var data = {};
		data.url = key;

		AJAX('GET /api/proxy/', data, function(response, err) {
			if (err)
				return;
			item.response = response;
			item.widgets.forEach(function(widget) {
				widget.redraw();
			});
		});
	});
}

setInterval(WIDGETS_SERVICE, 3000);