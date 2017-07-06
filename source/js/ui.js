COMPONENT('exec', function() {
	var self = this;
	self.readonly();
	self.blind();
	self.make = function() {
		self.event('click', self.attr('data-selector') || '.exec', function() {
			var el = $(this);
			var attr = el.attr('data-exec');
			var path = el.attr('data-path');
			attr && EXEC(attr, el);
			path && SET(path, new Function('return ' + el.attr('data-value'))());
		});
	};
});

COMPONENT('error', function() {
	var self = this;

	self.readonly();

	self.make = function() {
		self.classes('ui-error hidden');
	};

	self.setter = function(value) {

		if (!(value instanceof Array) || !value.length) {
			self.toggle('hidden', true);
			return;
		}

		var builder = [];
		for (var i = 0, length = value.length; i < length; i++)
			builder.push('<div><span class="fa fa-times-circle"></span>{0}</div>'.format(value[i].error));

		self.html(builder.join(''));
		self.toggle('hidden', false);
	};
});

COMPONENT('search', function() {

	var self = this;
	var options_class;
	var options_selector;
	var options_attribute;
	var options_delay;

	self.readonly();
	self.make = function() {
		options_class = self.attr('data-class') || 'hidden';
		options_selector = self.attr('data-selector');
		options_attribute = self.attr('data-attribute') || 'data-search';
		options_delay = (self.attr('data-delay') || '200').parseInt();
	};

	self.setter = function(value) {

		if (!options_selector || !options_attribute || value == null)
			return;

		KEYPRESS(function() {

			var elements = self.find(options_selector);

			if (!value) {
				elements.removeClass(options_class);
				return;
			}

			var search = value.toSearch();
			var hide = [];
			var show = [];

			elements.toArray().waitFor(function(item, next) {
				var el = $(item);
				var val = (el.attr(options_attribute) || '').toSearch();
				if (val.indexOf(search) === -1)
					hide.push(el);
				else
					show.push(el);
				setTimeout(next, 3);
			}, function() {

				hide.forEach(function(item) {
					item.toggleClass(options_class, true);
				});

				show.forEach(function(item) {
					item.toggleClass(options_class, false);
				});
			});

		}, options_delay, 'search' + self.id);
	};
});

