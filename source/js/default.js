var settings = {};
var DEBUG = false;
var RELEASE = true;
var common = {};
var Icons = getIcons();

common.database = [];
common.events = {};
common.settings = {};
common.operations = {};
common.statics = {};
common.instances = [];
common.data = [];
common.designer = [];
common.sizing = {};

$(window).on('resize', resizewindow);

function resizewindow() {
	var d = WIDTH();
	var sizing = common.sizing;
	var b = $('.designer-container');

	if (sizing.display && sizing.display !== d)
		b.rclass(sizing.display);

	b.aclass(d);
	sizing.display = d;

	var font = 24;

	switch (d) {
		case 'xs':
			var w = $(window).width();
			font = w > 500 ? 12 : w > 400 ? 10 : 9;
			break;
		case 'sm':
			font = 16;
			break;
		case 'md':
			font = 18;
			break;
		case 'lg':
			font = 24;
			break;
	}

	sizing.fontsize = font;
	b.css('font-size', font);
}

resizewindow();

SETTER(true, 'loading', 'hide', 1000);

common.operations.emit = function(name, a, b, c, d) {
	$('figure').each(function() {
		if (name === 'data')
			a = CLONE(a);
		this.$widget && this.$widget.$events[name] && this.$widget.emit(name, a, b, c, d);
	});
	return common.operations;
};

common.operations.remove = function(name, uninstall) {
	$('figure[data-name="{0}"]'.format(name)).each(function() {
		var instance = this.$widget;
		instance.emit('destroy');
		delete instance.$events;
		$(this).remove();
	});

	var item = common.database.findItem('name', name);
	common.database = common.database.remove('name', name);
	item && uninstall && SETTER('websocket', 'send', { TYPE: 'uninstall', body: item.filename });
	UPDATE('common.database', 1000);
};

function getScripts(html) {
	var obj = {};

	if (!html)
		return obj;
	
	var t = [];
	var otag = '<script';
	var ctag = '</script>';
	var ot = 0;
	var ct = 0;

	while (true) {
		ot = html.indexOf(otag, ot);
		if (ot === -1)
			break;
		t.push([0, ot]);
		ot = ot + 7;

	}

	while (true) {
		ct = html.indexOf(ctag, ct);
		if (ct === -1)
			break;
		t.push([1, ct]);
		ct = ct + 7;
	}

	if (!t.length)
		return false;

	t = t.sort((p, r) => p[1] - r[1]);

	var pairs = [];
	var depth = 1;
	var len = t.length;
	if (t[0][0] !== 0)
		return;
	var beg = t[0][1];
	for (var i = 1; i < len; i++) {
		if (t[i][0] === 0)
			depth++;
		else
			depth--;
		if (depth === 0) {
			pairs.push([beg, t[i][1]]);
			if (!t[i+1])
				break;
			beg = t[i+1][1];
		}
	}

	pairs.forEach(function(pair, index){
		var script = html.substring(pair[0], pair[1]);
		var br = script.indexOf('>') + 1;
		var type = script.substring(0, br);
		if (type.indexOf('markdown') !== -1)
			obj.readme = script.substring(br).trim();
		else if (type.indexOf('body') !== -1)
			obj.html = script.substring(br).trim();
		else if (type.indexOf('settings') !== -1)
			obj.settings = script.substring(br).trim();
		else if (type.indexOf('svg') !== -1)
			obj.svg = script.substring(br).trim();
		else
			obj.script = script.substring(br).trim();
	});

	beg = html.indexOf('<style');
	if (beg !== -1)
		obj.style = html.substring(html.indexOf('>', beg) + 1, html.indexOf('</style>')).trim();

	return obj;
};

