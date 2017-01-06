window.TAU = 2 * Math.PI;
window.DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
window.DAYS_SHORT = ['SU','MO','TU','WE','TH','FR','SO'];
window.MONTHS = ['January', 'February', 'March', 'April', 'May', 'Juny', 'July', 'August', 'September', 'October', 'November', 'December'];
window.MONTHS_SHORT = ['Jan.', 'Feb.', 'Mar.', 'Apr.', 'May', 'Juny', 'July', 'Aug.', 'Sep.', 'Oct.', 'Nov.', 'Dec.'];
window.user = { id: '1234567890', name: 'Peter Širka', photo: 'https://dashboard.totaljs.com/img/petersirka.jpg' };

var CLASS_SIZE = 'noxs xs sm md lg cols1 cols2 cols3 cols4 cols5 cols6 rows1 rows2 rows3 rows4 rows5 rows6 g1x1 g1x2 g1x3 g1x4 g1x5 g1x6 g2x1 g2x2 g2x3 g2x4 g2x5 g2x6 g3x1 g3x2 g3x3 g3x4 g3x5 g3x6 g4x1 g4x2 g4x3 g4x4 g4x5 g4x6 g5x1 g5x2 g5x3 g5x4 g5x5 g5x6 g6x1 g6x2 g6x3 g6x4 g6x5 g6x6';
var size = { device: 'lg', width: 165, height: 150 };
var options = {};
var current = null;
var globalconfig = {};
var globalevents = {};
var currentdata = null;
var widgetready = false;

function DATA(type, value) {

	if (value === undefined) {
		value = type;
		type = undefined;
	}

	if (value)
		currentdata = value;

	var seltype;

	if (type) {
		if (typeof(type) === 'string')
			type = [type];

		if (current.$type.length) {
			var has = false;
			for (var i = 0, length = type.length; i < length; i++) {
				if (current.$type.indexOf(type[i]) !== -1) {
					seltype = type[i];
					has = true;
					break;
				}
			}
			if (!has)
				return;
		}
	}

	currentdata && widgetready && current.render && current.render(currentdata, current.size, current.$render++, seltype);
}

function WIDGET(name, declaration, init) {
	setTimeout(function() {
		$WIDGET(name, declaration, init);
	}, 50);
}