COMPONENT('binder', function() {

	var self = this;
	var keys;
	var keys_unique;

	self.readonly();
	self.blind();

	self.make = function() {
		self.watch('*', self.autobind);
		self.scan();

		self.on('component', function() {
			setTimeout2(self.id, self.scan, 200);
		});

		self.on('destroy', function() {
			setTimeout2(self.id, self.scan, 200);
		});
	};

	self.autobind = function(path) {
		var mapper = keys[path];
		var template = {};
		mapper && mapper.forEach(function(item) {
			var value = self.get(item.path);
			template.value = value;
			item.classes && classes(item.element, item.classes(value));
			item.visible && item.element.toggleClass('hidden', item.visible(value) ? false : true);
			item.html && item.element.html(item.html(value));
			item.template && item.element.html(item.template(template));
			item.disabled && item.element.prop('disabled', item.disabled(value) ? false : true);
		});
	};

	function classes(element, val) {
		var add = '';
		var rem = '';
		val.split(' ').forEach(function(item) {
			switch (item.substring(0, 1)) {
				case '+':
					add += (add ? ' ' : '') + item.substring(1);
					break;
				case '-':
					rem += (rem ? ' ' : '') + item.substring(1);
					break;
				default:
					add += (add ? ' ' : '') + item;
					break;
			}
		});
		rem && element.removeClass(rem);
		add && element.addClass(add);
	}


	function decode(val) {
		return val.replace(/\&\#39;/g, '\'');
	}

	self.scan = function() {
		keys = {};
		keys_unique = {};
		self.find('[data-b]').each(function() {

			var el = $(this);
			var path = el.attr('data-b');
			var arr = path.split('.');
			var p = '';

			var classes = el.attr('data-b-class');
			var html = el.attr('data-b-html');
			var visible = el.attr('data-b-visible');
			var disabled = el.attr('data-b-disabled');
			var obj = el.data('data-b');

			keys_unique[path] = true;

			if (!obj) {
				obj = {};
				obj.path = path;
				obj.element = el;
				obj.classes = classes ? FN(decode(classes)) : undefined;
				obj.html = html ? FN(decode(html)) : undefined;
				obj.visible = visible ? FN(decode(visible)) : undefined;
				obj.disabled = disabled ? FN(decode(disabled)) : undefined;

				if (obj.html) {
					var tmp = el.find('script[type="text/html"]');
					var str = '';
					if (tmp.length)
						str = tmp.html();
					else
						str = el.html();

					if (str.indexOf('{{') !== -1) {
						obj.template = Tangular.compile(str);
						tmp.length && tmp.remove();
					}
				}

				el.data('data-b', obj);
			}

			for (var i = 0, length = arr.length; i < length; i++) {
				p += (p ? '.' : '') + arr[i];
				if (keys[p])
					keys[p].push(obj);
				else
					keys[p] = [obj];
			}

		});

		Object.keys(keys_unique).forEach(function(key) {
			self.autobind(key, self.get(key));
		});

		return self;
	};

});

COMPONENT('confirm', function() {
	var self = this;
	var is = false;
	var visible = false;

	self.readonly();
	self.singleton();

	self.make = function() {
		self.toggle('ui-confirm hidden', true);
		self.event('click', 'button', function() {
			self.hide($(this).attr('data-index').parseInt());
		});

		self.event('click', function(e) {
			var t = e.target.tagName;
			if (t !== 'BUTTON')
				return;
			var el = self.find('.ui-confirm-body');
			el.addClass('ui-confirm-click');
			setTimeout(function() {
				el.removeClass('ui-confirm-click');
			}, 300);
		});

		$(window).on('keydown', function(e) {
			if (!visible)
				return;
			var index = e.keyCode === 13 ? 0 : e.keyCode === 27 ? 1 : null;
			if (index != null) {
				self.find('button[data-index="{0}"]'.format(index)).trigger('click');
				e.preventDefault();
			}
		});
	};

	self.confirm = function(message, buttons, fn) {
		self.callback = fn;

		var builder = [];

		buttons.forEach(function(item, index) {
			builder.push('<button data-index="{1}">{0}</button>'.format(item, index));
		});

		self.content('ui-confirm-warning', '<div class="ui-confirm-message">{0}</div>{1}'.format(message.replace(/\n/g, '<br />'), builder.join('')));
	};

	self.hide = function(index) {
		self.callback && self.callback(index);
		self.classes('-ui-confirm-visible');
		setTimeout2(self.id, function() {
			visible = false;
			self.classes('hidden');
		}, 1000);
	};

	self.content = function(cls, text) {
		!is && self.html('<div><div class="ui-confirm-body"></div></div>');
		self.find('.ui-confirm-body').empty().append(text);
		self.classes('-hidden');
		setTimeout2(self.id, function() {
			visible = true;
			self.classes('ui-confirm-visible');
		}, 5);
	};
});

COMPONENT('form', function() {

	var self = this;
	var autocenter;

	if (!MAN.$$form) {
		window.$$form_level = window.$$form_level || 1;
		MAN.$$form = true;
		$(document).on('click', '.ui-form-button-close', function() {
			SET($(this).attr('data-path'), '');
			window.$$form_level--;
		});

		$(window).on('resize', function() {
			FIND('form', true).forEach(function(component) {
				!component.element.hasClass('hidden') && component.resize();
			});
		});

		$(document).on('click', '.ui-form-container', function(e) {
			var el = $(e.target);
			if (!(el.hasClass('ui-form-container-padding') || el.hasClass('ui-form-container')))
				return;
			var form = $(this).find('.ui-form');
			var cls = 'ui-form-animate-click';
			form.addClass(cls);
			setTimeout(function() {
				form.removeClass(cls);
			}, 300);
		});
	}

	self.readonly();
	self.submit = self.cancel = function() { self.hide(); };
	self.onHide = function(){};

	self.hide = function() {
		self.set('');
		self.onHide();
	};

	self.resize = function() {
		if (!autocenter)
			return;
		var ui = self.find('.ui-form');
		var fh = ui.innerHeight();
		var wh = $(window).height();
		var r = (wh / 2) - (fh / 2);
		if (r > 30)
			ui.css({ marginTop: (r - 15) + 'px' });
		else
			ui.css({ marginTop: '20px' });
	};

	self.make = function() {

		var width = self.attr('data-width') || '800px';
		var enter = self.attr('data-enter');
		autocenter = self.attr('data-autocenter') === 'true';
		self.condition = self.attr('data-if');

		$(document.body).append('<div id="{0}" class="hidden ui-form-container"><div class="ui-form-container-padding"><div class="ui-form" style="max-width:{1}"><div class="ui-form-title"><span class="fa fa-times ui-form-button-close" data-path="{2}"></span>{3}</div>{4}</div></div>'.format(self._id, width, self.path, self.attr('data-title')));

		var el = $('#' + self._id);
		el.find('.ui-form').get(0).appendChild(self.element.get(0));
		self.classes('-hidden');
		self.element = el;

		self.event('scroll', function() {
			EMIT('reflow', self.name);
		});

		self.find('button').on('click', function() {
			window.$$form_level--;
			switch (this.name) {
				case 'submit':
					self.submit(self.hide);
					break;
				case 'cancel':
					!this.disabled && self[this.name](self.hide);
					break;
			}
		});

		enter === 'true' && self.event('keydown', 'input[type="text"]', function(e) {
			e.keyCode === 13 && !self.find('button[name="submit"]').get(0).disabled && self.submit(self.hide);
		});
	};

	self.setter = function() {

		setTimeout2('noscroll', function() {
			$('html').toggleClass('noscroll', $('.ui-form-container').not('.hidden').length ? true : false);
		}, 50);

		var isHidden = !EVALUATE(self.path, self.condition);
		self.toggle('hidden', isHidden);
		EMIT('reflow', self.name);

		if (isHidden) {
			self.release(true);
			self.find('.ui-form').removeClass('ui-form-animate');
			return;
		}

		self.resize();
		self.release(false);

		var el = self.find('input[type="text"],select,textarea');
		el.length && el.eq(0).focus();

		window.$$form_level++;
		self.css('z-index', window.$$form_level * 10);
		self.element.scrollTop(0);

		setTimeout(function() {
			self.find('.ui-form').addClass('ui-form-animate');
		}, 300);

		// Fixes a problem with freezing of scrolling in Chrome
		setTimeout2(self.id, function() {
			self.css('z-index', (window.$$form_level * 10) + 1);
		}, 1000);
	};
});

COMPONENT('loading', function() {
	var self = this;
	var pointer;

	self.readonly();
	self.singleton();

	self.make = function() {
		self.classes('ui-loading');
		self.append('<ul><li class="a"></li><li class="b"></li><li class="c"></li><li class="d"></li><li class="e"></li></ul>');
	};

	self.show = function() {
		clearTimeout(pointer);
		self.toggle('hidden', false);
		return self;
	};

	self.hide = function(timeout) {
		clearTimeout(pointer);
		pointer = setTimeout(function() {
			self.toggle('hidden', true);
		}, timeout || 1);
		return self;
	};
});

COMPONENT('repeater', function() {

	var self = this;
	var recompile = false;

	self.readonly();

	self.make = function() {
		var element = self.find('script');

		if (!element.length) {
			element = self.element;
			self.element = self.element.parent();
		}

		var html = element.html();
		element.remove();
		self.template = Tangular.compile(html);
		recompile = html.indexOf('data-jc="') !== -1;
	};

	self.setter = function(value) {

		if (!value || !value.length) {
			self.empty();
			return;
		}

		var builder = [];
		for (var i = 0, length = value.length; i < length; i++) {
			var item = value[i];
			item.index = i;
			builder.push(self.template(item).replace(/\$index/g, i.toString()));
		}

		self.html(builder);
		recompile && COMPILE();
	};
});

COMPONENT('repeater-group', function() {

	var self = this;
	var html;
	var template_group;
	var group;

	self.readonly();

	self.released = function(is) {
		if (is) {
			html = self.html();
			self.empty();
		} else
			html && self.html(html);
	};

	self.make = function() {
		group = self.attr('data-group');
		self.element.find('script').each(function(index) {
			var element = $(this);
			var html = element.html();
			element.remove();
			if (index)
				template_group = Tangular.compile(html);
			else
				self.template = Tangular.compile(html);
		});
	};

	self.setter = function(value) {

		if (!value || !value.length) {
			self.empty();
			return;
		}

		if (NOTMODIFIED(self.id, value))
			return;

		html = '';
		var length = value.length;
		var groups = {};

		for (var i = 0; i < length; i++) {
			var name = value[i][group];
			if (!name)
				name = '0';

			if (groups[name])
				groups[name].push(value[i]);
			else
				groups[name] = [value[i]];
		}

		var index = 0;
		var indexgroup = 0;
		var builder = '';
		var keys = Object.keys(groups);

		keys.sort();
		keys.forEach(function(key) {
			var arr = groups[key];
			var tmp = '';

			for (var i = 0, length = arr.length; i < length; i++) {
				var item = arr[i];
				item.index = index++;
				tmp += self.template(item).replace(/\$index/g, index.toString()).replace(/\$/g, self.path + '[' + index + ']');
			}

			if (key !== '0') {
				var options = {};
				options[group] = key;
				options.length = arr.length;
				options.index = indexgroup++;
				options.body = tmp;
				builder += template_group(options);
			}

		});

		self.empty().append(builder);
	};
});

COMPONENT('textbox', function() {

	var self = this;
	var isRequired = self.attr('data-required') === 'true';
	var validation = self.attr('data-validate');
	var input;
	var container;

	self.validate = function(value) {

		if (input.prop('disabled') || !isRequired)
			return true;

		var type = typeof(value);

		if (type === 'undefined' || type === 'object')
			value = '';
		else
			value = value.toString();

		EMIT('reflow', self.name);

		switch (self.type) {
			case 'email':
				return value.isEmail();
			case 'url':
				return value.isURL();
			case 'currency':
			case 'number':
				return value > 0;
		}

		return validation ? self.evaluate(value, validation, true) ? true : false : value.length > 0;
	};

	!isRequired && self.noValid();

	self.required = function(value) {
		self.find('.ui-textbox-label').toggleClass('ui-textbox-label-required', value);
		self.noValid(!value);
		isRequired = value;
		!value && self.state(1, 1);
	};

	self.make = function() {

		var attrs = [];
		var builder = [];
		var tmp;

		attrs.attr('type', self.type === 'password' ? self.type : 'text');
		attrs.attr('placeholder', self.attr('data-placeholder'));
		attrs.attr('maxlength', self.attr('data-maxlength'));
		attrs.attr('data-jc-keypress', self.attr('data-jc-keypress'));
		attrs.attr('data-jc-keypress-delay', self.attr('data-jc-keypress-delay'));
		attrs.attr('data-jc-bind', '');
		attrs.attr('name', self.path);

		tmp = self.attr('data-align');
		tmp && attrs.attr('class', 'ui-' + tmp);
		self.attr('data-autofocus') === 'true' && attrs.attr('autofocus');

		var content = self.html();
		var icon = self.attr('data-icon');
		var icon2 = self.attr('data-control-icon');
		var increment = self.attr('data-increment') === 'true';

		builder.push('<input {0} />'.format(attrs.join(' ')));

		if (!icon2 && self.type === 'date')
			icon2 = 'fa-calendar';
		else if (self.type === 'search') {
			icon2 = 'fa-search ui-textbox-control-icon';
			self.event('click', '.ui-textbox-control-icon', function() {
				self.$stateremoved = false;
				$(this).removeClass('fa-times').addClass('fa-search');
				self.set('');
			});
			self.getter2 = function(value) {
				if (self.$stateremoved && !value)
					return;
				self.$stateremoved = value ? false : true;
				self.find('.ui-textbox-control-icon').toggleClass('fa-times', value ? true : false).toggleClass('fa-search', value ? false : true);
			};
		}

		icon2 && builder.push('<div><span class="fa {0}"></span></div>'.format(icon2));
		increment && !icon2 && builder.push('<div><span class="fa fa-caret-up"></span><span class="fa fa-caret-down"></span></div>');
		increment && self.event('click', '.fa-caret-up,.fa-caret-down', function() {
			var el = $(this);
			var inc = -1;
			if (el.hasClass('fa-caret-up'))
				inc = 1;
			self.change(true);
			self.inc(inc);
		});

		self.type === 'date' && self.event('click', '.fa-calendar', function(e) {
			e.preventDefault();
			window.$calendar && window.$calendar.toggle($(this).parent().parent(), self.find('input').val(), function(date) {
				self.set(date);
			});
		});

		if (!content.length) {
			self.classes('ui-textbox ui-textbox-container');
			self.html(builder.join(''));
			input = self.find('input');
			container = self.find('.ui-textbox');
			return;
		}

		var html = builder.join('');
		builder = [];
		builder.push('<div class="ui-textbox-label{0}">'.format(isRequired ? ' ui-textbox-label-required' : ''));
		icon && builder.push('<span class="fa {0}"></span> '.format(icon));
		builder.push(content);
		builder.push(':</div><div class="ui-textbox">{0}</div>'.format(html));

		self.html(builder.join(''));
		self.classes('ui-textbox-container');
		input = self.find('input');
		container = self.find('.ui-textbox');
	};

	self.state = function(type) {
		if (!type)
			return;
		var invalid = self.isInvalid();
		if (invalid === self.$oldstate)
			return;
		self.$oldstate = invalid;
		container.toggleClass('ui-textbox-invalid', invalid);
	};
});

COMPONENT('importer', function() {
	var self = this;
	var imported = false;
	var reload = self.attr('data-reload');

	self.readonly();
	self.setter = function() {

		if (!self.evaluate(self.attr('data-if')))
			return;

		if (imported) {
			if (reload)
				EXEC(reload);
			else
				self.setter = null;
			return;
		}

		imported = true;
		self.import(self.attr('data-url'), function() {
			if (reload)
				EXEC(reload);
			else
				self.remove();
		});
	};
});

COMPONENT('visible', function() {
	var self = this;
	var processed = false;
	var template = self.attr('data-template');
	self.readonly();
	self.setter = function(value) {

		var is = true;
		var condition = self.attr('data-if');

		if (condition)
			is = self.evaluate(condition);
		else
			is = value ? true : false;

		if (is && template && !processed) {
			IMPORT(template, self);
			processed = true;
		}

		is && setTimeout2(self.id, function() {
			self.broadcast('reload')();
		}, 100);

		self.toggle('hidden', !is);
	};
});

COMPONENT('validation', function() {

	var self = this;
	var path;
	var elements;

	self.readonly();

	self.make = function() {
		elements = self.find(self.attr('data-selector') || 'button');
		elements.prop({ disabled: true });
		self.evaluate = self.attr('data-if');
		path = self.path.replace(/\.\*$/, '');
		self.watch(self.path, self.state, true);
	};

	self.state = function() {
		var disabled = DISABLED(path);
		if (!disabled && self.evaluate)
			disabled = !EVALUATE(self.path, self.evaluate);
		elements.prop({ disabled: disabled });
	};
});

COMPONENT('websocket', function() {

	var reconnect_timeout;
	var self = this;
	var ws, url;
	var queue = [];

	self.online = false;
	self.readonly();

	self.make = function() {
		reconnect_timeout = (self.attr('data-reconnect') || '2000').parseInt();
		url = self.attr('data-url');
		if (!url.match(/^(ws|wss)\:\/\//))
			url = (location.protocol.length === 6 ? 'wss' : 'ws') + '://' + location.host + (url.substring(0, 1) !== '/' ? '/' : '') + url;
		setTimeout(self.connect, 500);
		self.destroy = self.close;
	};

	self.send = function(obj) {
		if (ws)
			ws.send(encodeURIComponent(JSON.stringify(obj)));
		else
			queue.push(ws);
		return self;
	};

	self.close = function(isClosed) {
		if (!ws)
			return self;
		self.online = false;
		ws.onopen = ws.onclose = ws.onmessage = null;
		!isClosed && ws.close();
		ws = null;
		EMIT('online', false);
		return self;
	};

	function onClose() {
		self.close(true);
		setTimeout(function() {
			self.connect();
		}, reconnect_timeout);
	}

	function onMessage(e) {
		var data;
		try {
			data = PARSE(decodeURIComponent(e.data));
			self.attr('data-jc-path') && self.set(data);
		} catch (e) {
			window.console && console.warn('WebSocket "{0}": {1}'.format(url, e.toString()));
		}
		data && EMIT('message', data);
	}

	function onOpen() {
		self.online = true;
		EMIT('online', true);
		var cache = queue.splice(0);
		cache.waitFor(function(obj, next) {
			self.send(obj);
			setTimeout(next, 100);
		});
	}

	self.connect = function() {
		ws && self.close();
		setTimeout2(self.id, function() {
			ws = new WebSocket(url);
			ws.onopen = onOpen;
			ws.onclose = onClose;
			ws.onmessage = onMessage;
		}, 100);
		return self;
	};
});

COMPONENT('designer', function() {
	var self = this;
	var container, scroller;
	var move = {};
	var cells, widgets;
	var size;

	self.make = function() {

		self.classes('designer');
		self.append('<div class="container"><div class="widgets"></div><table class="grid"></table></div>');

		scroller = self.element.closest('.designer-scroll');
		container = self.find('.grid');

		var builder = [];
		for (var i = 0; i < 348; i++) {
			if (i % 12 === 0) {
				if (i)
					builder.push('</tr>');
				builder.push('<tr>');
			}
			builder.push('<td class="cell" data-grid="{0},{1}" data-index="{2}"><div class="space">&nbsp;</div></td>'.format(i % 12, Math.ceil((i + 1) / 12) - 1, i));
		}

		builder.push('</tr>');

		container.append(builder.join(''));
		cells = self.find('.cell');
		widgets = $(self.find('.widgets').eq(0));
		size = self.getSize();

		self.event('click', '.widget-settings', function(button) {
			var button = $(this);
			var el = button.closest('.widget');
			var widget = el.find('[data-name]').get(0);
			self.emit('designer.contextmenu', button, el, widget ? widget.$widget : null);
		});

		self.event('mousedown mousemove mouseup', function(e) {
			switch (e.type) {
				case 'mousemove':
					if (!move.drag)
						return;

					var target = $(e.target);
					if (target.hasClass('cell') || target.hasClass('space')) {
						self.mmove(e.pageX, e.pageY, e);
					} else {
						container.find('.selected').removeClass('selected');
						move.drag = false;
					}

					e.preventDefault();
					break;
				case 'mousedown':
					self.mdown(e.pageX, e.pageY, e);
					e.preventDefault();
					break;
				case 'mouseup':
					if (!move.drag)
						return;
					self.mup(e.pageX, e.pageY, e);
					e.preventDefault();
					break;
			}
		});

		self.event('touchstart touchmove touchend', function(evt) {
			var e = evt.touches[0];
			switch (evt.type) {
				case 'touchmove':

					if (!move.drag)
						return;

					var target = $(evt.target);
					if (target.hasClass('cell') || target.hasClass('space')) {
						self.mmove(e.pageX, e.pageY, e);
					} else {
						container.find('.selected').removeClass('selected');
						move.drag = false;
					}

					for (var i = 0, length = move.intervals.length; i < length; i++) {
						var int = move.intervals[i];
						if (e.pageX >= int.x && e.pageX <= int.w && e.pageY >= int.y && e.pageY <= int.h) {
							container.find('.selected').removeClass('selected');
							move.drag = false;
							evt.preventDefault();
							return;
						}
					}

					move.cacheX = e.pageX;
					move.cacheY = e.pageY;
					evt.preventDefault();
					break;

				case 'touchstart':

					var target = $(evt.target);
					if (!target.hasClass('cell'))
						return;

					move.intervals = [];
					var r = /px/;

					var off = container.offset();

					widgets.find('.widget.tab_' + common.tab.id).each(function() {
						var el = $(this);
						var obj = { x: (+el.css('left').replace(r, '')) - 8, y: (+el.css('top').replace(r, '')) - 8, w: (+el.css('width').replace(r, '')) + 8, h: (+el.css('height').replace(r, '')) + 8 };
						obj.x += off.left;
						obj.y += off.top;
						obj.w += obj.x;
						obj.h += obj.y;
						move.intervals.push(obj);
					});

					self.mdown(e.pageX, e.pageY, e);
					evt.preventDefault();
					break;

				case 'touchend':
					if (!move.drag)
						return;
					self.mup(move.cacheX, move.cacheY, e);
					evt.preventDefault();
					break;
			}
		});

		$(window).resize(self.operations.resize);
		WIDTH() === 'xs' && self.operations.resize();
	};

	self.getSize = function() {
		var obj = {};
		obj.width = container.parent().width();
		obj.cell = 100 / 12;
		obj.pixels = (obj.width / 100) * obj.cell;
		return obj;
	};

	self.mup = function(x, y, e) {
		move.drag = false;

		var selected = container.find('.selected');

		if (!selected.length)
			return;

		var first = selected.first();
		var last = selected.last();
		var grid = first.attr('data-grid').split(',');
		var c = +grid[0];
		var r = +grid[1];
		var off = self.getStartPosition(c, r);

		move.x = off.x;
		move.y = off.y;

		var offA = first.offset();
		var offB = last.offset();
		var cols = Math.ceil((offB.left - offA.left) / size.pixels) + 1;
		var rows = Math.ceil((offB.top - offA.top) / size.pixels) + 1;

		selected.addClass('locked').removeClass('selected');
		self.create(+first.attr('data-index'), cols, rows, common.tab.id, '', Date.now());
	};

	self.mdown = function(x, y, e) {
		move.drag = true;
		move.scrollX = scroller.prop('scrollLeft');
		move.scrollY = scroller.prop('scrollTop');
		var item = cells.eq(0);
		move.x = e.pageX - item.width();
		move.y = e.pageY - item.height();
	};

	self.mmove = function(x, y, e) {

		var fx = x > move.x ? move.x : x - size.pixels;
		var fy = y > move.y ? move.y : y - size.pixels;
		var tx = x > move.x ? x : move.x + size.pixels;
		var ty = y > move.y ? y : move.y + size.pixels;

		cells.each(function() {
			var el = $(this);
			var offset = el.offset();
			var is = offset.left >= fx && offset.left <= tx && offset.top >= fy && offset.top <= ty;

			el.toggleClass('selected', is);

			/*
			if (is && el.hasClass('locked')) {
				move.drag = false;
				cells.removeClass('selected');
			}
			*/

		});
	};

	self.create = function(index, cols, rows, tab, app, id) {
		var pos = self.getPosition(index);
		var html = '<div class="widget tab_{5} hidden" style="left:{0}px;top:{1}px;width:{2}px;height:{3}px" data-grid="{4}" data-tab="{5}" data-id="{7}"><div class="widget-toolbar"><button class="widget-settings"><i class="fa fa-wrench"></i></button></div><div class="widget-body">{6}</div></div>'.format(pos.col * size.pixels, pos.row * size.pixels, cols * size.pixels, rows * size.pixels, index + ',' + cols + ',' + rows, tab, app ? '<figure data-name="{0}" data-jc-scope="?"></figure>'.format(app) : '', id);
		html += '<div class="widget_offset tab_{1}" style="top:{0}px" data-id="{2}"></div>'.format((pos.row * size.pixels) + (rows * size.pixels) + 80, tab, id);
		widgets.append(html);
		self.operations.tab();
	};

	self.compile = function() {

		var size = self.getSize();
		var device = WIDTH();
		var csswh = {};

		widgets.find('figure[data-name]').each(function() {
			var el = $(this);
			if (this.$widget)
				return;

			var w = el.closest('.widget');
			var grid = w.attr('data-grid').split(',');
			var id = w.attr('data-id');

			var instance = common.designer.findItem('id', id);
			var declaration = common.database.findItem('name', el.attr('data-name'));

			if (!declaration)
				return;

			var opt = {};
			opt.cols = +grid[1];
			opt.rows = +grid[2];
			opt.device = device;
			opt.width = opt.cols * size.pixels;
			opt.height = opt.rows * size.pixels;

			if (!instance) {
				instance = { id: id, app: declaration.name, index: +grid[0], cols: opt.cols, rows: opt.rows, tab: self.attr('data-tab'), options: null };
				common.designer.push(instance);
			}

			this.$widget = new Instance(id, el, declaration, instance.options, opt);
			this.$widget.$events[device] && this.$widget.emit(device, opt);
			csswh.width = opt.width;
			csswh.height = opt.height;
			// this.$widget.css(csswh);
			var k = opt.cols + 'x' + opt.rows;
			this.$widget.$events[k] && this.$widget.emit(k, opt);
		});

		setTimeout2('designer.tabs', function() {
			self.operations.tab();
		}, 100);
	};

	self.getPosition = function(index) {
		var ri = (index / 12) >> 0;
		var ci = index % 12;
		return { row: ri, col: ci };
	};

	self.getStartPosition = function(col, row) {
		var obj = {};
		obj.x = col * size.pixels;
		obj.y = row * size.pixels;
		return obj;
	};

	self.operations = {};
	self.operations.save = function() {
		var items = [];

		widgets.find('.widget').each(function() {
			var el = $(this);
			var pos = el.attr('data-grid').split(',');
			var app = el.find('[data-name]');
			items.push({ id: el.attr('data-id'), index: +pos[0], cols: +pos[1], rows: +pos[2], tab: el.attr('data-tab'), app: app.length ? app.attr('data-name') : null, options: app.length ? app.get(0).$widget.options : null });
		});

		var data = {};
		data.items = items;
		return data;
	};

	self.operations.load = function(data, callback) {

		var arr = [];

		widgets.find('figure[data-name]').each(function() {
			arr.push(this.$widget);
		});

		arr.waitFor(function(item, next) {
			item.destroy();
			setTimeout(next, 30);
		}, function() {
			setTimeout2('designer.clear', function() {

				widgets.empty();
				data.items.forEach(function(item) {
					self.create(item.index, item.cols, item.rows, item.tab, item.app, item.id);
				});

				self.compile();

				common.tabs = data.tabs;

				if (!common.tabs || !common.tabs.length) {
					common.tabs = [];
					common.tabs.push({ id: Date.now().toString(), name: 'Main', icon: 'fa-object-ungroup', linker: 'main' });
				}

				UPDATE('common.tabs');
				SETTER('binder', 'scan');

				var hash = location.hash.substring(1);
				var tab = common.tabs.findItem('linker', hash);

				if (!tab)
					tab = common.tabs[0];

				SET('common.tab', tab);
				callback && setTimeout(callback, 100);

			}, widgets.length ? 500 : 0);
		});
	};

	self.operations.upgrade = function(component) {

		var arr = [];

		widgets.find('figure[data-name="{0}"]'.format(component.name)).each(function() {
			var el = $(this).parent();
			var widget = this.$widget;
			widget.destroy();
			arr.push({ el: el, html: '<figure data-name="{0}" data-jc-scope="?"></figure>'.format(component.name) });
		});

		setTimeout(function() {
			arr.waitFor(function(item, next) {
				item.el.html(item.html);
				next();
			}, self.compile);
		}, 100);
	};

	self.operations.tabclear = function(id) {
		widgets.find('.tab_' + id).each(function() {
			var el = $(this);
			var widget = el.find('figure[data-name]').get(0);

			if (!widget) {
				el.remove();
				return;
			}

			widget = widget.$widget;
			widget && widget.destroy();
			setTimeout(function() {
				el.remove();
			}, 100);
		});
	};

	self.operations.tab = function() {
		setTimeout2('designer.tabs', function() {
			widgets.find('.widget').each(function() {
				var el = $(this);
				var hidden = el.hasClass('hidden');
				if (el.hasClass('tab_' + common.tab.id)) {
					hidden && el.removeClass('hidden');
				} else {
					!hidden && el.addClass('hidden');
				}
			});
		}, 100);
	};

	self.operations.resize = function() {

		setTimeout2(self.id + '.resize', function() {
			var size = self.getSize();
			var device = WIDTH();
			var css = {};
			var csswh = {};

			cells.each(function() {
				var el = $(this);
				if (device !== 'xs')
					el.css('height', '');
				else
					el.css('height', size.pixels + 'px');
			});

			widgets.find('.widget').each(function() {
				var el = $(this);
				var grid = el.attr('data-grid').split(',');
				var rows = +grid[2];
				var cols = +grid[1];
				var index = +grid[0];
				var pos = self.getPosition(index);

				css.left = pos.col * size.pixels + 'px';
				css.top = pos.row * size.pixels + 'px';
				css.width = cols * size.pixels + 'px';
				css.height = rows * size.pixels + 'px';
				el.css(css);

				var app = el.find('[data-name]').get(0);
				if (app) {
					var opt = {};
					opt.cols = cols;
					opt.rows = rows;
					opt.device = device;
					opt.width = cols * size.pixels;
					opt.height = rows * size.pixels;
					csswh.width = opt.width;
					csswh.height = opt.height;
					if (app.$widget) {
						app.$widget.size = opt;
						app.$widget.$events.resize && app.$widget.emit('resize', opt);
						app.$widget.$events[device] && app.$widget.emit(device, opt);
					}
				}
			});
		}, 100, 10);
	};

});

COMPONENT('checkbox', function() {

	var self = this;
	var input;
	var isRequired = self.attr('data-required') === 'true';

	self.validate = function(value) {
		var type = typeof(value);
		if (input.prop('disabled') || !isRequired)
			return true;
		value = type === 'undefined' || type === 'object' ? '' : value.toString();
		return value === 'true' || value === 'on';
	};

	self.required = function(value) {
		self.find('span').toggleClass('ui-checkbox-label-required', value === true);
		isRequired = value;
		return self;
	};

	!isRequired && self.noValid();

	self.make = function() {
		self.classes('ui-checkbox');
		self.html('<div><i class="fa fa-check"></i></div><span{1}>{0}</span>'.format(self.html(), isRequired ? ' class="ui-checkbox-label-required"' : ''));
		self.event('click', function() {
			self.dirty(false);
			self.getter(!self.get(), 2, true);
		});
		input = self.find('input');
	};

	self.setter = function(value) {
		self.toggle('ui-checkbox-checked', value ? true : false);
	};
});

COMPONENT('checkboxlist', function() {

	var self = this;
	var isRequired = self.attr('data-required');
	var template = Tangular.compile('<div class="{0} ui-checkboxlist-checkbox"><label><input type="checkbox" value="{{ id }}"><span>{{ name }}</span></label></div>'.format(self.attr('data-class')));

	self.validate = function(value) {
		return isRequired ? value && value.length > 0 : true;
	};

	self.required = function(value) {
		isRequired = value;
		return self;
	};

	!isRequired && self.noValid();

	self.make = function() {

		self.event('click', 'input', function() {
			var arr = self.get() || [];
			var value = self.parser(this.value);
			var index = arr.indexOf(value);
			if (index === -1)
				arr.push(value);
			else
				arr.splice(index, 1);
			self.set(arr);
		});

		self.event('click', '.ui-checkboxlist-selectall', function() {
			var arr = [];
			var inputs = self.find('input');
			var value = self.get();

			if (value && inputs.length === value.length) {
				self.set(arr);
				return;
			}

			inputs.each(function() {
				arr.push(self.parser(this.value));
			});

			self.set(arr);
		});

		var datasource = self.attr('data-source');
		datasource && self.watch(datasource, function(path, value) {
			if (!value)
				value = [];
			self.redraw(value);
		}, true);

		var options = self.attr('data-options');
		if (!options)
			return;

		var arr = options.split(';');
		var datasource = [];

		for (var i = 0, length = arr.length; i < length; i++) {
			var item = arr[i].split('|');
			datasource.push({ id: item[1] === undefined ? item[0] : item[1], name: item[0] });
		}

		self.redraw(datasource);
	};

	self.setter = function(value) {
		self.find('input').each(function() {
			this.checked = value && value.indexOf(self.parser(this.value)) !== -1;
		});
	};

	self.redraw = function(arr) {
		var builder = [];
		var kn = self.attr('data-source-text') || 'name';
		var kv = self.attr('data-source-value') || 'id';

		for (var i = 0, length = arr.length; i < length; i++) {
			var item = arr[i];
			if (typeof(item) === 'string')
				builder.push(template({ id: item, name: item }));
			else
				builder.push(template({ id: item[kv] === undefined ? item[kn] : item[kv], name: item[kn] }));
		}

		if (!builder.length)
			return;

		var btn = self.attr('data-button') || '';
		if (btn)
			btn = '<div class="ui-checkboxlist-selectall"><a href="javascript:void(0)"><i class="fa fa-check-square-o mr5"></i>{0}</a></div>'.format(btn);

		builder.push('<div class="clearfix"></div>' + btn);
		self.html(builder.join(''));
		return self;
	};
});

COMPONENT('dropdowncheckbox', function() {

	var self = this;
	var required = self.element.attr('data-required') === 'true';
	var container;
	var data = [];
	var values;

	if (!window.$dropdowncheckboxtemplate)
		window.$dropdowncheckboxtemplate = Tangular.compile('<div><label><input type="checkbox" value="{{ index }}" /><span>{{ text }}</span></label></div>');

	var template = window.$dropdowncheckboxtemplate;

	self.validate = function(value) {
		return required ? value && value.length > 0 : true;
	};

	self.make = function() {

		var options = [];
		var element = self.element;
		var arr = (element.attr('data-options') || '').split(';');

		for (var i = 0, length = arr.length; i < length; i++) {
			var item = arr[i].split('|');
			var value = item[1] === undefined ? item[0] : item[1];
			if (self.type === 'number')
				value = parseInt(value);
			var obj = { value: value, text: item[0], index: i };
			options.push(template(obj));
			data.push(obj);
		}

		var content = element.html();
		var icon = element.attr('data-icon');
		var html = '<div class="ui-dropdowncheckbox"><span class="fa fa-sort"></span><div class="ui-dropdowncheckbox-selected"></div></div><div class="ui-dropdowncheckbox-values hidden">' + options.join('') + '</div>';

		if (content.length > 0) {
			element.empty();
			element.append('<div class="ui-dropdowncheckbox-label' + (required ? ' ui-dropdowncheckbox-label-required' : '') + '">' + (icon ? '<span class="fa ' + icon + '"></span> ' : '') + content + ':</div>');
			element.append(html);
		} else
			element.append(html);

		self.classes('ui-dropdowncheckbox-container');
		container = self.find('.ui-dropdowncheckbox-values');
		values = self.find('.ui-dropdowncheckbox-selected');

		self.event('click', '.ui-dropdowncheckbox', function(e) {

			var el = $(this);
			if (el.hasClass('ui-disabled'))
				return;

			container.toggleClass('hidden');

			if (window.$dropdowncheckboxelement) {
				window.$dropdowncheckboxelement.addClass('hidden');
				window.$dropdowncheckboxelement = null;
			}

			if (!container.hasClass('hidden'))
				window.$dropdowncheckboxelement = container;

			e.stopPropagation();
		});

		self.event('click', 'input,label', function(e) {

			e.stopPropagation();

			var is = this.checked;
			var index = parseInt(this.value);
			var value = data[index];

			if (value === undefined)
				return;

			value = value.value;

			var arr = self.get();
			if (!(arr instanceof Array))
				arr = [];

			var index = arr.indexOf(value);

			if (is) {
				if (index === -1)
					arr.push(value);
			} else {
				if (index !== -1)
					arr.splice(index, 1);
			}

			self.reset(true);
			self.set(arr, undefined, 2);
		});

		var ds = self.attr('data-source');

		if (!ds)
			return;

		self.watch(ds, prepare);
		setTimeout(function() {
			prepare(ds, GET(ds));
		}, 500);
	};

	function prepare(path, value) {

		if (NOTMODIFIED(path, value))
			return;

		var clsempty = 'ui-dropdowncheckbox-values-empty';

		if (!value) {
			container.addClass(clsempty).empty().html(self.attr('data-empty'));
			return;
		}

		var kv = self.attr('data-source-value') || 'id';
		var kt = self.attr('data-source-text') || 'name';
		var builder = '';

		data = [];
		for (var i = 0, length = value.length; i < length; i++) {
			var isString = typeof(value[i]) === 'string';
			var item = { value: isString ? value[i] : value[i][kv], text: isString ? value[i] : value[i][kt], index: i };
			data.push(item);
			builder += template(item);
		}

		if (builder)
			container.removeClass(clsempty).empty().append(builder);
		else
			container.addClass(clsempty).empty().html(self.attr('data-empty'));

		self.setter(self.get());
	}

	self.setter = function(value) {

		if (NOTMODIFIED(self.id, value))
			return;

		var label = '';
		var empty = self.attr('data-placeholder');

		if (value && value.length) {
			var remove = [];
			for (var i = 0, length = value.length; i < length; i++) {
				var selected = value[i];
				var index = 0;
				var is = false;

				while (true) {
					var item = data[index++];
					if (item === undefined)
						break;
					if (item.value != selected)
						continue;
					label += (label ? ', ' : '') + item.text;
					is = true;
				}

				if (!is)
					remove.push(selected);
			}

			var refresh = false;

			while (true) {
				var item = remove.shift();
				if (item === undefined)
					break;
				value.splice(value.indexOf(item), 1);
				refresh = true;
			}

			if (refresh)
				MAN.set(self.path, value);
		}

		container.find('input').each(function() {
			var index = parseInt(this.value);
			var checked = false;
			if (!value || !value.length)
				checked = false;
			else if (data[index])
				checked = data[index];
			if (checked)
				checked = value.indexOf(checked.value) !== -1;
			this.checked = checked;
		});

		if (!label && value) {
			// invalid data
			// it updates model without notification
			MAN.set(self.path, []);
		}

		if (!label && empty) {
			values.html('<span>{0}</span>'.format(empty));
			return;
		}

		values.html(label);
	};

	self.state = function() {
		self.find('.ui-dropdowncheckbox').toggleClass('ui-dropdowncheckbox-invalid', self.isInvalid());
	};

	if (window.$dropdowncheckboxevent)
		return;

	window.$dropdowncheckboxevent = true;
	$(document).on('click', function() {
		if (!window.$dropdowncheckboxelement)
			return;
		window.$dropdowncheckboxelement.addClass('hidden');
		window.$dropdowncheckboxelement = null;
	});
});

COMPONENT('dropdown', function() {

	var self = this;
	var isRequired = self.attr('data-required') === 'true';
	var select, container, condition;

	self.validate = function(value) {

		if (select.prop('disabled') || !isRequired)
			return true;

		var type = typeof(value);
		if (type === 'undefined' || type === 'object')
			value = '';
		else
			value = value.toString();

		EMIT('reflow', self.name);

		switch (self.type) {
			case 'currency':
			case 'number':
				return value > 0;
		}

		return value.length > 0;
	};

	!isRequired && self.noValid();

	self.required = function(value) {
		self.find('.ui-dropdown-label').toggleClass('ui-dropdown-label-required', value);
		self.noValid(!value);
		isRequired = value;
		!value && self.state(1, 1);
	};

	self.render = function(arr) {

		var builder = [];
		var value = self.get();
		var template = '<option value="{0}"{1}>{2}</option>';
		var propText = self.attr('data-source-text') || 'name';
		var propValue = self.attr('data-source-value') || 'id';
		var emptyText = self.attr('data-empty');

		emptyText !== undefined && builder.push('<option value="">{0}</option>'.format(emptyText));

		for (var i = 0, length = arr.length; i < length; i++) {
			var item = arr[i];
			if (condition && !condition(item))
				continue;
			if (item.length)
				builder.push(template.format(item, value === item ? ' selected="selected"' : '', item));
			else
				builder.push(template.format(item[propValue], value === item[propValue] ? ' selected="selected"' : '', item[propText]));
		}

		select.html(builder.join(''));
	};

	self.make = function() {

		var options = [];

		(self.attr('data-options') || '').split(';').forEach(function(item) {
			item = item.split('|');
			options.push('<option value="{0}">{1}</option>'.format(item[1] === undefined ? item[0] : item[1], item[0]));
		});

		self.classes('ui-dropdown-container');

		var label = self.html();
		var html = '<div class="ui-dropdown"><span class="fa fa-sort"></span><select data-jc-bind="">{0}</select></div>'.format(options.join(''));
		var builder = [];

		condition = self.attr('data-source-condition');
		if (condition)
			condition = FN(condition);

		if (label.length) {
			var icon = self.attr('data-icon');
			builder.push('<div class="ui-dropdown-label{0}">{1}{2}:</div>'.format(isRequired ? ' ui-dropdown-label-required' : '', icon ? '<span class="fa {0}"></span> '.format(icon) : '', label));
			builder.push('<div class="ui-dropdown-values">{0}</div>'.format(html));
			self.html(builder.join(''));
		} else
			self.html(html).addClass('ui-dropdown-values');

		select = self.find('select');
		container = self.find('.ui-dropdown');

		var ds = self.attr('data-source');
		if (!ds)
			return;

		var prerender = function() {
			var value = self.get(self.attr('data-source'));
			!NOTMODIFIED(self.id, value) && self.render(value || EMPTYARRAY);
		};

		self.watch(ds, prerender, true);
	};

	self.state = function(type) {
		if (!type)
			return;
		var invalid = self.isInvalid();
		if (invalid === self.$oldstate)
			return;
		self.$oldstate = invalid;
		container.toggleClass('ui-dropdown-invalid', invalid);
	};
});

COMPONENT('selectbox', function() {

	var self = this;
	var Eitems, Eselected;
	var isRequired = self.attr('data-required') === 'true';

	self.datasource = EMPTYARRAY;
	self.template = Tangular.compile('<li data-search="{{ search }}" data-index="{{ index }}">{{ text }}</li>');

	self.validate = function(value) {
		return isRequired ? value && value.length > 0 : true;
	};

	!isRequired && self.noValid();

	self.required = function(value) {
		self.noValid(!value);
		isRequired = value;
		!value && self.state(1, 1);
	};

	self.search = function() {
		var search = self.find('input').val().toSearch();

		Eitems.find('li').each(function() {
			var el = $(this);
			el.toggleClass('hidden', el.attr('data-search').indexOf(search) === -1);
		});

		self.find('.ui-selectbox-search-icon').toggleClass('fa-search', search.length === 0).toggleClass('fa-times', search.length > 0);
	};

	self.make = function() {
		var search = self.attr('data-search');

		self.append((typeof(search) === 'string' ? '<div class="ui-selectbox-search"><span><i class="fa fa-search ui-selectbox-search-icon"></i></span><div><input type="text" placeholder="{0}" /></div></div><div>'.format(search) : '') + '<div style="height:{0}"><ul></ul><ul style="height:{0}"></ul></div>'.format(self.attr('data-height') || '200px'));
		self.classes('ui-selectbox');

		self.find('ul').each(function(index) {
			if (index)
				Eselected = $(this);
			else
				Eitems = $(this);
		});

		var datasource = self.attr('data-source');
		datasource && self.watch(datasource, function(path, value) {
			var propText = self.attr('data-source-text') || 'name';
			var propValue = self.attr('data-source-value') || 'id';
			self.datasource = [];
			value && value.forEach(function(item, index) {

				var text;
				var value;

				if (typeof(item) === 'string') {
					text = item;
					value = self.parser(item);
				} else {
					text = item[propText];
					value = item[propValue];
				}

				self.datasource.push({ text: text, value: value, index: index, search: text.toSearch() });
			});
			self.redraw();
		}, true);

		datasource = self.attr('data-options');
		if (datasource) {
			var items = [];
			datasource.split(';').forEach(function(item, index) {
				var val = item.split('|');
				items.push({ text: val[0], value: self.parser(val[1] === undefined ? val[0] : val[1]), index: index, search: val[0].toSearch() });
			});
			self.datasource = items;
			self.redraw();
		}

		self.event('click', 'li', function() {
			var selected = self.get() || [];
			var index = this.getAttribute('data-index').parseInt();
			var value = self.datasource[index];

			if (selected.indexOf(value.value) === -1)
				selected.push(value.value);
			else
				selected = selected.remove(value.value);

			self.set(selected);
			self.change(true);
		});

		self.event('click', '.fa-times', function() {
			self.find('input').val('');
			self.search();
		});

		typeof(search) === 'string' && self.event('keydown', 'input', function() {
			setTimeout2(self.id, self.search, 500);
		});
	};

	self.redraw = function() {
		var builder = [];
		self.datasource.forEach(function(item) {
			builder.push(self.template(item));
		});
		self.search();
		Eitems.empty().append(builder.join(''));
	};

	self.setter = function(value) {
		var selected = {};
		var builder = [];

		for (var i = 0, length = self.datasource.length; i < length; i++) {
			var item = self.datasource[i];
			if (value && value.indexOf(item.value) !== -1)
				selected[i] = item;
		}

		Eitems.find('li').each(function() {
			var el = $(this);
			var index = el.attr('data-index').parseInt();
			el.toggleClass('ui-selectbox-selected', selected[index] !== undefined);
		});

		Object.keys(selected).forEach(function(key) {
			builder.push(self.template(selected[key]));
		});

		Eselected.empty().append(builder.join(''));
		self.search();
	};

	self.state = function(type) {
		if (!type)
			return;
		var invalid = self.isInvalid();
		if (invalid === self.$oldstate)
			return;
		self.$oldstate = invalid;
		self.toggle('ui-selectbox-invalid', invalid);
	};
});

COMPONENT('textboxlist', function() {
	var self = this;
	var container;
	var empty = {};
	var skip = false;

	self.template = Tangular.compile('<div class="ui-textboxlist-item"><div><i class="fa fa-times"></i></div><div><input type="text" maxlength="{{ max }}" placeholder="{{ placeholder }}" value="{{ value }}" /></div></div>');
	self.make = function() {

		empty.max = (self.attr('data-maxlength') || '100').parseInt();
		empty.placeholder = self.attr('data-placeholder');
		empty.value = '';

		var html = self.html();
		var icon = self.attr('data-icon');

		if (icon)
			icon = '<i class="fa {0}"></i>'.format(icon);

		self.toggle('ui-textboxlist');
		self.html((html ? '<div class="ui-textboxlist-label">{1}{0}:</div>'.format(html, icon) : '') + '<div class="ui-textboxlist-items"></div>' + self.template(empty).replace('-item"', '-item ui-textboxlist-base"'));
		container = self.find('.ui-textboxlist-items');

		self.event('click', '.fa-times', function() {
			var el = $(this);
			var parent = el.closest('.ui-textboxlist-item');
			var value = parent.find('input').val();
			var arr = self.get();

			parent.remove();

			var index = arr.indexOf(value);
			if (index === -1)
				return;
			arr.splice(index, 1);
			skip = true;
			self.set(self.path, arr, 2);
			self.change(true);
		});

		self.event('change keypress', 'input', function(e) {

			if (e.type !== 'change' && e.keyCode !== 13)
				return;

			var el = $(this);

			var value = this.value.trim();
			if (!value)
				return;

			var arr = [];
			var base = el.closest('.ui-textboxlist-base').length > 0;

			if (base && e.type === 'change')
				return;

			if (base) {
				self.get().indexOf(value) === -1 && self.push(self.path, value, 2);
				this.value = '';
				self.change(true);
				return;
			}

			container.find('input').each(function() {
				arr.push(this.value.trim());
			});

			skip = true;
			self.set(self.path, arr, 2);
			self.change(true);
		});
	};

	self.setter = function(value) {

		if (skip) {
			skip = false;
			return;
		}

		if (!value || !value.length) {
			container.empty();
			return;
		}

		var builder = [];

		value.forEach(function(item) {
			empty.value = item;
			builder.push(self.template(empty));
		});

		container.empty().append(builder.join(''));
	};
});

COMPONENT('autocomplete', function() {
	var self = this;
	var container;
	var old;
	var onSearch;
	var searchtimeout;
	var searchvalue;
	var blurtimeout;
	var onCallback;
	var datasource;
	var is = false;
	var margin = {};

	self.template = Tangular.compile('<li{{ if index === 0 }} class="selected"{{ fi }} data-index="{{ index }}"><span>{{ name }}</span><span>{{ type }}</span></li>');
	self.readonly();
	self.singleton();

	self.make = function() {
		self.classes('ui-autocomplete-container hidden');
		self.html('<div class="ui-autocomplete"><ul></ul></div>');
		container = self.find('ul');

		self.event('click', 'li', function(e) {
			e.preventDefault();
			e.stopPropagation();
			onCallback && onCallback(datasource[+$(this).attr('data-index')], old);
			self.visible(false);
		});

		self.event('mouseenter mouseleave', 'li', function(e) {
			$(this).toggleClass('selected', e.type === 'mouseenter');
		});

		$(document).on('click', function() {
			is && self.visible(false);
		});

		$(window).on('resize', function() {
			self.resize();
		});
	};

	function keydown(e) {
		var c = e.keyCode;
		var input = this;

		if (c !== 38 && c !== 40 && c !== 13) {
			if (c !== 8 && c < 32)
				return;
			clearTimeout(searchtimeout);
			searchtimeout = setTimeout(function() {
				var val = input.value;
				if (!val)
					return self.render(EMPTYARRAY);
				if (searchvalue === val)
					return;
				searchvalue = val;
				self.resize();
				onSearch(val, function(value) { self.render(value); });
			}, 200);
			return;
		}

		var current = self.find('.selected');

		if (c === 13) {
			self.visible(false);
			if (!current.length)
				return;
			onCallback(datasource[+current.attr('data-index')], old);
			e.preventDefault();
			e.stopPropagation();
			return;
		}

		e.preventDefault();
		e.stopPropagation();

		if (current.length) {
			current.removeClass('selected');
			current = c === 40 ? current.next() : current.prev();
		}

		if (!current.length)
			current = self.find('li:{0}-child'.format(c === 40 ? 'first' : 'last'));
		current.addClass('selected');
	}

	function blur() {
		clearTimeout(blurtimeout);
		blurtimeout = setTimeout(function() {
			self.visible(false);
		}, 300);
	}

	self.visible = function(visible) {
		clearTimeout(blurtimeout);
		self.toggle('hidden', !visible);
		is = visible;
	};

	self.resize = function() {

		if (!old)
			return;

		var offset = old.offset();
		offset.top += old.height();
		offset.width = old.width();

		if (margin.left)
			offset.left += margin.left;
		if (margin.top)
			offset.top += margin.top;
		if (margin.width)
			offset.width += margin.width;

		self.css(offset);
	};

	self.attach = function(input, search, callback, top, left, width) {

		clearTimeout(searchtimeout);

		if (input.setter)
			input = input.find('input');
		else
			input = $(input);

		if (old) {
			old.removeAttr('autocomplete');
			old.off('blur', blur);
			old.off('keydown', keydown);
		}

		input.on('keydown', keydown);
		input.on('blur', blur);
		input.attr({ 'autocomplete': 'off' });

		old = input;
		margin.left = left;
		margin.top = top;
		margin.width = width;

		self.resize();
		self.refresh();
		searchvalue = '';
		onSearch = search;
		onCallback = callback;
		self.visible(false);
	};

	self.render = function(arr) {

		datasource = arr;

		if (!arr || !arr.length) {
			self.visible(false);
			return;
		}

		var builder = [];
		for (var i = 0, length = arr.length; i < length; i++) {
			var obj = arr[i];
			obj.index = i;
			builder.push(self.template(obj));
		}

		container.empty().append(builder.join(''));
		self.visible(true);
	};
});

COMPONENT('calendar', function() {

	var self = this;
	var skip = false;
	var skipDay = false;
	var visible = false;

	self.days = self.attr('data-days').split(',');
	self.months = self.attr('data-months').split(',');
	self.first = parseInt(self.attr('data-firstday'));
	self.today = self.attr('data-today');
	self.months_short = [];

	for (var i = 0, length = self.months.length; i < length; i++) {
		var m = self.months[i];
		if (m.length > 4)
			m = m.substring(0, 3) + '.';
		self.months_short.push(m);
	}

	self.readonly();
	self.click = function() {};

	function getMonthDays(dt) {

		var m = dt.getMonth();
		var y = dt.getFullYear();

		if (m === -1) {
			m = 11;
			y--;
		}

		return (32 - new Date(y, m, 32).getDate());
	}

	function calculate(year, month, selected) {

		var d = new Date(year, month, 1);
		var output = { header: [], days: [], month: month, year: year };
		var firstDay = self.first;
		var firstCount = 0;
		var from = d.getDay() - firstDay;
		var today = new Date();
		var ty = today.getFullYear();
		var tm = today.getMonth();
		var td = today.getDate();
		var sy = selected ? selected.getFullYear() : -1;
		var sm = selected ? selected.getMonth() : -1;
		var sd = selected ? selected.getDate() : -1;
		var days = getMonthDays(d);

		if (from < 0)
			from = 7 + from;

		while (firstCount++ < 7) {
			output.header.push({ index: firstDay, name: self.days[firstDay] });
			firstDay++;
			if (firstDay > 6)
				firstDay = 0;
		}

		var index = 0;
		var indexEmpty = 0;
		var count = 0;
		var prev = getMonthDays(new Date(year, month - 1, 1)) - from;

		for (var i = 0; i < days + from; i++) {

			var obj = { isToday: false, isSelected: false, isEmpty: false, isFuture: false, number: 0, index: ++count };

			if (i >= from) {
				obj.number = ++index;
				obj.isSelected = sy === year && sm === month && sd === index;
				obj.isToday = ty === year && tm === month && td === index;
				obj.isFuture = ty < year;

				if (!obj.isFuture && year === ty) {
					if (tm < month)
						obj.isFuture = true;
					else if (tm === month)
						obj.isFuture = td < index;
				}

			} else {
				indexEmpty++;
				obj.number = prev + indexEmpty;
				obj.isEmpty = true;
			}

			output.days.push(obj);
		}

		indexEmpty = 0;
		for (var i = count; i < 42; i++)
			output.days.push({ isToday: false, isSelected: false, isEmpty: true, isFuture: false, number: ++indexEmpty, index: ++count });
		return output;
	}

	self.hide = function() {
		self.classes('hidden');
		visible = false;
		return self;
	};

	self.toggle = function(el, value, callback, offset) {
		if (self.element.hasClass('hidden'))
			self.show(el, value, callback, offset);
		else
			self.hide();
		return self;
	};

	self.show = function(el, value, callback, offset) {

		if (!el)
			return self.hide();

		var off = el.offset();
		var h = el.innerHeight();

		self.css({ left: off.left + (offset || 0), top: off.top + h + 12 }).removeClass('hidden');
		self.click = callback;
		self.date(value);
		visible = true;
		return self;
	};

	self.make = function() {

		self.classes('ui-calendar hidden');

		self.event('click', '.ui-calendar-today', function() {
			var dt = new Date();
			self.hide();
			self.click && self.click(dt);
		});

		self.event('click', '.ui-calendar-day', function() {
			var arr = this.getAttribute('data-date').split('-');
			var dt = new Date(parseInt(arr[0]), parseInt(arr[1]), parseInt(arr[2]));
			self.find('.ui-calendar-selected').removeClass('ui-calendar-selected');
			$(this).addClass('ui-calendar-selected');
			skip = true;
			self.hide();
			self.click && self.click(dt);
		});

		self.event('click', 'button', function(e) {

			e.preventDefault();
			e.stopPropagation();

			var arr = this.getAttribute('data-date').split('-');
			var dt = new Date(parseInt(arr[0]), parseInt(arr[1]), 1);
			switch (this.name) {
				case 'prev':
					dt.setMonth(dt.getMonth() - 1);
					break;
				case 'next':
					dt.setMonth(dt.getMonth() + 1);
					break;
			}
			skipDay = true;
			self.date(dt);
		});

		$(document.body).on('scroll', function() {
			visible && EXEC('$calendar.hide');
		});

		window.$calendar = self;

		self.on('reflow', function() {
			visible && EXEC('$calendar.hide');
		});
	};

	self.date = function(value) {

		if (typeof(value) === 'string')
			value = value.parseDate();

		var empty = !value;

		if (skipDay) {
			skipDay = false;
			empty = true;
		}

		if (skip) {
			skip = false;
			return;
		}

		if (!value)
			value = new Date();

		var output = calculate(value.getFullYear(), value.getMonth(), value);
		var builder = [];

		for (var i = 0; i < 42; i++) {

			var item = output.days[i];

			if (i % 7 === 0) {
				builder.length && builder.push('</tr>');
				builder.push('<tr>');
			}

			var cls = [];

			if (item.isEmpty)
				cls.push('ui-calendar-disabled');
			else
				cls.push('ui-calendar-day');

			!empty && item.isSelected && cls.push('ui-calendar-selected');
			item.isToday && cls.push('ui-calendar-day-today');
			builder.push('<td class="{0}" data-date="{1}-{2}-{3}">{3}</td>'.format(cls.join(' '), output.year, output.month, item.number));
		}

		builder.push('</tr>');

		var header = [];
		for (var i = 0; i < 7; i++)
			header.push('<th>{0}</th>'.format(output.header[i].name));

		self.html('<div class="ui-calendar-header"><button class="ui-calendar-header-prev" name="prev" data-date="{0}-{1}"><span class="fa fa-chevron-left"></span></button><div class="ui-calendar-header-info">{2} {3}</div><button class="ui-calendar-header-next" name="next" data-date="{0}-{1}"><span class="fa fa-chevron-right"></span></button></div><table cellpadding="0" cellspacing="0" border="0"><thead>{4}</thead><tbody>{5}</tbody></table>'.format(output.year, output.month, self.months[value.getMonth()], value.getFullYear(), header.join(''), builder.join('')) + (self.today ? '<div><a href="javascript:void(0)" class="ui-calendar-today">' + self.today + '</a></div>' : ''));
	};
});

COMPONENT('keyvalue', function() {
	var self = this;
	var container;
	var empty = {};
	var skip = false;

	self.binder = function(type, value) {
		return value;
	};

	self.template = Tangular.compile('<div class="ui-keyvalue-item"><div class="ui-keyvalue-item-remove"><i class="fa fa-times"></i></div><div class="ui-keyvalue-item-key"><input type="text" name="key" maxlength="{{ max }}" placeholder="{{ placeholder_key }}" value="{{ key }}" /></div><div class="ui-keyvalue-item-value"><input type="text" maxlength="{{ max }}" placeholder="{{ placeholder_value }}" value="{{ value }}" /></div></div>');
	self.make = function() {

		empty.max = (self.attr('data-maxlength') || '100').parseInt();
		empty.placeholder_key = self.attr('data-placeholder-key');
		empty.placeholder_value = self.attr('data-placeholder-value');
		empty.value = '';

		var html = self.html();
		var icon = self.attr('data-icon');

		if (icon)
			icon = '<i class="fa {0}"></i>'.format(icon);

		self.toggle('ui-keyvalue');
		self.html((html ? '<div class="ui-keyvalue-label">{1}{0}:</div>'.format(html, icon) : '') + '<div class="ui-keyvalue-items"></div>' + self.template(empty).replace('-item"', '-item ui-keyvalue-base"'));

		container = self.find('.ui-keyvalue-items');

		self.event('click', '.fa-times', function() {
			var el = $(this);
			var parent = el.closest('.ui-keyvalue-item');
			var inputs = parent.find('input');
			var obj = self.get();
			!obj && (obj = {});
			var key = inputs.get(0).value;
			parent.remove();
			delete obj[key];
			self.set(self.path, obj, 2);
			self.change(true);
		});

		self.event('change keypress', 'input', function(e) {

			if (e.type !== 'change' && e.keyCode !== 13)
				return;

			var el = $(this);
			var inputs = el.closest('.ui-keyvalue-item').find('input');
			var key = self.binder('key', inputs.get(0).value);
			var value = self.binder('value', inputs.get(1).value);

			if (!key || !value)
				return;

			var base = el.closest('.ui-keyvalue-base').length > 0;
			if (base && e.type === 'change')
				return;

			if (base) {
				var tmp = self.get();
				!tmp && (tmp = {});
				tmp[key] = value;
				self.set(tmp);
				self.change(true);
				inputs.val('');
				inputs.eq(0).focus();
				return;
			}

			var keyvalue = {};
			var k;

			container.find('input').each(function() {
				if (this.name === 'key') {
					k = this.value.trim();
				} else if (k) {
					keyvalue[k] = this.value.trim();
					k = '';
				}
			});

			skip = true;
			self.set(self.path, keyvalue, 2);
			self.change(true);
		});
	};

	self.setter = function(value) {

		if (skip) {
			skip = false;
			return;
		}

		if (!value) {
			container.empty();
			return;
		}

		var builder = [];

		Object.keys(value).forEach(function(key) {
			empty.key = key;
			empty.value = value[key];
			builder.push(self.template(empty));
		});

		container.empty().append(builder.join(''));
	};
});

COMPONENT('codemirror', function() {

	var self = this;
	var required = self.attr('data-required') === 'true';
	var skipA = false;
	var skipB = false;
	var editor;

	self.validate = function(value) {
		return required ? value && value.length > 0 : true;
	};

	self.reload = function() {
		self.editor.refresh();
	};

	self.make = function() {

		var height = self.element.attr('data-height');
		var icon = self.element.attr('data-icon');
		var content = self.html();
		self.html('<div class="ui-codemirror-label' + (required ? ' ui-codemirror-label-required' : '') + '">' + (icon ? '<span class="fa ' + icon + '"></span> ' : '') + content + ':</div><div class="ui-codemirror"></div>');

		var container = self.find('.ui-codemirror');
		self.editor = editor = CodeMirror(container.get(0), { lineNumbers: self.attr('data-linenumbers') === 'true', mode: self.attr('data-type') || 'htmlmixed', indentUnit: 4 });
		height !== 'auto' && editor.setSize('100%', height || '200px');

		editor.on('change', function(a, b) {

			if (skipB && b.origin !== 'paste') {
				skipB = false;
				return;
			}

			setTimeout2(self.id, function() {
				skipA = true;
				self.reset(true);
				self.dirty(false);
				self.set(editor.getValue());
			}, 200);
		});

		skipB = true;
	};

	self.getter = null;
	self.setter = function(value) {

		if (skipA === true) {
			skipA = false;
			editor.refresh();
			return;
		}

		skipB = true;
		editor.setValue(value || '');
		editor.refresh();
		skipB = true;

		CodeMirror.commands['selectAll'](editor);
		skipB = true;
		editor.setValue(editor.getValue());

		setTimeout(function() {
			editor.refresh();
		}, 200);

		setTimeout(function() {
			editor.refresh();
		}, 1000);

		setTimeout(function() {
			editor.refresh();
		}, 2000);
	};

	self.state = function() {
		self.element.find('.ui-codemirror').toggleClass('ui-codemirror-invalid', self.isInvalid());
	};
});

COMPONENT('contextmenu', function() {
	var self = this;
	var is = false;
	var timeout;
	var container;
	var arrow;

	self.template = Tangular.compile('<div data-value="{{ value }}" class="item{{ if selected }} selected{{ fi }}"><i class="fa {{ icon }}"></i><span>{{ name | raw }}</span></div>');
	self.singleton();
	self.readonly();
	self.callback = null;

	self.make = function() {

		self.classes('ui-contextmenu');
		self.append('<span class="ui-contextmenu-arrow fa fa-caret-up"></span><div class="ui-contextmenu-items"></div>');
		container = self.find('.ui-contextmenu-items');
		arrow = self.find('.ui-contextmenu-arrow');

		self.event('touchstart mousedown', 'div[data-value]', function(e) {
			var value = $(this).attr('data-value');
			var item =
			self.callback && self.callback(value, $(self.target), item);
			self.hide();
			e.preventDefault();
			e.stopPropagation();
		});

		$(document).on('touchstart mousedown', function() {
			FIND('contextmenu').hide();
		});
	};

	self.show = function(orientation, target, items, callback, offsetX, offsetY) {

		if (is) {
			clearTimeout(timeout);
			var obj = target instanceof jQuery ? target.get(0) : target;
			if (self.target === obj) {
				self.hide(0);
				return;
			}
		}

		target = $(target);
		var type = typeof(items);
		var item;

		if (type === 'string')
			items = self.get(items);
		else if (type === 'function') {
			callback = items;
			items = (target.attr('data-options') || '').split(';');
			for (var i = 0, length = items.length; i < length; i++) {
				item = items[i];
				if (!item)
					continue;
				var val = item.split('|');
				items[i] = { name: val[0], icon: val[1], value: val[2] || val[0] };
			}
		}

		if (!items) {
			self.hide(0);
			return;
		}

		self.callback = callback;

		var builder = [];
		for (var i = 0, length = items.length; i < length; i++) {
			item = items[i];

			if (typeof(item) === 'string') {
				builder.push('<div class="divider">{0}</div>'.format(item));
				continue;
			}

			item.index = i;
			if (!item.value)
				item.value = item.name;
			if (!item.icon)
				item.icon = 'fa-caret-right';

			var tmp = self.template(item);
			if (item.url)
				tmp = tmp.replace('<div', '<a href="{0}" target="_blank"'.format(item.url)).replace(/div>$/g, 'a>');

			builder.push(tmp);
		}

		self.target = target.get(0);
		var offset = target.offset();
		container.html(builder);
		switch (orientation) {
			case 'left':
				arrow.css({ left: '15px' });
				break;
			case 'right':
				arrow.css({ left: '210px' });
				break;
			case 'center':
				arrow.css({ left: '90px' });
				break;
		}

		var options = { left: orientation === 'center' ? (Math.ceil((offset.left - self.element.width() / 2) + (target.innerWidth() / 2)) + (offsetX || 0)) : orientation === 'left' ? (offset.left - 8 + (offsetX || 0)) : ((offset.left - self.element.width()) + target.innerWidth() + (offsetX || 0)), top: offset.top + target.innerHeight() + 10 + (offsetY || 0) };
		self.css(options);

		if (is)
			return;

		self.element.show();
		setTimeout(function() {
			self.classes('ui-contextmenu-visible');
			self.emit('contextmenu', true, self, self.target);
		}, 100);

		is = true;
	};

	self.hide = function(sleep) {
		if (!is)
			return;
		clearTimeout(timeout);
		timeout = setTimeout(function() {
			self.element.hide().removeClass('ui-contextmenu-visible');
			self.emit('contextmenu', false, self, self.target);
			self.callback = null;
			self.target = null;
			is = false;
		}, sleep ? sleep : 100);
	};

	self.hideforce = function() {
		self.element.hide().removeClass('ui-contextmenu-visible');
		self.emit('contextmenu', false, self, self.target);
		self.callback = null;
		self.target = null;
		is = false;
	};
});

COMPONENT('message', function() {
	var self = this;
	var is = false;
	var visible = false;
	var timer;

	self.readonly();
	self.singleton();

	self.make = function() {
		self.classes('ui-message hidden');

		self.element.on('click', 'button', function() {
			self.hide();
		});

		$(window).on('keyup', function(e) {
			visible && e.keyCode === 27 && self.hide();
		});
	};

	self.warning = function(message, icon, fn) {
		if (typeof(icon) === 'function') {
			fn = icon;
			icon = undefined;
		}
		self.callback = fn;
		self.content('ui-message-warning', message, icon || 'fa-warning');
	};

	self.info = function(message, icon, fn) {

		if (typeof(icon) === 'function') {
			fn = icon;
			icon = undefined;
		}

		self.callback = fn;
		self.content('ui-message-info', message, icon || 'fa-check-circle');
	};

	self.success = function(message, icon, fn) {

		if (typeof(icon) === 'function') {
			fn = icon;
			icon = undefined;
		}

		self.callback = fn;
		self.content('ui-message-success', message, icon || 'fa-check-circle');
	};

	self.hide = function() {
		self.callback && self.callback();
		self.classes('-ui-message-visible');
		timer && clearTimeout(timer);
		timer = setTimeout(function() {
			visible = false;
			self.classes('hidden');
		}, 1000);
	};

	self.content = function(cls, text, icon) {
		!is && self.html('<div><div class="ui-message-body"><div class="text"></div><hr /><button>' + (self.attr('data-button') || 'Close') + '</button></div></div>');
		timer && clearTimeout(timer);
		visible = true;
		self.find('.ui-message-body').removeClass().addClass('ui-message-body ' + cls);
		self.find('.fa').removeClass().addClass('fa ' + icon);
		self.find('.text').html(text);
		self.classes('-hidden');
		setTimeout(function() {
			self.classes('ui-message-visible');
		}, 5);
	};
});

COMPONENT('disable', function() {
	var self = this;
	var condition;
	var selector;
	var validate;

	self.readonly();

	self.make = function() {
		condition = self.attr('data-if');
		selector = self.attr('data-selector') || 'input,texarea,select';
		validate = self.attr('data-validate');
		validate && (validate = validate.split(',').trim());
	};

	self.setter = function(value) {
		var is = true;

		if (condition)
			is = EVALUATE(self.path, condition);
		else
			is = value ? false : true;

		self.find(selector).each(function() {
			var el = $(this);
			var tag = el.get(0).tagName;
			if (tag === 'INPUT' || tag === 'SELECT') {
				el.prop('disabled', is);
				el.parent().toggleClass('ui-disabled', is);
			} else
				el.toggleClass('ui-disabled', is);
		});

		validate && validate.forEach(FN('n => RESET({0}n)'.format(self.pathscope ? '\'' + self.pathscope + '.\'+' : '')));
	};

	self.state = function() {
		self.update();
	};
});

COMPONENT('textarea', function() {

	var self = this;
	var isRequired = self.attr('data-required') === 'true';
	var input;
	var container;

	self.validate = function(value) {

		var type = typeof(value);
		if (input.prop('disabled') || !isRequired)
			return true;

		if (type === 'undefined' || type === 'object')
			value = '';
		else
			value = value.toString();

		EMIT('reflow', self.name);
		return value.length > 0;
	};

	!isRequired && self.noValid();

	self.required = function(value) {
		self.find('.ui-textarea-label').toggleClass('ui-textarea-label-required', value);
		self.noValid(!value);
		isRequired = value;
		!value && self.state(1, 1);
	};

	self.make = function() {

		var attrs = [];
		var builder = [];
		var tmp;

		attrs.attr('placeholder', self.attr('data-placeholder'));
		attrs.attr('maxlength', self.attr('data-maxlength'));
		attrs.attr('data-jc-bind', '');

		tmp = self.attr('data-height');
		tmp && attrs.attr('style', 'height:' + tmp);
		self.attr('data-autofocus') === 'true' && attrs.attr('autofocus');
		builder.push('<textarea {0}></textarea>'.format(attrs.join(' ')));

		var element = self.element;
		var content = element.html();

		if (!content.length) {
			self.classes('ui-textarea ui-textarea-container');
			self.html(builder.join(''));
			input = self.find('textarea');
			container = self.element;
			return;
		}

		var icon = self.attr('data-icon');
		var html = builder.join('');

		builder = [];
		builder.push('<div class="ui-textarea-label{0}">'.format(isRequired ? ' ui-textarea-label-required' : ''));
		icon && builder.push('<span class="fa {0}"></span>'.format(icon));
		builder.push(content);
		builder.push(':</div><div class="ui-textarea">{0}</div>'.format(html));

		self.html(builder.join(''));
		self.classes('ui-textarea-container');
		input = self.find('textarea');
		container = self.find('.ui-textarea');
	};

	self.state = function(type) {
		if (!type)
			return;
		var invalid = self.isInvalid();
		if (invalid === self.$oldstate)
			return;
		self.$oldstate = invalid;
		container.toggleClass('ui-textarea-invalid', invalid);
	};
});

COMPONENT('filereader', function() {
	var self = this;
	var required = self.attr('data-required') === 'true';

	self.readonly();

	self.make = function() {

		var element = self.element;
		var content = self.html();
		var placeholder = self.attr('data-placeholder');
		var icon = self.attr('data-icon');
		var accept = self.attr('data-accept');
		var html = '<span class="fa fa-folder-o"></span><input type="file"' + (accept ? ' accept="' + accept + '"' : '') + ' class="ui-filereader-input" /><input type="text" placeholder="' + (placeholder || '') + '" readonly="readonly" />';

		if (content.length) {
			self.html('<div class="ui-filereader-label' + (required ? ' ui-filereader-label-required' : '') + '">' + (icon ? '<span class="fa ' + icon + '"></span> ' : '') + content + ':</div><div class="ui-filereader">' + html + '</div>');
		} else {
			self.classes('ui-filereader');
			self.html(html);
		}

		element.find('.ui-filereader-input').bind('change', function(evt) {
			self.process(evt.target.files);
		});
	};

	self.process = function(files) {
		var el = this;
		SETTER('loading', 'show');
		(files.length - 1).async(function(index, next) {
			var file = files[index];
			var reader = new FileReader();
			reader.onload = function() {
				self.set({ body: reader.result, filename: file.name, type: file.type, size: file.size });
				reader = null;
				setTimeout(next, 500);
			};
			reader.readAsText(file);
		}, function() {
			SETTER('loading', 'hide', 1000);
			el.value = '';
		});
	};

});

COMPONENT('nosqlcounter', function() {
	var self = this;
	var count = (self.attr('data-count') || '12').parseInt();

	self.readonly();
	self.make = function() {
		self.toggle('ui-nosqlcounter', true);
	};

	self.setter = function(value) {

		if (!value || !value.length)
			return self.empty();

		var maxbars = count;

		if (WIDTH() === 'xs')
			maxbars = (maxbars / 2) >> 0;

		var max = value.length - maxbars;
		if (max < 0)
			max = 0;

		value = value.slice(max, value.length);
		max = value.scalar('max', 'value');

		var bar = 100 / maxbars;
		var builder = [];
		var months = FIND('calendar').months;
		var current = new Date().format('yyyyMM');
		var cls = '';

		value.forEach(function(item, index) {
			var val = item.value;
			if (val > 999)
				val = (val / 1000).format(1, 2) + 'K';
			var h = (item.value / max) * 60;
			h += 40;

			cls = '';

			if (item.id === current)
				cls += (cls ? ' ' : '') + 'current';

			if (index === 11)
				cls += (cls ? ' ' : '') + 'last';

			builder.push('<div style="width:{0}%;height:{1}%" title="{3}" class="{4}"><span>{2}</span></div>'.format(bar.format(0, 3), h.format(0, 3), val, months[item.month - 1] + ' ' + item.year, cls));
		});

		self.html(builder);
	};
});

COMPONENT('fileupload', function() {

	var self = this;

	self.readonly();

	self.make = function() {
		var id = 'fileupload' + self.id;
		var accept = self.attr('data-accept');
		var multiple = self.attr('data-multiple');

		$(document.body).append('<input type="file" id="{0}" class="hidden"{1}{2} />'.format(id, accept ? ' accept="{0}"'.format(accept) : '', multiple ? ' multiple="multiple"' : ''));

		var input = $('#' + id);

		self.event('click', function() {
			input.click();
		});

		input.on('change', function(evt) {

			var files = evt.target.files;
			var data = new FormData();
			var el = this;

			for (var i = 0, length = files.length; i < length; i++)
				data.append('file' + i, files[i]);

			SETTER('loading', 'show');
			UPLOAD(self.attr('data-url'), data, function(response, err) {

				el.value = '';
				SETTER('loading', 'hide', 500);

				if (err) {
					SETTER('message', 'warning', self.attr('data-error') || err.toString());
					return;
				}

				self.change();

				if (self.attr('data-array') === 'true')
					self.push(response);
				else
					self.set(response);
			});
		});
	};
});

COMPONENT('range', function() {
	var self = this;
	var required = self.attr('data-required');

	self.noValid();

	self.make = function() {
		var name = self.html();
		if (name)
			name = '<div class="ui-range-label{1}">{0}:</div>'.format(name, required ? ' ui-range-label-required' : '');
		var attrs = [];
		attrs.attr('step', self.attr('data-step'));
		attrs.attr('max', self.attr('data-max'));
		attrs.attr('min', self.attr('data-min'));
		self.classes('ui-range');
		self.html('{0}<input type="range" data-jc-bind=""{1} />'.format(name, attrs.length ? ' ' + attrs.join(' ') : ''));
	};
});

COMPONENT('audio', function() {
	var self = this;
	var can = false;
	var volume = 0.5;

	self.items = [];
	self.readonly();
	self.singleton();

	self.make = function() {
		var audio = document.createElement('audio');
		if (audio.canPlayType && audio.canPlayType('audio/mpeg').replace(/no/, ''))
			can = true;
	};

	self.play = function(url) {

		if (!can)
			return;

		var audio = new window.Audio();

		audio.src = url;
		audio.volume = volume;
		audio.play();

		audio.onended = function() {
			audio.$destroy = true;
			self.cleaner();
		};

		audio.onerror = function() {
			audio.$destroy = true;
			self.cleaner();
		};

		audio.onabort = function() {
			audio.$destroy = true;
			self.cleaner();
		};

		self.items.push(audio);
		return self;
	};

	self.cleaner = function() {
		var index = 0;
		while (true) {
			var item = self.items[index++];
			if (item === undefined)
				return self;
			if (!item.$destroy)
				continue;
			item.pause();
			item.onended = null;
			item.onerror = null;
			item.onsuspend = null;
			item.onabort = null;
			item = null;
			index--;
			self.items.splice(index, 1);
		}
	};

	self.stop = function(url) {

		if (!url) {
			self.items.forEach(function(item) {
				item.$destroy = true;
			});
			return self.cleaner();
		}

		var index = self.items.findIndex('src', url);
		if (index === -1)
			return self;
		self.items[index].$destroy = true;
		return self.cleaner();
	};

	self.setter = function(value) {

		if (value === undefined)
			value = 0.5;
		else
			value = (value / 100);

		if (value > 1)
			value = 1;
		else if (value < 0)
			value = 0;

		volume = value ? +value : 0;
		for (var i = 0, length = self.items.length; i < length; i++) {
			var a = self.items[i];
			if (!a.$destroy)
				a.volume = value;
		}
	};
});

COMPONENT('controls', function() {

	var self = this;
	var is = false;
	var timeout;
	var container;

	self.template = Tangular.compile('<div data-value="{{ index }}" class="item{{ if selected }} selected{{ fi }}{{ if disabled }} disabled{{ fi }}"><i class="fa {{ icon }}"></i><span>{{ name | raw }}</span></div>');
	self.singleton();
	self.readonly();
	self.callback = null;

	self.make = function() {

		self.classes('ui-controls');
		self.append('<div class="ui-controls-items"></div>');
		container = self.find('.ui-controls-items');

		self.event('touchstart mousedown', 'div[data-value]', function(e) {
			var el = $(this);
			!el.hasClass('disabled') && self.callback && self.callback(self.items[+el.attr('data-value')], $(self.target));
			self.hide();
			e.preventDefault();
			e.stopPropagation();
		});

		$(document).on('touchstart mousedown', function() {
			SETTER('controls', 'hide');
		});
	};

	self.show = function(target, items, callback, offsetX) {

		if (is) {
			clearTimeout(timeout);
			var obj = target instanceof jQuery ? target.get(0) : target;
			if (self.target === obj) {
				self.hide(0);
				return;
			}
		}

		target = $(target);
		var type = typeof(items);
		var item;

		if (type === 'string')
			items = self.get(items);
		else if (type === 'function') {
			callback = items;
			items = (target.attr('data-options') || '').split(';');
			for (var i = 0, length = items.length; i < length; i++) {
				item = items[i];
				if (!item)
					continue;
				var val = item.split('|');
				items[i] = { name: val[0], icon: val[1], value: val[2] === undefined ? val[0] : val[2] };
			}
		}

		if (!items) {
			self.hide(0);
			return;
		}

		self.callback = callback;
		self.items = items;

		var builder = [];

		for (var i = 0, length = items.length; i < length; i++) {
			item = items[i];

			if (typeof(item) === 'string') {
				builder.push('<div class="clearfix"></div><div class="divider"{1}>{0}</div>'.format(item, i === 0 ? ' style="margin-top:0"' : ''));
				continue;
			}

			item.index = i;
			if (item.value === undefined)
				item.value = item.name;
			if (!item.icon)
				item.icon = 'fa-caret-right';

			var tmp = self.template(item);
			if (item.url)
				tmp = tmp.replace('<div', '<a href="{0}" target="_blank"'.format(item.url)).replace(/div>$/g, 'a>');

			builder.push(tmp);
		}

		builder.push('<div class="clearfix"></div>');

		var off = target.closest('.widget').offset();

		self.target = target.get(0);
		var offset = target.offset();
		var scroller = $('.designer-scroll');

		offset.left += scroller.scrollLeft();
		offset.top += scroller.scrollTop() - (off ? off.top : 0);

		container.html(builder);

		var options = { left: (offset.left - 8 + (offsetX || 0)), top: offset.top + target.innerHeight() + 10 };
		self.css(options);

		if (is)
			return;

		self.element.show();
		setTimeout(function() {
			self.classes('ui-controls-visible');
			self.emit('controls', true, self, self.target);
		}, 100);

		is = true;
	};

	self.hide = function(sleep) {
		if (!is)
			return;
		clearTimeout(timeout);
		timeout = setTimeout(function() {
			self.element.hide().removeClass('ui-controls-visible');
			self.emit('controls', false, self, self.target);
			self.callback = null;
			self.target = null;
			is = false;
		}, sleep ? sleep : 100);
	};
});

COMPONENT('multioptions', function(self) {

	var Tinput = Tangular.compile('<input class="ui-moi-save ui-moi-value-inputtext" data-name="{{ name }}" type="text" value="{{ value }}"{{ if def }} placeholder="{{ def }}"{{ fi }}{{ if max }} maxlength="{{ max }}"{{ fi }} data-type="text" />');
	var Tselect = Tangular.compile('<div class="ui-moi-value-select"><i class="fa fa-chevron-down"></i><select data-name="{{ name }}" class="ui-moi-save ui-multioptions-select">{{ foreach m in values }}<option value="{{ $index }}"{{ if value === m.value }} selected="selected"{{ fi }}>{{ m.text }}</option>{{ end }}</select></div>');
	var Tnumber = Tangular.compile('<div class="ui-moi-value-inputnumber-buttons"><span class="multioptions-operation" data-type="number" data-step="{{ step }}" data-name="plus" data-max="{{ max }}" data-min="{{ min }}"><i class="fa fa-plus"></i></span><span class="multioptions-operation" data-type="number" data-name="minus" data-step="{{ step }}" data-max="{{ max }}" data-min="{{ min }}"><i class="fa fa-minus"></i></span></div><div class="ui-moi-value-inputnumber"><input data-name="{{ name }}" class="ui-moi-save ui-moi-value-numbertext" type="text" value="{{ value }}"{{ if def }} placeholder="{{ def }}"{{ fi }} data-max="{{ max }}" data-min="{{ max }}" data-type="number" /></div>');
	var Tboolean = Tangular.compile('<div data-name="{{ name }}" data-type="boolean" class="ui-moi-save multioptions-operation ui-moi-value-boolean{{ if value }} checked{{ fi }}"><i class="fa fa-check"></i></div>');
	var Tdate = Tangular.compile('<div class="ui-moi-value-inputdate-buttons"><span class="multioptions-operation" data-type="date" data-name="date"><i class="fa fa-calendar"></i></span></div><div class="ui-moi-value-inputdate"><input class="ui-moi-save ui-moi-date" data-name="{{ name }}" type="text" value="{{ value | format(\'yyyy-MM-dd\') }}" placeholder="dd.mm.yyyy" maxlength="10" data-type="date" /></div>');
	var Tcolor = null;
	var skip = false;
	var mapping = null;

	self.readonly();

	self.init = function() {
		window.Tmultioptionscolor = Tangular.compile('<div class="ui-moi-value-colors ui-moi-save" data-name="{{ name }}" data-value="{{ value }}">{0}</div>'.format(['#ED5565', '#DA4453', '#FC6E51', '#E9573F', '#FFCE54', '#F6BB42', '#A0D468', '#8CC152', '#48CFAD', '#37BC9B', '#4FC1E9', '#3BAFDA', '#5D9CEC', '#4A89DC', '#AC92EC', '#967ADC', '#EC87C0', '#D770AD', '#F5F7FA', '#E6E9ED', '#CCD1D9', '#AAB2BD', '#656D78', '#434A54', '#000000'].map(function(n) { return '<span data-value="{0}" data-type="color" class="multioptions-operation" style="background-color:{0}"><i class="fa fa-check-circle"></i></span>'.format(n); }).join('')));
	};

	self.form = function() {};

	self.make = function() {

		Tcolor = window.Tmultioptionscolor;
		self.classes('ui-multioptions');

		var el = self.find('script');
		self.remap(el.html());
		el.remove();

		self.event('click', '.multioptions-operation', function(e) {
			var el = $(this);
			var name = el.attr('data-name');
			var type = el.attr('data-type');

			e.stopPropagation();

			if (type === 'date') {
				el = el.parent().parent().find('input');
				FIND('calendar').show(el, el.val().parseDate(), function(date) {
					el.val(date.format('yyyy-MM-dd'));
					self.$save();
				});
				return;
			}

			if (type === 'color') {
				el.parent().find('.selected').removeClass('selected');
				el.addClass('selected');
				self.$save();
				return;
			}

			if (type === 'boolean') {
				el.toggleClass('checked');
				self.$save();
				return;
			}

			if (type === 'number') {
				var input = el.parent().parent().find('input');
				var step = (el.attr('data-step') || '0').parseInt();
				var min = el.attr('data-min');
				var max = el.attr('data-max');

				if (!step)
					step = 1;

				if (min)
					min = min.parseInt();

				if (max)
					max = max.parseInt();

				var value;

				if (name === 'plus') {
					value = input.val().parseInt() + step;
					if (max !== 0 && max && value > max)
						value = max;
					input.val(value);
				} else {
					value = input.val().parseInt() - step;
					if (min !== 0 && min && value < min)
						value = min;
					input.val(value);
				}
				self.$save();
				return;
			}

			self.form(type, el.parent().parent().find('input'), name);
			return;
		});

		self.event('change', 'input,select', self.$save);

		self.event('click', '.ui-moi-date', function(e) {
			e.stopPropagation();
		});

		self.event('focus', '.ui-moi-date', function() {
			var el = $(this);
			FIND('calendar').toggle(el, el.val().parseDate(), function(date) {
				el.val(date.format('yyyy-MM-dd'));
				self.$save();
			});
		});
	};


	self.remap = function(js) {

		var fn = new Function('option', js);

		mapping = {};
		fn(function(key, label, def, type, max, min, step, validator) {
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
					values.push({ text: val.text === undefined ? val : val.text, value: val.value === undefined ? val : val.value });
				});

				type = 'array';
			}

			if (validator && typeof(validator) !== 'function')
				validator = null;

			mapping[key] = { name: key, label: label, type: type.toLowerCase(), def: def, max: max, min: min, step: step, value: def, values: values, validator: validator };
		});
	};

	self.$save = function() {
		setTimeout2('multioptions.' + self._id, self.save, 500);
	};

	self.save = function() {
		var obj = self.get();
		var values = self.find('.ui-moi-save');

		Object.keys(mapping).forEach(function(key) {

			var opt = mapping[key];
			var el = values.filter('[data-name="{0}"]'.format(opt.name));

			if (el.hasClass('ui-moi-value-colors')) {
				obj[key] = el.find('.selected').attr('data-value');
				return;
			}

			if (el.hasClass('ui-moi-value-boolean')) {
				obj[key] = el.hasClass('checked');
				return;
			}

			if (el.hasClass('ui-moi-date')) {
				obj[key] = el.val().parseDate();
				return;
			}

			if (el.hasClass('ui-moi-value-inputtext')) {
				obj[key] = el.val();
				return;
			}

			if (el.hasClass('ui-moi-value-numbertext')) {
				obj[key] = el.val().parseInt();
				return;
			}

			if (el.hasClass('ui-moi-value-numbertext')) {
				obj[key] = el.val().parseInt();
				return;
			}

			if (el.hasClass('ui-multioptions-select')) {
				var index = el.val().parseInt();
				var val = opt.values[index];
				obj[key] = val ? val.value : null;
				if (obj[key] && obj[key].value)
					obj[key] = obj[key].value;
				return;
			}
		});

		skip = true;
		self.set(obj);
	};

	self.setter = function(options) {

		if (!options || skip) {
			skip = false;
			return;
		}

		var builder = [];

		Object.keys(mapping).forEach(function(key) {

			var option = mapping[key];

			// option.name
			// option.label
			// option.type (lowercase)
			// option.def
			// option.value
			// option.max
			// option.min
			// option.step

			option.value = options[key];

			var value = '';

			switch (option.type) {
				case 'string':
					value = Tinput(option);
					break;
				case 'number':
					value = Tnumber(option);
					break;
				case 'boolean':
					value = Tboolean(option);
					break;
				case 'color':
					value = Tcolor(option);
					break;
				case 'array':
					value = Tselect(option);
					break;
				case 'date':
					value = Tdate(option);
					break;
			}

			builder.push('<div class="ui-multioptions-item"><div class="ui-moi-name">{0}</div><div class="ui-moi-value">{1}</div></div>'.format(option.label, value));
		});

		self.html(builder);

		self.find('.ui-moi-value-colors').each(function() {
			var el = $(this);
			var value = el.attr('data-value');
			el.find('[data-value="{0}"]'.format(value)).addClass('selected');
		});
	};
});


COMPONENT('dragdropfiles', function() {
	var self = this;
	self.readonly();

	self.mirror = function(cls) {
		var arr = cls.split(' ');
		for (var i = 0, length = arr.length; i < length; i++) {
			arr[i] = arr[i].replace(/^(\+|\-)/g, function(c) {
				return c === '+' ? '-' : '+';
			});
		}
		return arr.join(' ');
	};

	self.make = function() {
		var cls = self.attr('data-class');
		var has = false;

		self.event('dragenter dragover dragexit drop dragleave', function (e) {

			e.stopPropagation();
			e.preventDefault();

			switch (e.type) {
				case 'drop':
					cls && has && self.classes(self.mirror(cls));
					break;
				case 'dragenter':
				case 'dragover':
					cls && !has && self.classes(cls);
					has = true;
					return;
				case 'dragleave':
				case 'dragexit':
				default:
					setTimeout2(self.id, function() {
						cls && has && self.classes(self.mirror(cls));
						has = false;
					}, 100);
					return;
			}

			EXEC(self.attr('data-files'), e.originalEvent.dataTransfer.files, e);
		});
	};
});