common.operations.append = function(html, updated, filename) {

	var scripts = getScripts(html);

	var component = {};
	new Function('exports', scripts.script)(component);

	if (!component.name)
		return false;

	component.settings = scripts.settings;
	component.svg = scripts.svg;
	component.readme = scripts.readme;
	component.html = scripts.html;
	component.dateupdated = updated;
	component.filename = filename;

	if (scripts.style) {
		$('#inlinecss_' + component.name).remove();
		$('<style type="text/css" id="inlinecss_{0}">'.format(component.name) + scripts.style + '</style>').appendTo('head');
	}

	var index = common.database.findIndex('name', component.name);
	if (index === -1)
		common.database.push(component);
	else {
		var tmp = common.database[index];
		tmp.uninstall && tmp.uninstall(true);
		common.database[index] = component;
		var designer = FIND('designer');
		designer && designer.operations.upgrade(component);
	}

	common.database.quicksort('name');

	// hack for refreshing database
	common.form === 'database' && UPDATE('common.database');
	return true;
};

function Instance(id, element, declaration, options, size) {
	var self = this;
	self.$events = {};
	self.id = id;
	self.scope = 'scope' + id;
	self.name = declaration.name;
	self.options = $.extend(true, CLONE(declaration.options), options || {});

	self.$container = $(element.closest('.widget')[0]);
	self.element = element;

	self.dom = element[0];
	self.size = CLONE(size);

	if (self.size.padding > 0) {
		self.size.width -= self.size.padding * 2;
		self.size.height -= self.size.padding * 2;
	}

	declaration.install.call(self, self);

	var tmp = declaration.html;

	if (self.prerender)
		tmp = self.prerender(tmp);

	if (tmp) {
		element.html(tmp);
		tmp.indexOf('data-jc="') !== -1 && COMPILE();
	}

	setTimeout(function() {
		self.make && self.make();
	}, 1);
}

Instance.prototype.emit = function(name) {
	var e = this.$events[name];
	if (e && e.length) {
		for (var i = 0, length = e.length; i < length; i++)
			e[i].call(this, arguments[1], arguments[2], arguments[3], arguments[4], arguments[5]);
	}
	return this;
};

Instance.prototype.on = function(name, fn) {
	var e = this.$events[name];
	!e && (this.$events[name] = e = []);
	e.push(fn);
	return this;
};

Instance.prototype.menu = function(items, el, callback, offsetX) {
	SETTER('controls', 'show', el || this.element, items, callback, offsetX);
	return this;
};

Instance.prototype.send = function(id, type, data) {
	if (data) {
		var msg = {};
		msg.TYPE = 'send';
		msg.id = id;
		msg.type = type;
		msg.body = data;
		SETTER('websocket', 'send', msg);
	} else {
		var msg = {};
		msg.TYPE = 'send';
		msg.id = id;
		msg.type = type;
		msg.body = data;
		setTimeout2('isend' + id + 'x' + (type || ''), function(msg) {
			SETTER('websocket', 'send', msg);
		}, 200, 10, msg);
	}
	return this;
};

Instance.prototype.destroy = function() {
	var self = this;
	if (self.element) {
		self.emit('destroy');
		delete self.$events;
		delete self.element[0].$widget;
		self.element.remove();
		self.element = null;
	}
	return self;
};

Instance.prototype.find = function(selector) {
	return this.element.find(selector);
};

Instance.prototype.append = function(value) {
	return this.element.append(value);
};

Instance.prototype.html = function(value) {
	return this.element.html(value);
};

Instance.prototype.event = function() {
	this.element.on.apply(this.element, arguments);
	return this;
};

Instance.prototype.css = function() {
	this.element.css.apply(this.element, arguments);
	return this;
};

Instance.prototype.empty = function() {
	this.element.empty();
	return this;
};

Instance.prototype.aclass = function(v) {
	this.element.aclass(v);
	return this;
};

Instance.prototype.rclass = function(v) {
	this.element.rclass(v);
	return this;
};

Instance.prototype.tclass = function(v, t) {
	this.element.tclass(v, t);
	return this;
};

Instance.prototype.hidden = function() {
	return this.$container.hclass('hidden');
};

Instance.prototype.hclass = function(v) {
	return this.element.hclass(v);
};