function $WIDGET(name, declaration, init) {
	var obj = {};
	current = obj;
	obj.$datasource = 0;
	obj.$render = 0;
	obj.$dimension = {};
	obj.options = {};
	obj.element = $('#widget').find('.widget-body');
	obj.id = 'xd0upct0ch';
	obj.$name = obj.name = name;
	obj.dom = obj.element.get(0);
	obj.dictionary = {};

	obj.emit = function(name) {

		var items = globalevents[name];
		if (!items)
			return obj;

		var argv = [];
		for (var i = 1; i < arguments.length; i++)
			argv.push(arguments[i]);

		var context = {};
		context.id = obj.id;
		context.name = obj.name;

		items.forEach(function(w) {
			w.fn.apply(context, argv);
		});

		return obj;
	};

	obj.on = function(name, fn) {
		if (!globalevents[name])
			globalevents[name] = [];
		globalevents[name].push({ id: obj.id, fn: fn, instace: this });
		return obj;
	};

	obj.toggle = function(cls, enable) {
		obj.element.toggleClass(cls, enable);
		return obj;
	};

	obj.css = obj.style = function(name, value) {
		obj.element.css(name, value);
		return obj;
	};

	obj.dimension = function(device, size, values) {

		if (!device) {
			var tmp = obj.$dimension[obj.size.device + obj.size.cols + 'x' + obj.size.rows];
			return tmp ? tmp() : EMPTYOBJECT;
		}

		if (!values) {
			var tmp = obj.$dimension[device + size];
			return tmp ? tmp() : EMPTYOBJECT;
		}

		obj.$dimension[device + size] = new Function('return { ' + values.trim() + '}');
		return obj;
	};

	obj.getDimension = function() {
		return obj.size.device + obj.size.rows + 'x' + obj.size.cols;
	};

	obj.center = function(enable) {
		obj.element.parent().parent().toggleClass('widget-nocenter', !enable);
		return obj;
	};

	obj.$make = function() {
		clearTimeout(window.async);
		window.async = setTimeout(function() {
			size = getDevice();
			obj.size = getDimension(size.device);
			$('.widget-size').html(obj.size.width + '<b>x</b>' + obj.size.height);
			widget_refresh();
			widgetready = true;
			obj.make && obj.make(obj.size);
			obj.state && obj.state(0);
			currentdata && obj.refresh();
		}, 50);
	};

	obj.config = function(name, value) {
		if (value === undefined)
			return globalconfig[name];
		globalconfig[name] = value;
		return value;
	};

	obj.html = function(value) {
		obj.element.empty().append(value);
		return obj;
	};

	obj.append = function(value) {
		obj.element.append(value);
		return obj;
	};

	obj.empty = function() {
		obj.element.empty();
		return obj;
	};

	obj.find = function(selector) {
		return obj.element.find(selector);
	};

	obj.rename = function(name) {
		return obj.dictionary[name] || name;
	};

	obj.refresh = function(type) {
		obj.render && setTimeout(function() {
			obj.render(currentdata, obj.size, obj.$render++, type);
		}, 100);
		return obj;
	};

	obj.nodata = function(visible) {

		if (visible === undefined)
			visible = true;

		if (!visible) {
			obj.$nodata && obj.$nodata.addClass('hidden');
			return obj;
		}

		if (obj.$nodata) {
			obj.$nodata.removeClass('hidden');
			return obj;
		}

		obj.element.append('<div class="widget-nodata"><div><div><i class="fa fa-ban"></i></div></div></div>');
		obj.$nodata = self.find('.widget-nodata');
		return obj;
	};

	obj.notify = function(icon, message, callback) {
		SETTER('notifications', 'append', icon, message, callback);
		return obj;
	};

	obj.warning = function(message, icon) {
		SETTER('message', 'warning', message, icon);
		return obj;
	};

	obj.success = function(message, icon) {
		SETTER('message', 'success', message, icon);
		return obj;
	};

	obj.confirm = function(message, buttons, callback) {
		SETTER('confirm', 'confirm', message, buttons, callback);
		return obj;
	};

	obj.tooltip = function() {
		var component = FIND('tooltip');

		if (!component)
			return obj;

		if (arguments[0] === false) {
			component.hide();
			return obj;
		}

		component.show.apply(component, arguments);
		return obj;
	};

	obj.use = function(url, data, headers, cookies) {

		if (typeof(data) === 'function') {
			headers = callback;
			callback = data;
			data = undefined;
		} else if (typeof(callback) === 'object') {
			var tmp = headers;
			headers = callback;
			callback = tmp;
		}

		return obj.ajax(url, data, function(err, response) {
			!err && response && obj.data(response);
		}, headers, cookies);
	};

	obj.ajax = function(url, data, callback, headers, cookies) {

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

		return obj;
	};

	declaration.call(obj);
	obj.$make();

	var objinit = {};
	var counter = 0;
	objinit.dictionary = {};

	init && init.call(objinit, function(key, label, def, type, max, min, step, validator) {
		obj.options[key] = def;
	}, function(url) {
		counter++;
		clearTimeout(window.async);
		IMPORT('ONCE ' + url, function() {
			counter = counter - 1;
			!counter && obj.$make();
		});
	});

	obj.$type = objinit.type instanceof Array ? objinit.type : objinit.type ? [objinit.type] : EMPTYARRAY;

	Object.keys(objinit.dictionary).forEach(function(key) {
		obj.dictionary[key] = objinit.dictionary[key];
	});

	$('.preview-title').html(objinit.title || name);
	$('.preview-author').html(objinit.author || 'Unknown author');

	document.title = 'Preview: ' + (objinit.title || name);
	objinit.preview && $('.preview img').attr('src', objinit.preview);

	var square = [];
	var recth = [];
	var rectv = [];
	var others = [];

	if (!objinit.sizes || !objinit.sizes.length)
		objinit.sizes = '1x1,2x2,3x3,4x4,5x5,6x6,1x2,1x3,1x4,1x5,1x6,2x1,3x1,4x1,5x1,6x1,2x3,2x4,2x5,2x6,3x2,3x4,3x5,3x6,4x2,4x3,4x5,4x6,5x2,5x3,5x4,5x6,6x2,6x3,6x4,6x5,3x2,4x2,5x2,6x2,2x3,4x3,5x3,6x3,2x4,3x4,5x4,6x4,2x5,3x5,4x5,6x5,2x6,3x6,4x6,5x6'.split(',');

	objinit.sizes.forEach(function(val) {
		if (!val)
			return;
		var arr = val.split('x');
		if (arr[0] === arr[1])
			return square.push('<option value="{0}">Grid: {0}</option>'.format(val));
		if (arr[0] === '1')
			return rectv.push('<option value="{0}">Grid: {0}</option>'.format(val));
		if (arr[1] === '1')
			return recth.push('<option value="{0}">Grid: {0}</option>'.format(val));
		others.push('<option value="{0}">Grid: {0}</option>'.format(val));
	});

	var builder = [];

	if (square.length) {
		builder.push('<optgroup label="Square">');
		square.forEach(function(val) {
			builder.push(val);
		});
		builder.push('</optgroup>');
	}

	if (rectv.length) {
		builder.push('<optgroup label="Rectangle - vertical">');
		rectv.forEach(function(val) {
			builder.push(val);
		});
		builder.push('</optgroup>');
	}

	if (recth.length) {
		builder.push('<optgroup label="Rectangle - horizontal">');
		recth.forEach(function(val) {
			builder.push(val);
		});
		builder.push('</optgroup>');
	}

	if (others.length) {
		builder.push('<optgroup label="Others">');
		others.forEach(function(val) {
			builder.push(val);
		});
		builder.push('</optgroup>');
	}

	$('#grid').html(builder.join(''));

	loadsettings();

	if (!objinit.example)
		return;

	if (typeof(objinit.example) === 'string') {
		try {
			DATA(JSON.parse(objinit.example));
		} catch (e) {};
	} else
		DATA(objinit.example);
};

