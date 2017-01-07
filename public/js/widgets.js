var WIDGETS_DATABASE = {};
var WIDGETS_DASHBOARD = [];
var WIDGETS_EVENTS = {};
var WIDGETS_MANAGER = {};
var WIDGETS_USERSETTINGS = {};
var WIDGETS_WIDGETSETTINGS = {};
var WIDGETS_CURRENTREPOSITORY = '';
var WIDGETS_DIMENSIONS = {};

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
	obj.group = '';
	obj.url = '';
	obj.keywords = '';
	obj.repository = WIDGETS_CURRENTREPOSITORY;
	obj.dictionary = {};

	var done = function(name, obj) {
		WIDGETS_DATABASE[name] = obj;
		obj.sizes && obj.sizes.forEach(function(size) {
			if (WIDGETS_DIMENSIONS[size])
				WIDGETS_DIMENSIONS[size]++;
			else
				WIDGETS_DIMENSIONS[size] = 1;
		});
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
		obj.example = STRINGIFY(obj.example);

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
	this.$data = null;
	this.$render = 0;
	this.$dimension = {};
	this.id = id;
	this.name = name;
	this.element = element;
	this.options = options;
	this.dom = element.get(0);
	this.dictionary = {};

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

WIDGET_COMPONENT.prototype.$resize = function(size, dimension) {
	this.resize && this.resize(size, dimension);
	EMIT(this.id, 'resize', size, dimension);
	return this;
};

WIDGET_COMPONENT.prototype.$state = function(type, changes) {
	this.state && this.state(type, changes);
	EMIT(this.id, 'state', type, changes);
	return this;
};

WIDGET_COMPONENT.prototype.dimension = function(device, size, values) {

	var self = this;

	if (!device) {
		var tmp = self.$dimension[self.size.device + self.size.cols + 'x' + self.size.rows];
		return tmp ? tmp() : EMPTYOBJECT;
	}

	if (!values) {
		var tmp = self.$dimension[device + size];
		return tmp ? tmp() : EMPTYOBJECT;
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

WIDGET_COMPONENT.prototype.on = function(name, fn) {
	if (!WIDGETS_EVENTS[name])
		WIDGETS_EVENTS[name] = [];
	WIDGETS_EVENTS[name].push({ id: this.id, fn: fn, instace: this });
	return this;
};

WIDGET_COMPONENT.prototype.use = function(url, data, headers, cookies) {
	var self = this;
	return self.ajax(url, data, function(err, response) {
		!err && response && self.data(response);
	}, headers, cookies);
};

WIDGET_COMPONENT.prototype.ajax = function(url, data, callback, headers, cookies) {

	if (typeof(data) === 'function') {
		headers = callback;
		callback = data;
		data = undefined;
	} else if (typeof(callback) === 'object') {
		var tmp = headers;
		headers = callback;
		callback = tmp;
	}

	var m = url.substring(0, index).trim();
	var u = url.substring(index).trim();
	if (u.substring(index, 1) === '/') {
		AJAX(m + ' ' + u + (headers ? ' --> ' + STRINGIFY(headers) : ''), data, function(err, response) {
			callback && callback(err, response);
		});
	} else {
		AJAX('POST /api/ajax/', { method: url.substring(0, index).trim(), url: url.substring(index).trim(), data: typeof(data) === 'object' ? STRINGIFY(data) : data, headers: headers, cookies: cookies }, function(response, err) {
			callback && callback(err, response);
		});
	}

	return this;
};

WIDGET_COMPONENT.prototype.rename = function(name) {
	return this.dictionary[name] || name;
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
	obj.dictionary = self.dictionary;
	obj.example = w.example;
	obj.preview = w.preview;
	obj.author = w.author;
	obj.name = w.name;

	var reg = /^(\/\w+|https\:\/|http\:\/)/i;

	Object.keys(options).waitFor(function(key, next) {
		var item = options[key];
		if (!reg.test(item.type))
			return next();
		AJAX('GET ' + item.type, function(response) {
			if (response instanceof Array) {
				item.type = 'array';
				item.values = [];
				response.forEach(function(val) {
					item.values.push({ text: val.text || val, value: val.text != null ? val : val });
				});
			}
			next();
		});
	}, function() {
		IMPORTSET('formconfigure', 'common.form', 'configure', 'form-configure');
		SET('formconfigure', obj);
	});
	return self;
};

WIDGET_COMPONENT.prototype.emit = function(name) {

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

WIDGET_COMPONENT.prototype.data = function(response, type) {

	var self = this;
	var obj;

	if (response instanceof Array)
		obj = response.slice(0);
	else if (response) {
		if (typeof(response) === 'object')
			obj = CLONE(response);
		else
			obj = response;
	} else
		obj = null;

	self.$data = CLONE(obj);

	if (obj && self.render) {
		self.render(obj, self.size, self.$render, type);
		EMIT(self.id, 'render', obj, self.size, self.$render++, type);
		!self.$loaded && self.element.closest('.widget').find('.widget-loading').removeClass('widget-loading-show');
		self.$loaded = true;
	}

	return self;
};

WIDGET_COMPONENT.prototype.getDimension = function() {
	return this.size.device + this.size.rows + 'x' + this.size.cols;
};

WIDGET_COMPONENT.prototype.toggle = function(cls, enable) {
	var self = this;
	self.element.toggleClass(cls, enable);
	return self;
};

WIDGET_COMPONENT.prototype.refresh = function(type) {
	var self = this;
	if (self.$data && self.render) {
		var val = CLONE(self.$data);
		self.render(val, self.size, self.$render, type);
		EMIT(self.id, 'render', val, self.size, self.$render++, type);
	}
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
			WIDGET_MAKE(item.id, item.name, $('[data-instance="{0}"]'.format(item.id)), item.dictionary, item.type);
		});
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

function WIDGET_MAKE(id, name, element, dictionary, type) {
	var w = WIDGETS_DATABASE[name];
	if (!w) {
		window.console && console.warn('Widget "{0}" not found.'.format(name));
		return;
	}

	element.attr('data-widget', name);
	element.find('.widget-container').append('<div class="widget-body" />');
	element.removeClass('widget-empty').addClass('widget-instance');

	var component = new WIDGET_COMPONENT(id, name, element.find('.widget-body'), WIDGET_CONFIG(name, WIDGETS_USERSETTINGS[id]));
	var tmp;

	component.$name = name;
	component.$type = w.type instanceof Array ? w.type : w.type ? [w.type] : EMPTYARRAY;

	dictionary && Object.keys(dictionary).forEach(function(key) {
		component.dictionary[key] = dictionary[key];
	});

	WIDGETS_DASHBOARD.push(component);
	UPDATE('WIDGETS_DASHBOARD');
	w.make.call(component);
	component.size = WIDGET_GETSIZE(element);
	component.make && component.make(component.size);
	component.$state(0);
	component.element.css({ width: component.size.width, height: component.size.height, 'font-size': component.size.fontsize + '%' });
	element.removeClass('xs sm md lg').addClass(component.size.device);
}

function WIDGET_REMOVE(id, destroy) {
	var index = WIDGETS_DASHBOARD.findIndex('id', id);
	if (index === -1)
		return false;

	destroy = destroy === undefined ? true : destroy;

	var w = WIDGETS_DASHBOARD[index];
	WIDGETS_DASHBOARD.splice(index, 1);
	UPDATE('WIDGETS_DASHBOARD');

	destroy && w.element.parent().parent().hide().off().remove();

	w.element.parent().parent().removeClass('widget-nocenter');
	w.element.off();
	w.element.find('*').off();
	w.destroy && w.destroy();
	w.element.remove();
	w.dom = null;
	w.make = null;
	w.render = null;
	w.on = null;
	w.emit = null;
	w.data = null;
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

function EMIT(id, name) {
	var e = WIDGETS_EVENTS[id];
	if (!e || !e.length)
		return false;

	var argv = [];
	for (var i = 1; i < arguments.length; i++)
		argv.push(arguments[i]);

	for (var i = 2, length = arguments.length; i < length; i++)
		e[i].id === id && e[i].fn.apply(e.instance, argv);
}

function DATA(type, value) {

	if (value === undefined) {
		value = type;
		type = EMPTYARRAY;
	}

	if (typeof(type) === 'string')
		type = [type];

	var length = type.length;
	WIDGETS_DASHBOARD.forEach(function(w) {
		if (!w.data)
			return;
		for (var i = 0; i < length; i++) {
			if (!w.$type.length || w.$type.indexOf(type[i]) !== -1) {
				w.data(value, type[i]);
				return;
			}
		}
	});
}