Instance.prototype.settings = function() {
	var self = this;
	staticContent(self, function() {
		common.selected = self.element.parent();
		var options = CLONE(self.options);
		EMIT('open.' + self.name, self, options);
		SET('settings.' + self.name, options, true);
		SET('common.form', 'settings-' + self.name);
		RESET('settings.' + self.name + '.*', 500);
	});
	return self;
};

Instance.prototype.transparent = function(t) {
	this.element.parent().tclass('transparent', t);
	return this;
};

String.prototype.parseTransform = function() {
	var prop = ['translate', 'matrix', 'rotate', 'skewX', 'skewY', 'scale'];
	var val = this.match(/(translate|matrix|rotate|skewX|skewY|scale)\(.*?\)/g);
	var obj = {};
	if (val) {
		for (var i = 0, length = val.length; i < length; i++) {
			var item = val[i];
			var index = item.indexOf('(');
			var v = item.substring(index + 1, item.length - 1).split(/,|\s/);
			var n = item.substring(0, index);
			obj[n] = {};
			switch (n) {
				case 'translate':
				case 'scale':
					obj[n].x = +v[0] || 0;
					obj[n].y = +v[1] || 0;
					break;
				case 'rotate':
					obj[n].a = +v[0] || 0;
					obj[n].x = +v[1] || 0;
					obj[n].y = +v[2] || 0;
					break;
				case 'skewX':
				case 'skewY':
					obj[n].a = +v[0];
					break;
				case 'matrix':
					obj[n].a = +v[0] || 0;
					obj[n].b = +v[1] || 0;
					obj[n].c = +v[2] || 0;
					obj[n].d = +v[3] || 0;
					obj[n].e = +v[4] || 0;
					obj[n].f = +v[5] || 0;
					break;
			}
		}
	}

	obj.toString = function() {
		var builder = [];
		for (var i = 0, length = prop.length; i < length; i++) {
			var n = prop[i];
			var o = this[n];
			if (!o)
				continue;
			switch (n) {
				case 'translate':
				case 'scale':
					builder.push(n + '(' + o.x + ',' + o.y + ')');
					break;
				case 'rotate':
					builder.push(n + '(' + o.a + ' ' + o.x + ' ' + o.y + ')');
					break;
				case 'skewX':
				case 'skewY':
					builder.push(n + '(' + o.a + ')');
					break;
				case 'matrix':
					builder.push(n + '(' + o.a + ',' + o.b + ',' + o.c + ',' + o.d + ',' + o.e + ',' + o.f + ')');
					break;
			}
		}
		return builder.join(' ');
	};

	return obj;
};

$.fn.getPosition = function(fixed) {
	var obj = {};
	obj.x = this.css('left').parseInt();
	obj.y = this.css('top').parseInt();
	obj.width = fixed ? this.width() : this.innerWidth();
	obj.height = fixed ? this.height() : this.innerHeight();
	var matrix = this.css('transform');
	if (matrix) {
		var values = matrix.substring(1, matrix.length - 1).trim();
		values = values.split(',').trim();
		obj.rotation = Math.round(Math.asin(values[1]) * (180 / Math.PI));
	} else
		obj.rotation = null;
	return obj;
};

$.fn.setPosition = function(obj) {
	var css = {};
	obj.x != null && (css.left = obj.x + 'px');
	obj.y != null && (css.top = obj.y + 'px');
	obj.width != null && (css.width = obj.width + 'px');
	obj.height != null && (css.height = obj.height + 'px');
	obj.rotation != null && (css.transform = 'rotate({0}deg)'.format(obj.rotation));
	this.css(css);
	return this;
};

function getIcons() {
	var classes = document.styleSheets[0].rules || document.styleSheets[0].cssRules;
	var icons = {};
	for (var x = 0; x < classes.length; x++) {
		var cls = classes[x];
		var sel = cls.selectorText;
		if (sel && sel.substring(0, 4) == '.fa-') {
			sel = sel.substring(4, sel.indexOf(':')).trim();
			var val = cls.cssText ? cls.cssText : cls.cssText.style.cssText;
			var a = val.match(/[^x00-x7F]+/);
			if (a)
				icons[sel] = a.toString();
		}
	}
	return icons;
}