function widget_refresh() {
	var s = getDimension(size.device);
	$('#widget,.widget-container,.widget-body').css({ width: s.width, height: s.height, 'font-size': s.fontsize + '%' });
	$('#widget').removeClass(CLASS_SIZE).addClass(size.device + ' cols' + s.cols + ' rows' + s.rows + ' g' + s.rows + 'x' + s.cols + (s.device !== 'xs' ? ' noxs' : ''));
}

function getDimension(device) {
	var sizes = $('#grid').val().split('x');
	var rows = +sizes[0];
	var cols = +sizes[1];
	var d = getDeviceWidth(device);

	if (cols === 1 || rows === 1)
		d.fontsizeratio += 0.25;

	var fh = ((rows * 10) + 40) / d.fontsizeratio;
	var fw = ((cols * 10) + 40) / d.fontsizeratio;
	var fa = rows > cols ? fw : fh;

	return { device: device, x: 0, y: 0, width: device === 'xs' ? size.width : cols * size.width + (cols - 1) * 30, height: device === 'xs' ? size.height : rows * size.height + (rows - 1) * 30, w: size.width, h: size.height, rows: rows, cols: cols, ratio: 1.1, ratioW: d.ratioW, ratioH: d.ratioH, fontsizeratio: d.fontsizeratio, fontsize: fa, fontsizeH: fh, fontsizeW: fw, percentageW: ((cols / 6) * 100) >> 0, percentageH: ((rows / 6) * 100) >> 0 };
}

function getDevice() {
	var type = $('#device').val();
	var obj = getDeviceWidth(type);
	obj.device = type;
	return obj;
}

function getDeviceWidth(type) {
	var obj = {};
	switch (type) {
		case 'lg':
			obj.width = 165;
			obj.height = 150;
			obj.ratioW = 1;
			obj.ratioH = 1;
			obj.fontsizeratio = 1;
			break;
		case 'md':
			obj.width = 131.66;
			obj.height = 107.25;
			obj.ratioW = 1.253;
			obj.ratioH = 1.398;
			obj.fontsizeratio = 1.1;
			break;
		case 'sm':
			obj.width = 95;
			obj.height = 86.36;
			obj.ratioW = 1.736;
			obj.ratioH = 1.744;
			obj.fontsizeratio = 1.2;
			break;
		case 'xs':
			obj.width = 370;
			obj.height = 336.36;
			obj.ratioW = 0.445;
			obj.ratioH = 0.446;
			obj.fontsizeratio = 0.6;
			break;
	}
	return obj;
}

function loadsettings() {
	var data = localStorage.getItem(HASH(location.href));
	if (data) {
		try {
			data = JSON.parse(data);
			size.device = data.device;
			$('#grid').val(data.grid);
			$('#device').val(data.device);
		} catch (e) {};
	}
}

$(document).ready(function() {
	$('#grid,#device').on('change', function() {
		size = getDevice();
		current.size = getDimension(size.device);
		$('#widget,.widget-container,.widget-body').css({ width: current.size.width, height: current.size.height, 'font-size': current.size.fontsize + '%' });
		$('#widget').removeClass(CLASS_SIZE).addClass(current.size.device + ' cols' + current.size.cols + ' rows' + current.size.rows + ' g' + current.size.rows + 'x' + current.size.cols + (current.size.device !== 'xs' ? ' noxs' : ''));
		var dimension = current.$dimension[size.device + current.size.rows + 'x' + current.size.cols];
		current.resize && current.resize(current.size, dimension ? dimension() : EMPTYOBJECT);
		$('.widget-size').html(current.size.width + '<b>x</b>' + current.size.height);
		localStorage.setItem(HASH(location.href), JSON.stringify({ grid: $('#grid').val(), device: $('#device').val() }));
	});
});

Number.prototype.filesize = function(decimals, type) {

	if (typeof(decimals) === 'string') {
		var tmp = type;
		type = decimals;
		decimals = tmp;
	}

	var value;

	// this === bytes
	switch (type) {
		case 'bytes':
			value = this;
			break;
		case 'KB':
			value = this / 1024;
			break;
		case 'MB':
			value = filesizehelper(this, 2);
			break;
		case 'GB':
			value = filesizehelper(this, 3);
			break;
		case 'TB':
			value = filesizehelper(this, 4);
			break;
		default:

			type = 'bytes';
			value = this;

			if (value > 1023) {
				value = value / 1024;
				type = 'KB';
			}

			if (value > 1023) {
				value = value / 1024;
				type = 'MB';
			}

			if (value > 1023) {
				value = value / 1024;
				type = 'GB';
			}

			if (value > 1023) {
				value = value / 1024;
				type = 'TB';
			}

			break;
	}

	type = ' ' + type;
	return (decimals === undefined ? value.format(2).replace('.00', '') : value.format(decimals)) + type;
};

function filesizehelper(number, count) {
	while (count--) {
		number = number / 1024;
		if (number.toFixed(3) === '0.000')
			return 0;
	}
	return number;
}