COMPONENT('exec', function(self, config) {
	self.readonly();
	self.blind();
	self.make = function() {
		self.event('click', config.selector || '.exec', function(e) {
			var el = $(this);

			var attr = el.attrd('exec');
			var path = el.attrd('path');
			var href = el.attrd('href');

			if (el.attrd('prevent') === 'true') {
				e.preventDefault();
				e.stopPropagation();
			}

			attr && EXEC(attr, el, e);
			href && NAV.redirect(href);

			if (path) {
				var val = el.attrd('value');
				if (val == null) {
					var a = new Function('return ' + el.attrd('value-a'))();
					var b = new Function('return ' + el.attrd('value-b'))();
					var v = GET(path);
					if (v === a)
						SET(path, b, true);
					else
						SET(path, a, true);
				} else
					SET(path, new Function('return ' + val)(), true);
			}
		});
	};
});

COMPONENT('error', function(self, config) {

	self.readonly();
	self.nocompile();

	self.make = function() {
		self.aclass('ui-error hidden');
	};

	self.setter = function(value) {

		if (!(value instanceof Array) || !value.length) {
			self.tclass('hidden', true);
			return;
		}

		var builder = [];
		for (var i = 0, length = value.length; i < length; i++)
			builder.push('<div><span class="fa {1}"></span>{0}</div>'.format(value[i].error, 'fa-' + (config.icon || 'times-circle')));

		self.html(builder.join(''));
		self.tclass('hidden', false);
	};
});

COMPONENT('search', 'class:hidden;delay:200;attribute:data-search', function(self, config) {
	self.readonly();
	self.setter = function(value) {

		if (!config.selector || !config.attribute || value == null)
			return;

		KEYPRESS(function() {

			var elements = self.find(config.selector);
			if (!value) {
				elements.rclass(config.class);
				return;
			}

			var search = value.toSearch();
			var hide = [];
			var show = [];

			elements.toArray().waitFor(function(item, next) {
				var el = $(item);
				var val = (el.attr(config.attribute) || '').toSearch();
				if (val.indexOf(search) === -1)
					hide.push(el);
				else
					show.push(el);
				setTimeout(next, 3);
			}, function() {

				hide.forEach(function(item) {
					item.tclass(config.class, true);
				});

				show.forEach(function(item) {
					item.tclass(config.class, false);
				});
			});

		}, config.delay, 'search' + self.id);
	};
});

COMPONENT('binder', function(self) {

	var keys, keys_unique;

	self.readonly();
	self.blind();

	self.make = function() {
		self.watch('*', self.autobind);
		self.scan();

		var fn = function() {
			setTimeout2(self.id, self.scan, 200);
		};

		self.on('import', fn);
		self.on('component', fn);
		self.on('destroy', fn);
	};

	self.autobind = function(path) {

		var mapper = keys[path];
		if (!mapper)
			return;

		var template = {};

		for (var i = 0, length = mapper.length; i < length; i++) {
			var item = mapper[i];
			var value = GET(item.path);
			var element = item.selector ? item.element.find(item.selector) : item.element;

			template.value = value;
			item.classes && classes(element, item.classes(value));

			var is = true;

			if (item.visible) {
				is = !!item.visible(value);
				element.tclass('hidden', !is);
			}

			if (is) {
				item.html && element.html(item.Ta ? item.html(template) : item.html(value));
				item.disable && element.prop('disabled', item.disable(value));
				item.src && element.attr('src', item.src(value));
				item.href && element.attr('href', item.href(value));
				item.exec && EXEC(item.exec, element);
			}
		}
	};

	function classes(element, val) {
		var add = '';
		var rem = '';
		var classes = val.split(' ');

		for (var i = 0; i < classes.length; i++) {
			var item = classes[i];
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
		}
		rem && element.rclass(rem);
		add && element.aclass(add);
	}

	function decode(val) {
		return val.replace(/&#39;/g, '\'');
	}

	self.prepare = function(code) {
		return code.indexOf('=>') === -1 ? FN('value=>' + decode(code)) : FN(decode(code));
	};

	self.scan = function() {

		keys = {};
		keys_unique = {};

		var keys_news = {};

		self.find('[data-b]').each(function() {

			var el = $(this);
			var path = el.attrd('b').replace('%', 'jctmp.');

			if (path.indexOf('?') !== -1) {
				var scope = el.closest('[data-jc-scope]');
				if (scope) {
					var data = scope[0].$scopedata;
					if (data == null)
						return;
					path = path.replace(/\?/g, data.path);
				} else
					return;
			}

			var arr = path.split('.');
			var p = '';

			var classes = el.attrd('b-class');
			var html = el.attrd('b-html');
			var visible = el.attrd('b-visible');
			var disable = el.attrd('b-disable');
			var selector = el.attrd('b-selector');
			var src = el.attrd('b-src');
			var href = el.attrd('b-href');
			var exec = el.attrd('b-exec');
			var obj = el.data('data-b');

			keys_unique[path] = true;

			if (!obj) {
				obj = {};
				obj.path = path;
				obj.element = el;
				obj.classes = classes ? self.prepare(classes) : undefined;
				obj.visible = visible ? self.prepare(visible) : undefined;
				obj.disable = disable ? self.prepare(disable) : undefined;
				obj.selector = selector ? selector : null;
				obj.src = src ? self.prepare(src) : undefined;
				obj.href = href ? self.prepare(href) : undefined;
				obj.exec = exec;

				if (el.attrd('b-template') === 'true') {
					var tmp = el.find('script[type="text/html"]');
					var str = '';

					if (tmp.length)
						str = tmp.html();
					else
						str = el.html();

					if (str.indexOf('{{') !== -1) {
						obj.html = Tangular.compile(str);
						obj.Ta = true;
						tmp.length && tmp.remove();
					}
				} else
					obj.html = html ? self.prepare(html) : undefined;

				el.data('data-b', obj);
				keys_news[path] = true;
			}

			for (var i = 0, length = arr.length; i < length; i++) {
				p += (p ? '.' : '') + arr[i];
				if (keys[p])
					keys[p].push(obj);
				else
					keys[p] = [obj];
			}
		});

		var nk = Object.keys(keys_news);
		for (var i = 0; i < nk.length; i++)
			self.autobind(nk[i]);

		return self;
	};
});

COMPONENT('confirm', function(self) {

	var is, visible = false;

	self.readonly();
	self.singleton();
	self.nocompile();

	self.make = function() {

		self.aclass('ui-confirm hidden');

		self.event('click', 'button', function() {
			self.hide($(this).attrd('index').parseInt());
		});

		self.event('click', function(e) {
			var t = e.target.tagName;
			if (t !== 'DIV')
				return;
			var el = self.find('.ui-confirm-body');
			el.aclass('ui-confirm-click');
			setTimeout(function() {
				el.rclass('ui-confirm-click');
			}, 300);
		});

		$(window).on('keydown', function(e) {
			if (!visible)
				return;
			var index = e.which === 13 ? 0 : e.which === 27 ? 1 : null;
			if (index != null) {
				self.find('button[data-index="{0}"]'.format(index)).trigger('click');
				e.preventDefault();
			}
		});
	};

	self.show = self.confirm = function(message, buttons, fn) {
		self.callback = fn;

		var builder = [];

		for (var i = 0; i < buttons.length; i++) {
			var item = buttons[i];
			var icon = item.match(/"[a-z0-9-]+"/);
			if (icon) {
				item = item.replace(icon, '').trim();
				icon = '<i class="fa fa-{0}"></i>'.format(icon.toString().replace(/"/g, ''));
			} else
				icon = '';
			builder.push('<button data-index="{1}">{2}{0}</button>'.format(item, i, icon));
		}

		self.content('ui-confirm-warning', '<div class="ui-confirm-message">{0}</div>{1}'.format(message.replace(/\n/g, '<br />'), builder.join('')));
	};

	self.hide = function(index) {
		self.callback && self.callback(index);
		self.rclass('ui-confirm-visible');
		visible = false;
		setTimeout2(self.id, function() {
			$('html').rclass('noscrollconfirm');
			self.aclass('hidden');
		}, 1000);
	};

	self.content = function(cls, text) {
		$('html').aclass('noscrollconfirm');
		!is && self.html('<div><div class="ui-confirm-body"></div></div>');
		self.find('.ui-confirm-body').empty().append(text);
		self.rclass('hidden');
		visible = true;
		setTimeout2(self.id, function() {
			self.aclass('ui-confirm-visible');
		}, 5);
	};
});

COMPONENT('form', function(self, config) {

	var W = window;
	var csspos = {};

	if (!W.$$form) {

		W.$$form_level = W.$$form_level || 1;
		W.$$form = true;

		$(document).on('click', '.ui-form-button-close', function() {
			SET($(this).attrd('path'), '');
		});

		$(W).on('resize', function() {
			SETTER('form', 'resize');
		});

		$(document).on('click', '.ui-form-container', function(e) {
			var el = $(e.target);
			if (!(el.hclass('ui-form-container-padding') || el.hclass('ui-form-container')))
				return;
			var form = $(this).find('.ui-form');
			var cls = 'ui-form-animate-click';
			form.aclass(cls);
			setTimeout(function() {
				form.rclass(cls);
			}, 300);
		});
	}

	self.readonly();
	self.submit = function() {
		if (config.submit)
			EXEC(config.submit, self);
		else
			self.hide();
	};

	self.cancel = function() {
		config.cancel && EXEC(config.cancel, self);
		self.hide();
	};

	self.hide = function() {
		self.set('');
	};

	self.icon = function(value) {
		var el = this.rclass2('fa');
		value.icon && el.aclass('fa fa-' + value.icon);
	};

	self.resize = function() {
		if (!config.center || self.hclass('hidden'))
			return;
		var ui = self.find('.ui-form');
		var fh = ui.innerHeight();
		var wh = $(W).height();
		var r = (wh / 2) - (fh / 2);
		csspos.marginTop = (r > 30 ? (r - 15) : 20) + 'px';
		ui.css(csspos);
	};

	self.make = function() {

		$(document.body).append('<div id="{0}" class="hidden ui-form-container"><div class="ui-form-container-padding"><div class="ui-form" style="max-width:{1}px"><div data-bind="@config__html span:value.title__change .ui-form-icon:@icon" class="ui-form-title"><button class="ui-form-button-close{3}" data-path="{2}"><i class="fa fa-times"></i></button><i class="ui-form-icon"></i><span></span></div></div></div>'.format(self.ID, config.width || 800, self.path, config.closebutton == false ? ' hidden' : ''));
		var el = $('#' + self.ID);
		el.find('.ui-form')[0].appendChild(self.dom);
		self.rclass('hidden');
		self.replace(el);

		self.event('scroll', function() {
			EMIT('scroll', self.name);
			EMIT('reflow', self.name);
		});

		self.find('button').on('click', function() {
			switch (this.name) {
				case 'submit':
					self.submit(self.hide);
					break;
				case 'cancel':
					!this.disabled && self[this.name](self.hide);
					break;
			}
		});

		config.enter && self.event('keydown', 'input', function(e) {
			e.which === 13 && !self.find('button[name="submit"]')[0].disabled && setTimeout(function() {
				self.submit(self);
			}, 800);
		});
	};

	self.configure = function(key, value, init, prev) {
		if (init)
			return;
		switch (key) {
			case 'width':
				value !== prev && self.find('.ui-form').css('max-width', value + 'px');
				break;
			case 'closebutton':
				self.find('.ui-form-button-close').tclass(value !== true);
				break;
		}
	};

	self.setter = function(value) {

		setTimeout2('ui-form-noscroll', function() {
			$('html').tclass('ui-form-noscroll', !!$('.ui-form-container').not('.hidden').length);
		}, 50);

		var isHidden = value !== config.if;

		if (self.hclass('hidden') === isHidden)
			return;

		setTimeout2('formreflow', function() {
			EMIT('reflow', self.name);
		}, 10);

		if (isHidden) {
			self.aclass('hidden');
			self.release(true);
			self.find('.ui-form').rclass('ui-form-animate');
			W.$$form_level--;
			return;
		}

		if (W.$$form_level < 1)
			W.$$form_level = 1;

		W.$$form_level++;

		self.css('z-index', W.$$form_level * 10);
		self.element.scrollTop(0);
		self.rclass('hidden');

		self.resize();
		self.release(false);

		config.reload && EXEC(config.reload, self);
		config.default && DEFAULT(config.default, true);

		if (!isMOBILE && config.autofocus) {
			var el = self.find(config.autofocus === true ? 'input[type="text"],select,textarea' : config.autofocus);
			el.length && el[0].focus();
		}

		setTimeout(function() {
			self.element.scrollTop(0);
			self.find('.ui-form').aclass('ui-form-animate');
		}, 300);

		// Fixes a problem with freezing of scrolling in Chrome
		setTimeout2(self.ID, function() {
			self.css('z-index', (W.$$form_level * 10) + 1);
		}, 500);
	};
});

COMPONENT('loading', function(self) {
	var pointer;

	self.readonly();
	self.singleton();

	self.make = function() {
		self.aclass('ui-loading');
		self.append('<div></div>');
	};

	self.show = function() {
		clearTimeout(pointer);
		self.rclass('hidden');
		return self;
	};

	self.hide = function(timeout) {
		clearTimeout(pointer);
		pointer = setTimeout(function() {
			self.aclass('hidden');
		}, timeout || 1);
		return self;
	};
});

COMPONENT('repeater', 'hidden:true;check:true', function(self, config) {

	var filter = null;
	var recompile = false;
	var reg = /\$(index|path)/g;

	self.readonly();

	self.configure = function(key, value) {
		if (key === 'filter')
			filter = value ? GET(value) : null;
	};

	self.make = function() {
		var element = self.find('script');

		if (!element.length) {
			element = self.element;
			self.element = self.element.parent();
		}

		var html = element.html();
		element.remove();
		self.template = Tangular.compile(html);
		recompile = (/data-jc="|data-bind="/).test(html);
	};

	self.setter = function(value) {

		if (!value || !value.length) {
			config.hidden && self.aclass('hidden');
			self.empty();
			self.cache = '';
			return;
		}

		var builder = [];
		for (var i = 0, length = value.length; i < length; i++) {
			var item = value[i];
			item.index = i;
			if (!filter || filter(item)) {
				builder.push(self.template(item).replace(reg, function(text) {
					return text.substring(0, 2) === '$i' ? i.toString() : self.path + '[' + i + ']';
				}));
			}
		}

		var tmp = builder.join('');

		if (config.check) {
			if (tmp === self.cache)
				return;
			self.cache = tmp;
		}

		self.html(tmp);
		config.hidden && self.rclass('hidden');
		recompile && self.compile();
	};
});

COMPONENT('repeater-group', function(self, config) {

	var html, template_group;
	var reg = /\$(index|path)/g;
	var force = false;

	self.readonly();

	self.released = function(is) {
		if (is) {
			html = self.html();
			self.empty();
		} else
			html && self.html(html);
	};

	self.make = function() {
		self.find('script').each(function(index) {
			var element = $(this);
			var html = element.html();
			element.remove();
			if (index)
				template_group = Tangular.compile(html);
			else
				self.template = Tangular.compile(html);
		});
	};

	self.configure = function(key, value, init) {
		if (init)
			return;
		if (key === 'group') {
			force = true;
			self.refresh();
		}
	};

	self.setter = function(value) {

		if (!value || !value.length) {
			self.empty();
			return;
		}

		if (!force && NOTMODIFIED(self.id, value))
			return;

		force = false;
		html = '';
		var length = value.length;
		var groups = {};

		for (var i = 0; i < length; i++) {
			var name = value[i][config.group] || '0';
			if (groups[name])
				groups[name].push(value[i]);
			else
				groups[name] = [value[i]];
		}

		var index = 0;
		var indexgroup = 0;
		var builder = '';
		var keys = Object.keys(groups);

		keys.quicksort();
		keys.forEach(function(key) {
			var arr = groups[key];
			var tmp = '';

			for (var i = 0, length = arr.length; i < length; i++) {
				var item = arr[i];
				item.index = index++;
				tmp += self.template(item).replace(reg, function(text) {
					return text.substring(0, 2) === '$i' ? index.toString() : self.path + '[' + index + ']';
				});
			}

			if (key !== '0') {
				var options = {};
				options[config.group] = key;
				options.length = arr.length;
				options.index = indexgroup++;
				options.body = tmp;
				builder += template_group(options);
			}

		});

		self.html(builder);
	};
});

COMPONENT('textbox', function(self, config) {

	var input, container, content = null;

	self.nocompile();

	self.validate = function(value) {

		if (!config.required || config.disabled)
			return true;

		if (self.type === 'date')
			return value instanceof Date && !isNaN(value.getTime());

		if (value == null)
			value = '';
		else
			value = value.toString();

		EMIT('reflow', self.name);

		if (config.minlength && value.length < config.minlength)
			return false;

		switch (self.type) {
			case 'email':
				return value.isEmail();
			case 'url':
				return value.isURL();
			case 'currency':
			case 'number':
				return value > 0;
		}

		return config.validation ? !!self.evaluate(value, config.validation, true) : value.length > 0;
	};

	self.make = function() {

		content = self.html();

		self.type = config.type;
		self.format = config.format;

		self.event('click', '.fa-calendar', function(e) {
			if (config.disabled)
				return;
			if (config.type === 'date') {
				e.preventDefault();
				window.$calendar && window.$calendar.toggle(self.element, self.get(), function(date) {
					self.set(date);
				});
			}
		});

		self.event('click', '.fa-caret-up,.fa-caret-down', function() {
			if (config.disabled)
				return;
			if (config.increment) {
				var el = $(this);
				var inc = el.hclass('fa-caret-up') ? 1 : -1;
				self.change(true);
				self.inc(inc);
			}
		});

		self.event('click', '.ui-textbox-control-icon', function() {
			if (config.disabled)
				return;
			if (self.type === 'search') {
				self.$stateremoved = false;
				$(this).rclass('fa-times').aclass('fa-search');
				self.set('');
			} else if (config.icon2click)
				EXEC(config.icon2click, self);
		});

		self.event('focus', 'input', function() {
			config.autocomplete && EXEC(config.autocomplete, self);
		});

		self.redraw();
	};

	self.redraw = function() {

		var attrs = [];
		var builder = [];
		var tmp = 'text';

		switch (config.type) {
			case 'password':
				tmp = config.type;
				break;
			case 'number':
				isMOBILE && (tmp = 'tel');
				break;
		}

		self.tclass('ui-disabled', config.disabled === true);
		self.type = config.type;
		attrs.attr('type', tmp);
		config.placeholder && attrs.attr('placeholder', config.placeholder);
		config.maxlength && attrs.attr('maxlength', config.maxlength);
		config.keypress != null && attrs.attr('data-jc-keypress', config.keypress);
		config.delay && attrs.attr('data-jc-keypress-delay', config.delay);
		config.disabled && attrs.attr('disabled');
		config.error && attrs.attr('error');
		attrs.attr('data-jc-bind', '');

		config.autofill && attrs.attr('name', self.path.replace(/\./g, '_'));
		config.align && attrs.attr('class', 'ui-' + config.align);
		!isMOBILE && config.autofocus && attrs.attr('autofocus');

		builder.push('<div class="ui-textbox-input"><input {0} /></div>'.format(attrs.join(' ')));

		var icon = config.icon;
		var icon2 = config.icon2;

		if (!icon2 && self.type === 'date')
			icon2 = 'calendar';
		else if (self.type === 'search') {
			icon2 = 'search';
			self.setter2 = function(value) {
				if (self.$stateremoved && !value)
					return;
				self.$stateremoved = !value;
				self.find('.ui-textbox-control-icon').tclass('fa-times', !!value).tclass('fa-search', !value);
			};
		}

		icon2 && builder.push('<div class="ui-textbox-control"><span class="fa fa-{0} ui-textbox-control-icon"></span></div>'.format(icon2));
		config.increment && !icon2 && builder.push('<div class="ui-textbox-control"><span class="fa fa-caret-up"></span><span class="fa fa-caret-down"></span></div>');

		if (config.label)
			content = config.label;

		if (content.length) {
			var html = builder.join('');
			builder = [];
			builder.push('<div class="ui-textbox-label{0}">'.format(config.required ? ' ui-textbox-label-required' : ''));
			icon && builder.push('<span class="fa fa-{0}"></span> '.format(icon));
			builder.push(content);
			builder.push(':</div><div class="ui-textbox">{0}</div>'.format(html));
			config.error && builder.push('<div class="ui-textbox-helper"><i class="fa fa-warning" aria-hidden="true"></i> {0}</div>'.format(config.error));
			self.html(builder.join(''));
			self.aclass('ui-textbox-container');
			input = self.find('input');
			container = self.find('.ui-textbox');
		} else {
			config.error && builder.push('<div class="ui-textbox-helper"><i class="fa fa-warning" aria-hidden="true"></i> {0}</div>'.format(config.error));
			self.aclass('ui-textbox ui-textbox-container');
			self.html(builder.join(''));
			input = self.find('input');
			container = self.element;
		}
	};

	self.configure = function(key, value, init) {

		if (init)
			return;

		var redraw = false;

		switch (key) {
			case 'disabled':
				self.tclass('ui-disabled', value);
				self.find('input').prop('disabled', value);
				break;
			case 'format':
				self.format = value;
				self.refresh();
				break;
			case 'required':
				self.noValid(!value);
				!value && self.state(1, 1);
				self.find('.ui-textbox-label').tclass('ui-textbox-label-required', value);
				break;
			case 'placeholder':
				input.prop('placeholder', value || '');
				break;
			case 'maxlength':
				input.prop('maxlength', value || 1000);
				break;
			case 'autofill':
				input.prop('name', value ? self.path.replace(/\./g, '_') : '');
				break;
			case 'label':
				content = value;
				redraw = true;
				break;
			case 'type':
				self.type = value;
				if (value === 'password')
					value = 'password';
				else
					self.type = 'text';
				redraw = true;
				break;
			case 'align':
				input.rclass(input.attr('class')).aclass('ui-' + value || 'left');
				break;
			case 'autofocus':
				input.focus();
				break;
			case 'icon':
			case 'icon2':
			case 'increment':
				redraw = true;
				break;
		}

		redraw && setTimeout2('redraw.' + self.id, function() {
			self.redraw();
			self.refresh();
		}, 100);
	};

	self.formatter(function(path, value) {
		return config.type === 'date' ? (value ? value.format(config.format || 'yyyy-MM-dd') : value) : value;
	});

	self.state = function(type) {
		if (!type)
			return;
		var invalid = config.required ? self.isInvalid() : false;
		if (invalid === self.$oldstate)
			return;
		self.$oldstate = invalid;
		container.tclass('ui-textbox-invalid', invalid);
		config.error && self.find('.ui-textbox-helper').tclass('ui-textbox-helper-show', invalid);
	};
});

COMPONENT('importer', function(self, config) {

	var imported = false;

	self.readonly();
	self.setter = function(value) {

		if (config.if !== value)
			return;

		if (imported) {
			if (config.reload)
				EXEC(config.reload);
			else
				self.setter = null;
			return;
		}

		imported = true;
		IMPORT(config.url, function() {
			if (config.reload)
				EXEC(config.reload);
			else
				self.remove();
		});
	};
});

COMPONENT('visible', function(self, config) {
	var processed, is = false;
	var old = null;

	self.readonly();
	self.setter = function(value) {

		var condition = config.if;

		if (condition)
			is = self.evaluate(condition);
		else
			is = value ? true : false;

		if (old === is)
			return;

		if (is && config.template && !processed) {
			self.import(config.template, NOOP, false);
			processed = true;
		}

		self.tclass('hidden', !is);
		old = is;
	};
});

COMPONENT('validation', 'delay:100;flags:visible', function(self, config) {

	var path, elements = null;
	var def = 'button[name="submit"]';
	var flags = null;

	self.readonly();

	self.make = function() {
		elements = self.find(config.selector || def);
		path = self.path.replace(/\.\*$/, '');
		setTimeout(function() {
			self.watch(self.path, self.state, true);
		}, 50);
	};

	self.configure = function(key, value, init) {
		switch (key) {
			case 'selector':
				if (!init)
					elements = self.find(value || def);
				break;
			case 'flags':
				if (value) {
					flags = value.split(',');
					for (var i = 0; i < flags.length; i++)
						flags[i] = '@' + flags[i];
				} else
					flags = null;
				break;
		}
	};

	self.state = function() {
		setTimeout2(self.id, function() {
			var disabled = DISABLED(path, flags);
			if (!disabled && config.if)
				disabled = !EVALUATE(self.path, config.if);
			elements.prop('disabled', disabled);
		}, config.delay);
	};
});

COMPONENT('websocket', 'reconnect:2000', function(self, config) {

	var ws, url;
	var queue = [];
	var sending = false;

	self.online = false;
	self.readonly();
	self.nocompile();

	self.make = function() {
		url = config.url || '';
		if (!url.match(/^(ws|wss):\/\//))
			url = (location.protocol.length === 6 ? 'wss' : 'ws') + '://' + location.host + (url.substring(0, 1) !== '/' ? '/' : '') + url;
		setTimeout(self.connect, 500);
		self.destroy = self.close;
	};

	self.send = function(obj) {
		queue.push(encodeURIComponent(JSON.stringify(obj)));
		self.process();
		return self;
	};

	self.configure = function(key, value, init) {
		if (init)
			return;
		if (key === 'url')
			url = value;
	};

	self.process = function(callback) {

		if (!ws || sending || !queue.length || ws.readyState !== 1) {
			callback && callback();
			return;
		}

		sending = true;
		var async = queue.splice(0, 3);
		async.waitFor(function(item, next) {
			ws.send(item);
			setTimeout(next, 5);
		}, function() {
			callback && callback();
			sending = false;
			queue.length && self.process();
		});
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

	function onClose(e) {
		if (e.code === 4001) {
			location.reload(true);
		} else {
			self.close(true);
			setTimeout(self.connect, config.reconnect);
		}
	}

	function onMessage(e) {
		var data;
		try {
			data = PARSE(decodeURIComponent(e.data));
		} catch (e) {
			WARN('WebSocket "{0}": {1}'.format(url, e.toString()));
		}
		data && EMIT('message', data);
	}

	function onOpen() {
		self.online = true;
		self.process(function() {
			EMIT('online', true);
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

COMPONENT('designer', function(self) {

	var container, scroller;
	var move = {};
	var widget = {};
	var cells, widgets;
	var size;

	self.make = function() {

		self.aclass('designer');
		self.append('<div class="container fullwidth"><div class="widgets"></div><table class="grid"></table></div>');

		scroller = self.element.closest('.designer-scroll');
		container = self.find('.grid');

		var builder = [];
		for (var i = 0; i < 720; i++) {
			if (i % 24 === 0) {
				if (i)
					builder.push('</tr>');
				builder.push('<tr>');
			}
			builder.push('<td class="cell" data-grid="{0},{1}" data-index="{2}"><div class="space">&nbsp;</div></td>'.format(i % 24, Math.ceil((i + 1) / 24) - 1, i));
		}

		builder.push('</tr>');

		container.append(builder.join(''));
		cells = self.find('.cell');
		widgets = $(self.find('.widgets').eq(0));
		size = self.getSize();
		if (size.width < 300) {
			WAIT(function() {
				return $(window).width();
			}, function(){
				size = self.getSize();
				self.operations.resize();
			});
		}

		self.event('click', '.widget-settings', function(button) {
			var button = $(this);
			var el = button.closest('.widget');
			var w = el.find('[data-name]')[0];
			self.emit('designer.contextmenu', button, el, w ? w.$widget : null);
		});

		self.event('mousedown mousemove mouseup', function(e) {
			switch (e.type) {
				case 'mousemove':
					if (!move.drag && !widget.moving && !widget.resizing)
						return;

					var target = $(e.target);

					if (widget.moving || widget.resizing) {
						self.move_resize_mmove(e);
					} else if (target.hclass('cell') || target.hclass('space')) {
						self.mmove(e.pageX, e.pageY, e);
					} else {
						container.find('.selected').rclass('selected');
						move.drag = false;
					}

					e.preventDefault();
					break;
				case 'mousedown':
					if (e.which === 3 || e.button === 2) // ignore right click
						return;
					var el = $(e.target);
					if (el.hclass('move') || el.hclass('resize') || el.parent().hclass('resize')) {
						self.move_resize_mdown(el, e);
					} else
						self.mdown(e.pageX, e.pageY, e);
					e.preventDefault();
					break;
				case 'mouseup':
					if (widget.moving || widget.resizing) {
						widget.moving = false;
						widget.resizing = false;
						self.scroller_cursor(false); // reset
						var grid = widget.element.attr('data-grid').split(',');
						if (common.device === 'desktop') {
							grid[0] = widget.index;
							grid[1] = widget.size.cols;
							grid[2] = widget.size.rows;
						} else {
							grid[3] = widget.index;
							grid[4] = widget.size.cols;
							grid[5] = widget.size.rows;
						}
						widget.element.attr('data-grid', grid.join(','));
					} else {
						if (!move.drag)
							return;
						self.mup(e.pageX, e.pageY, e);
					}

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
					if (target.hclass('cell') || target.hclass('space')) {
						self.mmove(e.pageX, e.pageY, e);
					} else {
						container.find('.selected').rclass('selected');
						move.drag = false;
					}

					for (var i = 0, length = move.intervals.length; i < length; i++) {
						var int = move.intervals[i];
						if (e.pageX >= int.x && e.pageX <= int.w && e.pageY >= int.y && e.pageY <= int.h) {
							container.find('.selected').rclass('selected');
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
					if (!target.hclass('cell'))
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
		obj.width = container.width();
		obj.cell = 100 / 24;
		obj.pixels = (obj.width / 100) * obj.cell;
		common.size = obj;
		return obj;
	};

	self.scroller_cursor = function(el) {
		if (el === false) {
			scroller.css('cursor', 'default');
			$('.widget-toolbar .move').css('cursor', 'move');
			return;
		}

		if (el.hclass('move')) {
			scroller.css('cursor', 'move');
		} else {
			scroller.css('cursor', 'se-resize');
			$('.widget-toolbar .move').css('cursor', 'se-resize');
		}
	};

	self.move_resize_mdown = function(el, e) {

		widgets.find('.widget').each(function() {
			$(this).css('z-index', 2);
		});

		self.scroller_cursor(el);
		widget.element = el.closest('.widget');
		var offset = widget.element.offset();
		widget.mouse_offset = { col: Math.floor((e.pageX - offset.left) / size.pixels), row: Math.floor((e.pageY - offset.top) / size.pixels)};
		widget.zindex = widget.element.css('z-index');
		widget.element.css('z-index', 15);
		var grid = self.grid(widget.element.attr('data-grid').split(','));
		widget.index = grid.index;
		widget.size = { cols: grid.cols, rows: grid.rows };
		widget.pos = self.getPosition(widget.index);
		widget.origin = { pos: CLONE(widget.pos), size: CLONE(widget.size) };

		if (el.hclass('move')) {
			widget.moving = true;
			widget.move_cols = 0;
			widget.move_rows = 0;
		} else {
			widget.resizing = true;
			widget.resize_cols = 0;
			widget.resize_rows = 0;
		}
	};

	self.move_resize_mmove = function(e) {

		var item = common.designer.findItem('id', widget.element.attr('data-id'));
		var offset = container.offset();

		if (widget.moving) {
			var mouse_col = Math.floor((e.pageX - offset.left) / size.pixels);
			var mouse_row = Math.floor((e.pageY - offset.top) / size.pixels);
			var move_cols = mouse_col - widget.mouse_offset.col - widget.origin.pos.col;
			var move_rows = mouse_row - widget.mouse_offset.row - widget.origin.pos.row;
			if (widget.move_cols === move_cols && widget.move_rows === move_rows)
				return;
			var item_col = widget.index % 24;
			var item_row = Math.floor(widget.index / 24);
			if (item_col < 0 || item_row < 0)
				return;
			widget.move_cols = (widget.origin.pos.col + move_cols + widget.origin.size.cols) > 24 ? 24 - (widget.origin.pos.col + widget.origin.size.cols) : move_cols;
			widget.move_rows = move_rows;
			var col = widget.origin.pos.col + widget.move_cols;
			var row = widget.origin.pos.row + widget.move_rows;
			col = col < 0 ? 0 : col;
			row = row < 0 ? 0 : row;
			widget.element.animate({ left: col * size.pixels, top: row * size.pixels }, 15);
			widget.index = (row * 24) + col;
			if (item)
				item[common.device === 'desktop' ? 'index' : 'mindex'] = widget.index;
		}

		if (widget.resizing) {
			var resize_cols = Math.floor((e.pageX - offset.left) / size.pixels) - widget.mouse_offset.col - widget.origin.pos.col;
			var resize_rows = Math.floor((e.pageY - offset.top) / size.pixels) - widget.mouse_offset.row - widget.origin.pos.row;
			if ((widget.resize_cols === resize_cols && widget.resize_rows === resize_rows) || (widget.origin.pos.col + widget.origin.size.cols + resize_cols) > 24)
				return;
			widget.resize_cols = resize_cols;
			widget.resize_rows = resize_rows;
			widget.size.cols = +widget.origin.size.cols + resize_cols;
			widget.size.rows = +widget.origin.size.rows + resize_rows;
			if (widget.size.cols < 1)
				widget.size.cols = 1;
			if (widget.size.rows < 1)
				widget.size.rows = 1;
			widget.element.animate({ width: widget.size.cols * size.pixels, height: widget.size.rows * size.pixels }, 15);
			if (item) {
				item[common.device === 'desktop' ? 'cols' : 'mcols'] = widget.size.cols;
				item[common.device === 'desktop' ? 'rows' : 'mrows'] = widget.size.rows;
				var instance = widget.element.find('figure')[0].$widget;
				if (instance) {
					var padding = instance.size.padding;
					instance.size = { cols: widget.size.cols, rows: widget.size.rows, height: (size.pixels * widget.size.rows) - (padding * 2), width: (size.pixels * widget.size.cols) - (padding * 2), padding: padding, pixels: size.pixels };
					instance.emit('resize', instance.size);
				}
			}
		}
	};

	self.mup = function() {
		move.drag = false;
		var selected = container.find('.selected');
		if (!selected.length)
			return;
		var first = selected.first();
		var last = selected.last();
		var gridA = first.attrd('grid').split(',');
		var gridB = last.attrd('grid').split(',');
		var off = self.getStartPosition(+gridA[0], +gridA[1]);
		move.x = off.x;
		move.y = off.y;
		var cols = +gridB[0] - (+gridA[0]) + 1;
		var rows = +gridB[1] - (+gridA[1]) + 1;
		selected.aclass('locked').rclass('selected');
		var index = +first.attrd('index');
		var selection = { id: Date.now(), tab: common.tab.id, rows: rows, cols: cols, index: index, mrows: rows, mcols: cols, mindex: index };
		self.create(selection, true);
	};

	self.mdown = function(x, y, e) {
		move.drag = true;
		move.scrollX = scroller.prop('scrollLeft');
		move.scrollY = scroller.prop('scrollTop');
		var item = cells.eq(0);
		move.x = e.pageX - item.width();
		move.y = e.pageY - item.height();
	};

	self.mmove = function(x, y) {

		var fx = x > move.x ? move.x : x - size.pixels;
		var fy = y > move.y ? move.y : y - size.pixels;
		var tx = x > move.x ? x : move.x + size.pixels;
		var ty = y > move.y ? y : move.y + size.pixels;
		cells.each(function() {
			var el = $(this);
			var offset = el.offset();
			var is = offset.left >= fx && offset.left <= tx && offset.top >= fy && offset.top <= ty;
			el.tclass('selected', is);
		});
	};

	self.create = function(w) {
		var key = common.device === 'mobile' ? 'm' : '';
		var pos = self.getPosition(w[key + 'index']);
		var grid = w.index + ',' + w.cols + ',' + w.rows + ',' + (w.mindex === 0 ? 0 : (w.mindex || w.index)) + ',' + (w.mcols === 0 ? 0 : (w.mcols || w.cols)) + ',' + (w.mrows === 0 ? 0 : (w.mrows || w.rows));
		var html = '<div class="widget tab_{5} hidden" style="left:{0}px;top:{1}px;width:{2}px;height:{3}px" data-grid="{4}" data-tab="{5}" data-id="{6}"><div class="widget-toolbar"><div class="move"></div><div class="resize"></div><button class="widget-settings"><i class="fa fa-wrench" style=""></i></i></button></div><div class="widget-body">{7}</div></div>';
		html = html.format(pos.col * size.pixels, pos.row * size.pixels, w[key + 'cols'] * size.pixels, w[key + 'rows'] * size.pixels, grid, w.tab, w.id, w.app ? '<figure data-name="{0}"></figure>'.format(w.app) : '');
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
			opt.index = +grid[0];
			opt.cols = +grid[1];
			opt.rows = +grid[2];
			opt.mindex = +grid[3];
			opt.mcols = +grid[4];
			opt.mrows = +grid[5];
			opt.device = device;
			opt.width = opt[common.device === 'desktop' ? 'cols' : 'mcols'] * size.pixels;
			opt.height = opt[common.device === 'desktop' ? 'rows' : 'mrows'] * size.pixels;

			if (!instance) {
				instance = { id: id, app: declaration.name, index: opt.index, cols: opt.cols, rows: opt.rows, mindex: opt.mindex, mcols: opt.mcols, mrows: opt.mrows, tab: self.attr('data-tab'), options: null };
				common.designer.push(instance);
			}

			opt.padding = (w.css('padding') || '').parseInt();

			this.$widget = new Instance(id, el, declaration, instance.options, opt);
			this.$widget.$events[device] && this.$widget.emit(device, opt);
			csswh.width = opt.width;
			csswh.height = opt.height;
			// this.$widget.css(csswh);
			var k;
			if (common.device === 'desktop')
				k = opt.cols + 'x' + opt.rows;
			else
				k = opt.mcols + 'x' + opt.mrows;
			this.$widget.$events[k] && this.$widget.emit(k, opt);
		});

		setTimeout2('designer.tabs', function() {
			self.operations.tab();
		}, 100);
	};

	self.getPosition = function(index) {
		var ri = (index / 24) >> 0;
		var ci = index % 24;
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
			items.push({ id: el.attrd('id'), index: +pos[0], cols: +pos[1], rows: +pos[2], mindex: +pos[3], mcols: +pos[4], mrows: +pos[5], tab: el.attrd('tab'), app: app.length ? app.attrd('name') : null, options: app.length && app[0].$widget ? app[0].$widget.options : null });
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
					self.create(item);
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
			var widget = el.find('figure[data-name]')[0];

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
				var hidden = el.hclass('hidden');
				if (el.hclass('tab_' + common.tab.id)) {
					hidden && el.rclass('hidden');
				} else {
					!hidden && el.aclass('hidden');
				}
			});
		}, 100);
	};

	self.grid = function(grid) {
		var g = {};
		if (common.device === 'desktop') {
			g.index = +grid[0];
			g.cols = +grid[1];
			g.rows = +grid[2];
		} else {
			g.index = +grid[3];
			g.cols = +grid[4];
			g.rows = +grid[5];
		}
		return g;
	};

	self.operations.resize = function() {

		if (!common.draft)
			common.device = WIDTH() === 'xs' ? 'mobile' : 'desktop';

		setTimeout2(self.id + '.resize', function() {

			size = self.getSize();

			var device = WIDTH();
			var css = {};
			var csswh = {};

			cells.css('height', size.pixels + 'px');

			widgets.find('.widget').each(function() {
				var el = $(this);
				var grid = self.grid(el.attrd('grid').split(','));
				var cols = grid.cols;
				var rows = grid.rows;
				var index = grid.index;
				var pos = self.getPosition(index);

				css.left = pos.col * size.pixels + 'px';
				css.top = pos.row * size.pixels + 'px';
				css.width = cols * size.pixels + 'px';
				css.height = rows * size.pixels + 'px';
				el.css(css);

				var app = el.find('[data-name]')[0];
				if (app) {
					var opt = {};
					opt.cols = cols;
					opt.rows = rows;
					opt.device = device;
					opt.width = cols * size.pixels;
					opt.height = rows * size.pixels;
					opt.padding = (el.css('padding') || '').parseInt();
					csswh.width = opt.width;
					csswh.height = opt.height;
					if (app.$widget) {
						var sz = app.$widget.size = CLONE(opt);
						if (sz.padding > 0) {
							sz.width -= sz.padding * 2;
							sz.height -= sz.padding * 2;
						}
						app.$widget.$events.resize && app.$widget.emit('resize', sz);
						app.$widget.$events[device] && app.$widget.emit(device, sz);
					}
				}
			});
		}, 100, 10);
	};

});

COMPONENT('checkbox', function(self, config) {

	self.validate = function(value) {
		return (config.disabled || !config.required) ? true : (value === true || value === 'true' || value === 'on');
	};

	self.configure = function(key, value, init) {
		if (init)
			return;
		switch (key) {
			case 'label':
				self.find('span').html(value);
				break;
			case 'required':
				self.find('span').tclass('ui-checkbox-label-required', value);
				break;
			case 'disabled':
				self.tclass('ui-disabled', value);
				break;
			case 'checkicon':
				self.find('i').rclass().aclass('fa fa-' + value);
				break;
		}
	};

	self.make = function() {
		self.aclass('ui-checkbox');
		self.html('<div><i class="fa fa-{2}"></i></div><span{1}>{0}</span>'.format(config.label || self.html(), config.required ? ' class="ui-checkbox-label-required"' : '', config.checkicon || 'check'));
		self.event('click', function() {
			if (config.disabled)
				return;
			self.dirty(false);
			self.getter(!self.get(), 2, true);
		});
	};

	self.setter = function(value) {
		self.toggle('ui-checkbox-checked', value ? true : false);
	};
});

COMPONENT('checkboxlist', 'checkicon:check', function(self, config) {

	var W = window;
	!W.$checkboxlist && (W.$checkboxlist = Tangular.compile('<div{{ if $.class }} class="{{ $.class }}"{{ fi }}><div class="ui-checkboxlist-item" data-index="{{ index }}"><div><i class="fa fa-{{ $.checkicon }}"></i></div><span>{{ text }}</span></div></div>'));

	var template = W.$checkboxlist;
	var container, data, datasource, content, dataold, render = null;

	self.nocompile();

	self.validate = function(value) {
		return config.disabled || !config.required ? true : value && value.length > 0;
	};

	self.configure = function(key, value, init) {

		if (init)
			return;

		var redraw = false;

		switch (key) {

			case 'type':
				self.type = value;
				break;

			case 'checkicon':
				self.find('i').rclass().aclass('fa fa-' + value);
				break;

			case 'disabled':
				self.tclass('ui-disabled', value);
				break;

			case 'datasource':
				self.datasource(value, self.bind);
				datasource && self.refresh();
				datasource = value;
				break;

			case 'icon':
				if (!self.find('.ui-checkboxlist-label').find('i').rclass().aclass('fa fa-' + value).length)
					redraw = true;
				break;

			case 'required':
				self.find('.ui-checkboxlist-label').tclass('ui-checkboxlist-required', value);
				self.state(1, 1);
				break;

			case 'label':
				redraw = true;
				break;

			case 'items':

				if (value instanceof Array) {
					self.bind('', value);
					return;
				}

				var items = [];
				value.split(',').forEach(function(item) {
					item = item.trim().split('|');
					var val = (item[1] == null ? item[0] : item[1]).trim();
					if (config.type === 'number')
						val = +val;
					items.push({ name: item[0].trim(), id: val });
				});

				self.bind('', items);
				self.refresh();
				break;
		}

		redraw && setTimeout2(self.id + '.redraw', function() {
			self.redraw();
			self.bind('', dataold);
			self.refresh();
		}, 100);
	};

	self.make = function() {

		self.aclass('ui-checkboxlist');
		content = self.html();
		config.type && (self.type = config.type);
		self.redraw();

		if (config.items)
			self.reconfigure({ items: config.items });
		else if (config.datasource)
			self.reconfigure({ datasource: config.datasource });
		else
			self.bind('', null);

		self.event('click', '.ui-checkboxlist-item', function(e) {

			e.stopPropagation();

			if (config.disabled)
				return;

			var el = $(this);
			var is = !el.hclass('ui-checkboxlist-checked');
			var index = +el.attr('data-index');
			var value = data[index];

			if (value == null)
				return;

			value = value.value;

			var arr = self.get();
			if (!(arr instanceof Array))
				arr = [];

			var index = arr.indexOf(value);

			if (is) {
				index === -1 && arr.push(value);
			} else {
				index !== -1 && arr.splice(index, 1);
			}

			self.reset(true);
			self.set(arr, 2);
		});
	};

	self.redraw = function() {
		var label = config.label || content;
		self.html((label ? '<div class="ui-checkboxlist-label{1}">{2}{0}</div>'.format(label, config.required ? ' ui-checkboxlist-required' : '', config.icon ? '<i class="fa fa-{0}"></i>'.format(config.icon) : '') : '') + '<div class="ui-checkboxlist-container"></div>');
		container = self.find('.ui-checkboxlist-container');
	};

	self.selectall = function() {

		if (config.disabled)
			return;

		var arr = [];
		var inputs = self.find('.ui-checkboxlist-item');
		var value = self.get();

		self.change(true);

		if (value && inputs.length === value.length) {
			self.set(arr);
			return;
		}

		inputs.each(function() {
			var el = $(this);
			arr.push(self.parser(data[+el.attr('data-index')].value));
		});

		self.set(arr);
	};

	self.bind = function(path, value) {

		if (!value)
			return;

		var kv = config.value || 'id';
		var kt = config.text || 'name';

		render = '';
		data = [];
		dataold = value;

		for (var i = 0, length = value.length; i < length; i++) {
			var isString = typeof(value[i]) === 'string';
			var item = { value: isString ? value[i] : value[i][kv], text: isString ? value[i] : value[i][kt], index: i };
			render += template(item, config);
			data.push(item);
		}

		if (render)
			container.html(render);
		else
			container.html(config.empty);
	};

	self.setter = function(value) {
		container.find('.ui-checkboxlist-item').each(function() {
			var el = $(this);
			var index = +el.attr('data-index');
			var checked = false;
			if (!value || !value.length)
				checked = false;
			else if (data[index])
				checked = data[index];
			checked && (checked = value.indexOf(checked.value) !== -1);
			el.tclass('ui-checkboxlist-checked', checked);
		});
	};

	self.state = function(type) {
		if (!type)
			return;
		var invalid = config.required ? self.isInvalid() : false;
		if (invalid === self.$oldstate)
			return;
		self.$oldstate = invalid;
		self.find('.ui-checkboxlist').tclass('ui-checkboxlist-invalid', invalid);
	};
});

COMPONENT('dropdowncheckbox', 'checkicon:check;visible:0;alltext:All selected;limit:0;selectedtext:{0} selected', function(self, config) {

	var data = [], render = '';
	var container, values, content, datasource = null;
	var prepared = false;
	var W = window;

	!W.$dropdowncheckboxtemplate && (W.$dropdowncheckboxtemplate = Tangular.compile('<div class="ui-dropdowncheckbox-item" data-index="{{ index }}"><div><i class="fa fa-{{ $.checkicon }}"></i></div><span>{{ text }}</span></div>'));
	var template = W.$dropdowncheckboxtemplate;

	self.validate = function(value) {
		return config.disabled || !config.required ? true : value && value.length > 0;
	};

	self.configure = function(key, value, init) {

		if (init)
			return;

		var redraw = false;

		switch (key) {

			case 'type':
				self.type = value;
				break;

			case 'required':
				self.find('.ui-dropdowncheckbox-label').tclass('ui-dropdowncheckbox-required', config.required);
				break;

			case 'label':
				content = value;
				redraw = true;
				break;

			case 'disabled':
				self.tclass('ui-disabled', value);
				break;

			case 'checkicon':
				self.find('i').rclass().aclass('fa fa-' + value);
				break;

			case 'icon':
				redraw = true;
				break;

			case 'datasource':
				self.datasource(value, self.bind);
				datasource && self.refresh();
				datasource = value;
				break;

			case 'items':

				if (value instanceof Array) {
					self.bind('', value);
					return;
				}

				var items = [];
				value.split(',').forEach(function(item) {
					item = item.trim().split('|');
					var val = (item[1] == null ? item[0] : item[1]).trim();
					if (config.type === 'number')
						val = +val;
					items.push({ name: item[0].trim(), id: val });
				});

				self.bind('', items);
				self.refresh();
				break;
		}

		redraw && setTimeout2(self.id + '.redraw', self.redraw, 100);
	};

	self.redraw = function() {

		var html = '<div class="ui-dropdowncheckbox"><span class="fa fa-sort"></span><div class="ui-dropdowncheckbox-selected"></div></div><div class="ui-dropdowncheckbox-values hidden">{0}</div>'.format(render);
		if (content.length)
			self.html('<div class="ui-dropdowncheckbox-label{0}">{1}{2}:</div>'.format(config.required ? ' ui-dropdowncheckbox-required' : '', config.icon ? ('<i class="fa fa-' + config.icon + '"></i>') : '', content) + html);
		else
			self.html(html);

		container = self.find('.ui-dropdowncheckbox-values');
		values = self.find('.ui-dropdowncheckbox-selected');
		prepared && self.refresh();
		self.tclass('ui-disabled', config.disabled === true);
	};

	self.make = function() {

		self.type = config.type;

		content = self.html();
		self.aclass('ui-dropdowncheckbox-container');
		self.redraw();

		if (config.items)
			self.reconfigure({ items: config.items });
		else if (config.datasource)
			self.reconfigure({ datasource: config.datasource });
		else
			self.bind('', null);

		self.event('click', '.ui-dropdowncheckbox', function(e) {

			if (config.disabled)
				return;

			container.tclass('hidden');

			if (W.$dropdowncheckboxelement) {
				W.$dropdowncheckboxelement.aclass('hidden');
				W.$dropdowncheckboxelement = null;
			}

			!container.hclass('hidden') && (W.$dropdowncheckboxelement = container);
			e.stopPropagation();
		});

		self.event('click', '.ui-dropdowncheckbox-item', function(e) {

			e.stopPropagation();

			if (config.disabled)
				return;

			var el = $(this);
			var is = !el.hclass('ui-dropdowncheckbox-checked');
			var index = +el.attr('data-index');
			var value = data[index];

			if (value === undefined)
				return;

			value = value.value;

			var arr = self.get();

			if (!(arr instanceof Array))
				arr = [];

			var index = arr.indexOf(value);

			if (is) {
				if (config.limit && arr.length === config.limit)
					return;
				index === -1 && arr.push(value);
			} else {
				index !== -1 && arr.splice(index, 1);
			}

			self.set(arr);
			self.change(true);
		});
	};

	self.bind = function(path, value) {
		var clsempty = 'ui-dropdowncheckbox-values-empty';

		if (value !== undefined)
			prepared = true;

		if (!value || !value.length) {
			var h = config.empty || '&nbsp;';
			if (h === self.old)
				return;
			container.aclass(clsempty).html(h);
			self.old = h;
			return;
		}

		var kv = config.value || 'id';
		var kt = config.text || 'name';

		render = '';
		data = [];

		for (var i = 0, length = value.length; i < length; i++) {
			var isString = typeof(value[i]) === 'string';
			var item = { value: isString ? value[i] : value[i][kv], text: isString ? value[i] : value[i][kt], index: i };
			render += template(item, config);
			data.push(item);
		}

		var h = HASH(render);
		if (h === self.old)
			return;

		self.old = h;

		if (render)
			container.rclass(clsempty).html(render);
		else
			container.aclass(clsempty).html(config.empty);

		self.refresh();
	};

	self.setter = function(value) {

		if (!prepared)
			return;

		var label = '';
		var count = value == null || !value.length ? undefined : value.length;

		if (value && count) {
			var remove = [];
			for (var i = 0; i < count; i++) {
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
				!is && remove.push(selected);
			}

			if (config.cleaner !== false && value) {
				var refresh = false;
				while (true) {
					var item = remove.shift();
					if (item === undefined)
						break;
					value.splice(value.indexOf(item), 1);
					refresh = true;
				}
				refresh && self.set(value);
			}
		}

		container.find('.ui-dropdowncheckbox-item').each(function() {
			var el = $(this);
			var index = +el.attr('data-index');
			var checked = false;
			if (!value || !value.length)
				checked = false;
			else if (data[index])
				checked = data[index];
			checked && (checked = value.indexOf(checked.value) !== -1);
			el.tclass('ui-dropdowncheckbox-checked', checked);
		});

		if (!label && value && config.cleaner !== false) {
			// invalid data
			// it updates model without notification
			self.rewrite([]);
		}

		if (!label && config.placeholder) {
			values.rattr('title', '');
			values.html('<span>{0}</span>'.format(config.placeholder));
		} else {
			if (count == data.length && config.alltext !== 'null' && config.alltext)
				label = config.alltext;
			else if (config.visible && count > config.visible)
				label = config.selectedtext.format(count, data.length);
			values.attr('title', label);
			values.html(label);
		}
	};

	self.state = function(type) {
		if (!type)
			return;
		var invalid = config.required ? self.isInvalid() : false;
		if (invalid === self.$oldstate)
			return;
		self.$oldstate = invalid;
		self.find('.ui-dropdowncheckbox').tclass('ui-dropdowncheckbox-invalid', invalid);
	};

	if (W.$dropdowncheckboxevent)
		return;

	W.$dropdowncheckboxevent = true;
	$(document).on('click', function() {
		if (W.$dropdowncheckboxelement) {
			W.$dropdowncheckboxelement.aclass('hidden');
			W.$dropdowncheckboxelement = null;
		}
	});
});

COMPONENT('dropdown', function(self, config) {

	var select, container, condition, content = null;
	var render = '';

	self.nocompile();

	self.validate = function(value) {

		if (!config.required || config.disabled)
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

	self.configure = function(key, value, init) {

		if (init)
			return;

		var redraw = false;

		switch (key) {
			case 'type':
				self.type = value;
				break;
			case 'items':

				if (value instanceof Array) {
					self.bind('', value);
					return;
				}

				var items = [];

				value.split(',').forEach(function(item) {
					item = item.trim().split('|');
					var obj = { id: item[1] == null ? item[0] : item[1], name: item[0] };
					items.push(obj);
				});

				self.bind('', items);
				break;
			case 'if':
				condition = value ? FN(value) : null;
				break;
			case 'required':
				self.find('.ui-dropdown-label').tclass('ui-dropdown-label-required', value);
				self.state(1, 1);
				break;
			case 'datasource':
				self.datasource(value, self.bind);
				break;
			case 'label':
				content = value;
				redraw = true;
				break;
			case 'icon':
				redraw = true;
				break;
			case 'disabled':
				self.tclass('ui-disabled', value);
				self.find('select').prop('disabled', value);
				break;
		}

		redraw && setTimeout2(self.id + '.redraw', 100);
	};

	self.bind = function(path, arr) {

		if (!arr)
			arr = EMPTYARRAY;

		var builder = [];
		var value = self.get();
		var template = '<option value="{0}"{1}>{2}</option>';
		var propText = config.text || 'name';
		var propValue = config.value || 'id';

		config.empty !== undefined && builder.push('<option value="">{0}</option>'.format(config.empty));

		for (var i = 0, length = arr.length; i < length; i++) {
			var item = arr[i];
			if (condition && !condition(item))
				continue;
			if (item.length)
				builder.push(template.format(item, value === item ? ' selected="selected"' : '', item));
			else
				builder.push(template.format(item[propValue], value === item[propValue] ? ' selected="selected"' : '', item[propText]));
		}

		render = builder.join('');
		select.html(render);
	};

	self.redraw = function() {
		var html = '<div class="ui-dropdown"><select data-jc-bind="">{0}</select></div>'.format(render);
		var builder = [];
		var label = content || config.label;
		if (label) {
			builder.push('<div class="ui-dropdown-label{0}">{1}{2}:</div>'.format(config.required ? ' ui-dropdown-label-required' : '', config.icon ? '<span class="fa fa-{0}"></span> '.format(config.icon) : '', label));
			builder.push('<div class="ui-dropdown-values">{0}</div>'.format(html));
			self.html(builder.join(''));
		} else
			self.html(html).aclass('ui-dropdown-values');
		select = self.find('select');
		container = self.find('.ui-dropdown');
		render && self.refresh();
		config.disabled && self.reconfigure('disabled:true');
	};

	self.make = function() {
		self.type = config.type;
		content = self.html();
		self.aclass('ui-dropdown-container');
		self.redraw();
		config.if && (condition = FN(config.if));
		config.items && self.reconfigure({ items: config.items });
		config.datasource && self.reconfigure('datasource:' + config.datasource);
	};

	self.state = function(type) {
		if (!type)
			return;
		var invalid = config.required ? self.isInvalid() : false;
		if (invalid === self.$oldstate)
			return;
		self.$oldstate = invalid;
		container.tclass('ui-dropdown-invalid', invalid);
	};
});

COMPONENT('selectbox', function(self, config) {

	var Eitems, Eselected = null;

	self.mydata = EMPTYARRAY;
	self.template = Tangular.compile('<li data-search="{{ search }}" data-index="{{ index }}">{{ text }}</li>');

	self.nocompile();

	self.validate = function(value) {
		return config.disabled || !config.required ? true : value && value.length > 0;
	};

	self.configure = function(key, value, init) {
		if (init)
			return;

		var redraw = false;

		switch (key) {
			case 'type':
				self.type = value;
				break;
			case 'disabled':
				self.tclass('ui-disabled', value);
				self.find('input').prop('disabled', value);
				if (value)
					self.rclass('ui-selectbox-invalid');
				else if (config.required)
					self.state(1, 1);
				break;
			case 'required':
				!value && self.state(1, 1);
				break;
			case 'height':
			case 'search':
				redraw = true;
				break;
			case 'items':
				var arr = [];
				value.split(',').forEach(function(item) {
					item = item.trim().split('|');
					var obj = {};
					obj.name = item[0].trim();
					obj.id = (item[1] == null ? item[0] : item[1]).trim();
					if (config.type === 'number')
						obj.id = +obj.id;
					arr.push(obj);
				});
				self.bind('', arr);
				break;
			case 'datasource':
				self.datasource(value, self.bind, true);
				break;
		}

		redraw && self.redraw();
	};

	self.search = function() {
		var search = config.search ? self.find('input').val().toSearch() : '';
		Eitems.find('li').each(function() {
			var el = $(this);
			el.tclass('hidden', el.attrd('search').indexOf(search) === -1);
		});
		self.find('.ui-selectbox-search-icon').tclass('fa-search', search.length === 0).tclass('fa-times', search.length > 0);
	};

	self.redraw = function() {
		self.html((typeof(config.search) === 'string' ? '<div class="ui-selectbox-search"><span><i class="fa fa-search ui-selectbox-search-icon"></i></span><div><input type="text" placeholder="{0}" /></div></div><div>'.format(config.search) : '') + '<div style="height:{0}px"><ul></ul><ul style="height:{0}px"></ul></div>'.format(config.height || '200'));
		self.find('ul').each(function(index) {
			if (index)
				Eselected = $(this);
			else
				Eitems = $(this);
		});
	};

	self.bind = function(path, value) {

		var kt = config.text || 'name';
		var kv = config.value || 'id';
		var builder = [];

		self.mydata = [];
		value && value.forEach(function(item, index) {

			var text;
			var value;

			if (typeof(item) === 'string') {
				text = item;
				value = self.parser(item);
			} else {
				text = item[kt];
				value = item[kv];
			}

			var item = { text: text, value: value, index: index, search: text.toSearch() };
			self.mydata.push(item);
			builder.push(self.template(item));
		});

		self.search();
		Eitems.empty().append(builder.join(''));
	};

	self.make = function() {

		self.aclass('ui-selectbox');
		self.redraw();

		config.datasource && self.reconfigure('datasource:' + config.datasource);
		config.items && self.reconfigure('items:' + config.items);

		self.event('click', 'li', function() {
			if (config.disabled)
				return;
			var selected = self.get() || [];
			var index = +this.getAttribute('data-index');
			var value = self.mydata[index];

			if (selected.indexOf(value.value) === -1)
				selected.push(value.value);
			else
				selected = selected.remove(value.value);

			self.set(selected);
			self.change(true);
		});

		self.event('click', '.fa-times', function() {
			if (config.disabled)
				return;
			self.find('input').val('');
			self.search();
		});

		typeof(config.search) === 'string' && self.event('keydown', 'input', function() {
			if (config.disabled)
				return;
			setTimeout2(self.id, self.search, 500);
		});
	};

	self.setter = function(value) {

		var selected = {};
		var builder = [];

		var ds = self.mydata;
		var dsl = ds.length;

		if (value) {
			for (var i = 0, length = value.length; i < length; i++) {
				for (var j = 0; j < dsl; j++) {
					if (ds[j].value === value[i]) {
						selected[j] = true;
						builder.push(self.template(ds[j]));
					}
				}
			}
		}

		Eitems.find('li').each(function() {
			var el = $(this);
			var index = +el.attrd('index');
			el.tclass('ui-selectbox-selected', selected[index] !== undefined);
		});

		Eselected.empty().append(builder.join(''));
		self.search();
	};

	self.state = function(type) {
		if (!type)
			return;
		var invalid = config.required ? self.isInvalid() : false;
		if (invalid === self.$oldstate)
			return;
		self.$oldstate = invalid;
		self.tclass('ui-selectbox-invalid', invalid);
	};
});

COMPONENT('textboxlist', 'maxlength:100', function(self, config) {

	var container, content;
	var empty = {};
	var skip = false;
	var cempty = 'empty';

	self.readonly();
	self.nocompile();
	self.template = Tangular.compile('<div class="ui-textboxlist-item"><div><i class="fa fa-times"></i></div><div><input type="text" maxlength="{{ max }}" placeholder="{{ placeholder }}"{{ if disabled}} disabled="disabled"{{ fi }} value="{{ value }}" /></div></div>');

	self.configure = function(key, value, init, prev) {
		if (init)
			return;

		var redraw = false;
		switch (key) {
			case 'disabled':
				self.tclass('ui-required', value);
				self.find('input').prop('disabled', true);
				empty.disabled = value;
				break;
			case 'maxlength':
				empty.max = value;
				self.find('input').prop(key, value);
				break;
			case 'placeholder':
				empty.placeholder = value;
				self.find('input').prop(key, value);
				break;
			case 'label':
				redraw = true;
				break;
			case 'icon':
				if (value && prev)
					self.find('i').rclass().aclass(value);
				else
					redraw = true;
				break;
		}

		if (redraw) {
			skip = false;
			self.redraw();
			self.refresh();
		}
	};

	self.redraw = function() {

		var icon = '';
		var html = config.label || content;

		if (config.icon)
			icon = '<i class="fa fa-{0}"></i>'.format(config.icon);

		empty.value = '';
		self.html((html ? '<div class="ui-textboxlist-label">{1}{0}:</div>'.format(html, icon) : '') + '<div class="ui-textboxlist-items"></div>' + self.template(empty).replace('-item"', '-item ui-textboxlist-base"'));
		container = self.find('.ui-textboxlist-items');
	};

	self.make = function() {

		empty.max = config.max;
		empty.placeholder = config.placeholder;
		empty.value = '';
		empty.disabled = config.disabled;

		if (config.disabled)
			self.aclass('ui-disabled');

		content = self.html();
		self.aclass('ui-textboxlist');
		self.redraw();

		self.event('click', '.fa-times', function() {

			if (config.disabled)
				return;

			var el = $(this);
			var parent = el.closest('.ui-textboxlist-item');
			var value = parent.find('input').val();
			var arr = self.get();

			parent.remove();

			var index = arr.indexOf(value);
			if (index === -1)
				return;

			arr.splice(index, 1);

			self.tclass(cempty, arr.length === 0);

			skip = true;
			self.set(arr, 2);
			self.change(true);
		});

		self.event('change keypress', 'input', function(e) {

			if (config.disabled || (e.type !== 'change' && e.which !== 13))
				return;

			var el = $(this);

			var value = this.value.trim();
			if (!value)
				return;

			var arr = [];
			var base = el.closest('.ui-textboxlist-base').length > 0;

			if (base && e.type === 'change')
				return;

			var raw = self.get();

			if (base) {

				if (!raw || raw.indexOf(value) === -1)
					self.push(self.path, value, 2);

				this.value = '';
				self.change(true);
				return;
			}

			container.find('input').each(function() {
				arr.push(this.value.trim());
			});

			skip = true;
			self.set(arr, 2);
			self.change(true);
		});
	};

	self.setter = function(value) {

		if (skip) {
			skip = false;
			return;
		}

		if (!value || !value.length) {
			self.aclass(cempty);
			container.empty();
			return;
		}

		self.rclass(cempty);

		var builder = [];

		value.forEach(function(item) {
			empty.value = item;
			builder.push(self.template(empty));
		});

		container.empty().append(builder.join(''));
	};
});

COMPONENT('autocomplete', 'height:200', function(self, config) {

	var container, old, onSearch, searchtimeout, searchvalue, blurtimeout, onCallback, datasource, offsetter, scroller;
	var is = false;
	var margin = {};

	self.template = Tangular.compile('<li{{ if index === 0 }} class="selected"{{ fi }} data-index="{{ index }}"><span>{{ name }}</span><span>{{ type }}</span></li>');
	self.readonly();
	self.singleton();
	self.nocompile();

	self.make = function() {
		self.aclass('ui-autocomplete-container hidden');
		self.html('<div class="ui-autocomplete"><ul></ul></div>');

		scroller = self.find('.ui-autocomplete');
		container = self.find('ul');

		self.event('click', 'li', function(e) {
			e.preventDefault();
			e.stopPropagation();
			if (onCallback) {
				var val = datasource[+$(this).attrd('index')];
				if (typeof(onCallback) === 'string')
					SET(onCallback, val.value === undefined ? val.name : val.value);
				else
					onCallback(val, old);
			}
			self.visible(false);
		});

		self.event('mouseenter mouseleave', 'li', function(e) {
			$(this).tclass('selected', e.type === 'mouseenter');
		});

		$(document).on('click', function() {
			is && self.visible(false);
		});

		$(window).on('resize', function() {
			self.resize();
		});
	};

	self.configure = function(name, value) {
		switch (name) {
			case 'height':
				value && scroller.css('max-height', value);
				break;
		}
	};

	function keydown(e) {
		var c = e.which;
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

		if (!datasource || !datasource.length)
			return;

		var current = self.find('.selected');
		if (c === 13) {
			self.visible(false);
			if (current.length) {
				if (onCallback) {
					var val = datasource[+current.attrd('index')];
					if (typeof(onCallback) === 'string')
						SET(onCallback, val.value === undefined ? val.name : val.value);
					else
						onCallback(val, old);
				}
				e.preventDefault();
				e.stopPropagation();
			}
			return;
		}

		e.preventDefault();
		e.stopPropagation();

		if (current.length) {
			current.rclass('selected');
			current = c === 40 ? current.next() : current.prev();
		}

		!current.length && (current = self.find('li:{0}-child'.format(c === 40 ? 'first' : 'last')));
		current.aclass('selected');
		var index = +current.attrd('index');
		var h = current.innerHeight();
		var offset = ((index + 1) * h) + (h * 2);
		scroller.prop('scrollTop', offset > config.height ? offset - config.height : 0);
	}

	function blur() {
		clearTimeout(blurtimeout);
		blurtimeout = setTimeout(function() {
			self.visible(false);
		}, 300);
	}

	self.visible = function(visible) {
		clearTimeout(blurtimeout);
		self.tclass('hidden', !visible);
		is = visible;
	};

	self.resize = function() {

		if (!offsetter || !old)
			return;

		var offset = offsetter.offset();
		offset.top += offsetter.height();
		offset.width = offsetter.width();

		if (margin.left)
			offset.left += margin.left;
		if (margin.top)
			offset.top += margin.top;
		if (margin.width)
			offset.width += margin.width;

		self.css(offset);
	};

	self.attach = function(input, search, callback, top, left, width) {
		self.attachelement(input, input, search, callback, top, left, width);
	};

	self.attachelement = function(element, input, search, callback, top, left, width) {

		if (typeof(callback) === 'number') {
			width = left;
			left = top;
			top = callback;
			callback = null;
		}

		clearTimeout(searchtimeout);

		if (input.setter)
			input = input.find('input');
		else
			input = $(input);

		if (input[0].tagName !== 'INPUT') {
			input = input.find('input');
		}

		if (element.setter) {
			if (!callback)
				callback = element.path;
			element = element.element;
		}

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

		offsetter = $(element);
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
			if (!obj.name)
				obj.name = obj.text;
			builder.push(self.template(obj));
		}

		container.empty().append(builder.join(''));
		self.visible(true);
	};
});

COMPONENT('calendar', 'today:Set today;firstday:0;close:Close;yearselect:true;monthselect:true;yearfrom:-70 years;yearto:5 years', function(self, config) {

	var skip = false;
	var skipDay = false;
	var visible = false;

	self.nocompile();
	self.days = EMPTYARRAY;
	self.months = EMPTYARRAY;
	self.months_short = EMPTYARRAY;
	self.years_from;
	self.years_to;

	self.configure = function(key, value) {
		switch (key) {
			case 'days':
				if (value instanceof Array)
					self.days = value;
				else
					self.days = value.split(',').trim();

				for (var i = 0; i < DAYS.length; i++) {
					DAYS[i] = self.days[i];
					self.days[i] = DAYS[i].substring(0, 2).toUpperCase();
				}

				break;

			case 'months':
				if (value instanceof Array)
					self.months = value;
				else
					self.months = value.split(',').trim();

				self.months_short = [];

				for (var i = 0, length = self.months.length; i < length; i++) {
					var m = self.months[i];
					MONTHS[i] = m;
					if (m.length > 4)
						m = m.substring(0, 3) + '.';
					self.months_short.push(m);
				}
				break;

			case 'yearfrom':
				if (value.indexOf('current') !== -1)
					self.years_from = parseInt(new Date().format('yyyy'));
				else
					self.years_from = parseInt(new Date().add(value).format('yyyy'));
				break;

			case 'yearto':
				if (value.indexOf('current') !== -1)
					self.years_to = parseInt(new Date().format('yyyy'));
				else
					self.years_to = parseInt(new Date().add(value).format('yyyy'));
				break;
		}
	};

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

	self.calculate = function(year, month, selected) {

		var d = new Date(year, month, 1);
		var output = { header: [], days: [], month: month, year: year };
		var firstDay = config.firstday;
		var firstCount = 0;
		var frm = d.getDay() - firstDay;
		var today = new Date();
		var ty = today.getFullYear();
		var tm = today.getMonth();
		var td = today.getDate();
		var sy = selected ? selected.getFullYear() : -1;
		var sm = selected ? selected.getMonth() : -1;
		var sd = selected ? selected.getDate() : -1;
		var days = getMonthDays(d);

		if (frm < 0)
			frm = 7 + frm;

		while (firstCount++ < 7) {
			output.header.push({ index: firstDay, name: self.days[firstDay] });
			firstDay++;
			if (firstDay > 6)
				firstDay = 0;
		}

		var index = 0;
		var indexEmpty = 0;
		var count = 0;
		var prev = getMonthDays(new Date(year, month - 1, 1)) - frm;
		var cur;

		for (var i = 0; i < days + frm; i++) {

			var obj = { isToday: false, isSelected: false, isEmpty: false, isFuture: false, number: 0, index: ++count };

			if (i >= frm) {
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
				cur = d.add('-' + indexEmpty + ' days');
			}

			if (!obj.isEmpty)
				cur = d.add(i + ' days');

			obj.month = cur.getMonth();
			obj.year = cur.getFullYear();
			obj.date = cur;
			output.days.push(obj);
		}

		indexEmpty = 0;

		for (var i = count; i < 42; i++) {
			var cur = d.add(i + ' days');
			var obj = { isToday: false, isSelected: false, isEmpty: true, isFuture: true, number: ++indexEmpty, index: ++count };
			obj.month = cur.getMonth();
			obj.year = cur.getFullYear();
			obj.date = cur;
			output.days.push(obj);
		}

		return output;
	};

	self.hide = function() {
		self.aclass('hidden');
		self.rclass('ui-calendar-visible');
		visible = false;
		return self;
	};

	self.toggle = function(el, value, callback, offset) {

		if (self.older === el[0]) {
			if (!self.hclass('hidden')) {
				self.hide();
				return;
			}
		}

		self.older = el[0];
		self.show(el, value, callback, offset);
		return self;
	};

	self.show = function(el, value, callback, offset) {

		setTimeout(function() {
			clearTimeout2('calendarhide');
		}, 5);

		if (!el)
			return self.hide();

		var off = el.offset();
		var h = el.innerHeight();

		self.css({ left: off.left + (offset || 0), top: off.top + h + 12 });
		self.rclass('hidden');
		self.click = callback;
		self.date(value);
		visible = true;
		self.aclass('ui-calendar-visible', 50);
		return self;
	};

	self.make = function() {

		self.aclass('ui-calendar hidden');

		var conf = {};

		if (!config.days) {
			conf.days = [];
			for (var i = 0; i < DAYS.length; i++)
				conf.days.push(DAYS[i].substring(0, 2).toUpperCase());
		}

		!config.months && (conf.months = MONTHS);
		self.reconfigure(conf);

		self.event('click', '.ui-calendar-today-a', function() {
			var dt = new Date();
			self.hide();
			self.click && self.click(dt);
		});

		self.event('click', '.ui-calendar-day', function() {
			var arr = this.getAttribute('data-date').split('-');
			var dt = new Date(parseInt(arr[0]), parseInt(arr[1]), parseInt(arr[2]));
			self.find('.ui-calendar-selected').rclass('ui-calendar-selected');
			var el = $(this).aclass('ui-calendar-selected');
			skip = !el.hclass('ui-calendar-disabled');
			self.hide();
			self.click && self.click(dt);
		});

		self.event('click', '.ui-calendar-header', function(e) {
			e.stopPropagation();
		});

		self.event('change', '.ui-calendar-year', function(e) {

			clearTimeout2('calendarhide');
			e.preventDefault();
			e.stopPropagation();

			var arr = this.getAttribute('data-date').split('-');
			var dt = new Date(parseInt(arr[0]), parseInt(arr[1]), 1);
			dt.setFullYear(this.value);
			skipDay = true;
			self.date(dt);
		});

		self.event('change', '.ui-calendar-month', function(e){

			clearTimeout2('calendarhide');
			e.preventDefault();
			e.stopPropagation();

			var arr = this.getAttribute('data-date').split('-');
			var dt = new Date(parseInt(arr[0]), parseInt(arr[1]), 1);
			dt.setMonth(this.value);
			skipDay = true;
			self.date(dt);
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

			var current_year = dt.getFullYear();
			if (current_year < self.years_from || current_year > self.years_to)
				return;

			skipDay = true;
			self.date(dt);
		});

		$(window).on('scroll click', function() {
			visible && setTimeout2('calendarhide', function() {
				EXEC('$calendar.hide');
			}, 20);
		});

		window.$calendar = self;

		self.on('reflow', function() {
			visible && EXEC('$calendar.hide');
		});
	};

	self.date = function(value) {

		var clssel = 'ui-calendar-selected';

		if (typeof(value) === 'string')
			value = value.parseDate();

		if (!value || isNaN(value.getTime())) {
			self.find('.' + clssel).rclass(clssel);
			value = DATETIME;
		}

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
			value = DATETIME = new Date();

		var output = self.calculate(value.getFullYear(), value.getMonth(), value);
		var builder = [];

		for (var i = 0; i < 42; i++) {

			var item = output.days[i];

			if (i % 7 === 0) {
				builder.length && builder.push('</tr>');
				builder.push('<tr>');
			}

			var cls = [];

			item.isEmpty && cls.push('ui-calendar-disabled');
			cls.push('ui-calendar-day');

			!empty && item.isSelected && cls.push(clssel);
			item.isToday && cls.push('ui-calendar-day-today');
			builder.push('<td class="{0}" data-date="{1}-{2}-{3}"><div>{3}</div></td>'.format(cls.join(' '), item.year, item.month, item.number));
		}

		builder.push('</tr>');

		var header = [];
		for (var i = 0; i < 7; i++)
			header.push('<th>{0}</th>'.format(output.header[i].name));

		var years = value.getFullYear();
		if (config.yearselect) {
			years = '';
			var current_year = value.getFullYear();
			for (var i = self.years_from; i <= self.years_to; i++)
				years += '<option value="{0}" {1}>{0}</option>'.format(i, i === current_year ? 'selected' : '');
			years = '<select data-date="{0}-{1}" class="ui-calendar-year">{2}</select>'.format(output.year, output.month, years);
		}

		var months = self.months[value.getMonth()];
		if (config.monthselect) {
			months = '';
			var current_month = value.getMonth();
			for (var i = 0, l = self.months.length; i < l; i++)
				months += '<option value="{0}" {2}>{1}</option>'.format(i, self.months[i], i === current_month ? 'selected' : '');
			months = '<select data-date="{0}-{1}" class="ui-calendar-month">{2}</select>'.format(output.year, output.month, months);
		}

		self.html('<div class="ui-calendar-header"><button class="ui-calendar-header-prev" name="prev" data-date="{0}-{1}"><span class="fa fa-arrow-left"></span></button><div class="ui-calendar-header-info">{2} {3}</div><button class="ui-calendar-header-next" name="next" data-date="{0}-{1}"><span class="fa fa-arrow-right"></span></button></div><div class="ui-calendar-table"><table cellpadding="0" cellspacing="0" border="0"><thead>{4}</thead><tbody>{5}</tbody></table></div>'.format(output.year, output.month, months, years, header.join(''), builder.join('')) + (config.today ? '<div class="ui-calendar-today"><a href="javascript:void(0)">{0}</a><a href="javascript:void(0)" class="ui-calendar-today-a"><i class="fa fa-calendar"></i>{1}</a></div>'.format(config.close, config.today) : ''));
	};
});

COMPONENT('keyvalue', 'maxlength:100', function(self, config) {

	var container, content = null;
	var cempty = 'empty';
	var skip = false;
	var empty = {};

	self.nocompile();
	self.template = Tangular.compile('<div class="ui-keyvalue-item"><div class="ui-keyvalue-item-remove"><i class="fa fa-times"></i></div><div class="ui-keyvalue-item-key"><input type="text" name="key" maxlength="{{ max }}"{{ if disabled }} disabled="disabled"{{ fi }} placeholder="{{ placeholder_key }}" value="{{ key }}" /></div><div class="ui-keyvalue-item-value"><input type="text" maxlength="{{ max }}" placeholder="{{ placeholder_value }}" value="{{ value }}" /></div></div>');

	self.binder = function(type, value) {
		return value;
	};

	self.configure = function(key, value, init, prev) {
		if (init)
			return;

		var redraw = false;

		switch (key) {
			case 'disabled':
				self.tclass('ui-disabled', value);
				self.find('input').prop('disabled', value);
				empty.disabled = value;
				break;
			case 'maxlength':
				self.find('input').prop('maxlength', value);
				break;
			case 'placeholderkey':
				self.find('input[name="key"]').prop('placeholder', value);
				break;
			case 'placeholdervalue':
				self.find('input[name="value"]').prop('placeholder', value);
				break;
			case 'icon':
				if (value && prev)
					self.find('i').rclass('fa').aclass('fa fa-' + value);
				else
					redraw = true;
				break;

			case 'label':
				redraw = true;
				break;
		}

		if (redraw) {
			self.redraw();
			self.refresh();
		}
	};

	self.redraw = function() {

		var icon = config.icon;
		var label = config.label || content;

		if (icon)
			icon = '<i class="fa fa-{0}"></i>'.format(icon);

		empty.value = '';

		self.html((label ? '<div class="ui-keyvalue-label">{1}{0}:</div>'.format(label, icon) : '') + '<div class="ui-keyvalue-items"></div>' + self.template(empty).replace('-item"', '-item ui-keyvalue-base"'));
		container = self.find('.ui-keyvalue-items');
	};

	self.make = function() {

		empty.max = config.maxlength;
		empty.placeholder_key = config.placeholderkey;
		empty.placeholder_value = config.placeholdervalue;
		empty.value = '';
		empty.disabled = config.disabled;

		content = self.html();

		self.aclass('ui-keyvalue');
		self.disabled && self.aclass('ui-disabled');
		self.redraw();

		self.event('click', '.fa-times', function() {

			if (config.disabled)
				return;

			var el = $(this);
			var parent = el.closest('.ui-keyvalue-item');
			var inputs = parent.find('input');
			var obj = self.get();
			!obj && (obj = {});
			var key = inputs[0].value;
			parent.remove();
			delete obj[key];

			self.set(obj, 2);
			self.change(true);
		});

		self.event('change keypress', 'input', function(e) {

			if (config.disabled || (e.type !== 'change' && e.which !== 13))
				return;

			var el = $(this);
			var inputs = el.closest('.ui-keyvalue-item').find('input');
			var key = self.binder('key', inputs[0].value);
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
			self.set(keyvalue, 2);
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
			self.aclass(cempty);
			return;
		}

		var builder = [];

		Object.keys(value).forEach(function(key) {
			empty.key = key;
			empty.value = value[key];
			builder.push(self.template(empty));
		});

		self.tclass(cempty, builder.length === 0);
		container.empty().append(builder.join(''));
	};
});

COMPONENT('codemirror', 'linenumbers:false;required:false;trim:false;tabs:false', function(self, config) {

	var editor = null;

	self.getter = null;
	self.bindvisible();
	self.nocompile();

	self.reload = function() {
		editor.refresh();
	};

	self.validate = function(value) {
		return (config.disabled || !config.required ? true : value && value.length > 0) === true;
	};

	self.insert = function(value) {
		editor.replaceSelection(value);
		self.change(true);
	};

	self.configure = function(key, value, init) {
		if (init)
			return;

		switch (key) {
			case 'disabled':
				self.tclass('ui-disabled', value);
				editor.readOnly = value;
				editor.refresh();
				break;
			case 'required':
				self.find('.ui-codemirror-label').tclass('ui-codemirror-label-required', value);
				self.state(1, 1);
				break;
			case 'icon':
				self.find('i').rclass().aclass('fa fa-' + value);
				break;
		}

	};

	self.make = function() {
		var content = config.label || self.html();
		self.html((content ? '<div class="ui-codemirror-label' + (config.required ? ' ui-codemirror-label-required' : '') + '">' + (config.icon ? '<i class="fa fa-' + config.icon + '"></i> ' : '') + content + ':</div>' : '') + '<div class="ui-codemirror"></div>');
		var container = self.find('.ui-codemirror');

		var options = {};
		options.lineNumbers = config.linenumbers;
		options.mode = config.type || 'htmlmixed';
		options.indentUnit = 4;

		if (config.tabs)
			options.indentWithTabs = true;

		if (config.type === 'markdown') {
			options.styleActiveLine = true;
			options.lineWrapping = true;
			options.matchBrackets = true;
		}

		editor = CodeMirror(container[0], options);
		self.editor = editor;

		if (config.height !== 'auto') {
			var is = typeof(config.height) === 'number';
			editor.setSize('100%', is ? (config.height + 'px') : (config.height || '200px'));
			!is && self.css('height', config.height);
		}

		if (config.disabled) {
			self.aclass('ui-disabled');
			editor.readOnly = true;
			editor.refresh();
		}

		var can = {};
		can['+input'] = can['+delete'] = can.undo = can.redo = can.paste = can.cut = can.clear = true;

		editor.on('change', function(a, b) {

			if (config.disabled || !can[b.origin])
				return;

			setTimeout2(self.id, function() {
				var val = editor.getValue();

				if (config.trim) {
					var lines = val.split('\n');
					for (var i = 0, length = lines.length; i < length; i++)
						lines[i] = lines[i].replace(/\s+$/, '');
					val = lines.join('\n').trim();
				}

				self.getter2 && self.getter2(val);
				self.change(true);
				self.rewrite(val);
				config.required && self.validate2();
			}, 200);

		});
	};

	self.setter = function(value) {

		editor.setValue(value || '');
		editor.refresh();

		setTimeout(function() {
			editor.refresh();
			editor.scrollTo(0, 0);
			editor.setCursor(0);
		}, 200);

		setTimeout(function() {
			editor.refresh();
		}, 1000);

		setTimeout(function() {
			editor.refresh();
		}, 2000);
	};

	self.state = function(type) {
		if (!type)
			return;
		var invalid = config.required ? self.isInvalid() : false;
		if (invalid === self.$oldstate)
			return;
		self.$oldstate = invalid;
		self.find('.ui-codemirror').tclass('ui-codemirror-invalid', invalid);
	};
}, ['//cdnjs.cloudflare.com/ajax/libs/codemirror/5.32.0/codemirror.min.css', '//cdnjs.cloudflare.com/ajax/libs/codemirror/5.32.0/codemirror.min.js', '//cdnjs.cloudflare.com/ajax/libs/codemirror/5.32.0/mode/javascript/javascript.min.js', '//cdnjs.cloudflare.com/ajax/libs/codemirror/5.32.0/mode/htmlmixed/htmlmixed.min.js', '//cdnjs.cloudflare.com/ajax/libs/codemirror/5.32.0/mode/xml/xml.min.js', '//cdnjs.cloudflare.com/ajax/libs/codemirror/5.32.0/mode/css/css.min.js', '//cdnjs.cloudflare.com/ajax/libs/codemirror/5.32.0/mode/markdown/markdown.min.js']);

COMPONENT('contextmenu', function(self) {

	var is = false;
	var timeout;
	var container;
	var arrow;

	self.template = Tangular.compile('<div data-value="{{ value }}" class="item{{ if selected }} selected{{ fi }}"><i class="fa {{ icon }}"></i><span>{{ name | raw }}</span></div>');
	self.singleton();
	self.readonly();
	self.nocompile();
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
			SETTER('contextmenu', 'hide');
		});
	};

	self.show = function(orientation, target, items, callback, offsetX, offsetY) {

		if (is) {
			clearTimeout(timeout);
			var obj = target instanceof jQuery ? target[0] : target;
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

		self.target = target[0];
		var offset = target.offset();
		container.html(builder);
		switch (orientation) {
			case 'left':
				arrow.css({ left: '15px' });
				break;
			case 'right':
				arrow.css({ left: '170px' });
				break;
			case 'center':
				arrow.css({ left: '90px' });
				break;
		}

		var options = { left: orientation === 'center' ? (Math.ceil((offset.left - self.element.width() / 2) + (target.innerWidth() / 2)) + (offsetX || 0)) : orientation === 'left' ? (offset.left - 8 + (offsetX || 0)) : ((offset.left - self.element.width()) + 5 + target.innerWidth() + (offsetX || 0)), top: offset.top + target.innerHeight() + 10 + (offsetY || 0) };
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
			self.element.hide().rclass('ui-contextmenu-visible');
			self.emit('contextmenu', false, self, self.target);
			self.callback = null;
			self.target = null;
			is = false;
		}, sleep ? sleep : 100);
	};

	self.hideforce = function() {
		self.element.hide().rclass('ui-contextmenu-visible');
		self.emit('contextmenu', false, self, self.target);
		self.callback = null;
		self.target = null;
		is = false;
	};
});

COMPONENT('message', function(self, config) {

	var is, visible = false;
	var timer = null;

	self.readonly();
	self.singleton();
	self.nocompile();

	self.make = function() {
		self.aclass('ui-message hidden');

		self.event('click', 'button', function() {
			self.hide();
		});

		$(window).on('keyup', function(e) {
			visible && e.which === 27 && self.hide();
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
		self.rclass('ui-message-visible');
		timer && clearTimeout(timer);
		timer = setTimeout(function() {
			visible = false;
			self.aclass('hidden');
		}, 1000);
	};

	self.content = function(cls, text) {
		!is && self.html('<div><div class="ui-message-body"><div class="text"></div><hr /><button>' + (config.button || 'Close') + '</button></div></div>');
		timer && clearTimeout(timer);
		visible = true;
		is = true;
		self.find('.ui-message-body').rclass().aclass('ui-message-body ' + cls);
		self.find('.text').html(text);
		self.rclass('hidden');
		setTimeout(function() {
			self.aclass('ui-message-visible');
		}, 5);
	};
});

COMPONENT('disable', function(self, config) {

	var validate = null;
	self.readonly();

	self.configure = function(key, value) {
		if (key === 'validate')
			validate = value.split(',').trim();
	};

	self.setter = function(value) {
		var is = true;

		if (config.if)
			is = EVALUATE(self.path, config.if);
		else
			is = !value;

		self.find(config.selector || '[data-jc]').each(function() {
			var com = $(this).component();
			com && com.reconfigure('disabled:' + is);
		});

		validate && validate.forEach(FN('n => RESET({0}n)'.format(self.pathscope ? '\'' + self.pathscope + '.\'+' : '')));
	};

	self.state = function() {
		self.update();
	};
});

COMPONENT('textarea', function(self, config) {

	var input, container, content = null;

	self.nocompile();

	self.validate = function(value) {
		if (config.disabled || !config.required)
			return true;
		if (value == null)
			value = '';
		else
			value = value.toString();
		return value.length > 0;
	};

	self.configure = function(key, value, init) {
		if (init)
			return;

		var redraw = false;

		switch (key) {
			case 'disabled':
				self.tclass('ui-disabled', value);
				self.find('input').prop('disabled', value);
				break;
			case 'required':
				self.noValid(!value);
				!value && self.state(1, 1);
				self.find('.ui-textarea-label').tclass('ui-textarea-label-required', value);
				break;
			case 'placeholder':
				input.prop('placeholder', value || '');
				break;
			case 'maxlength':
				input.prop('maxlength', value || 1000);
				break;
			case 'label':
				redraw = true;
				break;
			case 'autofocus':
				input.focus();
				break;
			case 'monospace':
				self.tclass('ui-textarea-monospace', value);
				break;
			case 'icon':
				redraw = true;
				break;
			case 'format':
				self.format = value;
				self.refresh();
				break;
		}

		redraw && setTimeout2('redraw' + self.id, function() {
			self.redraw();
			self.refresh();
		}, 100);
	};

	self.redraw = function() {

		var attrs = [];
		var builder = [];

		self.tclass('ui-disabled', config.disabled === true);
		self.tclass('ui-textarea-monospace', config.monospace === true);

		config.placeholder && attrs.attr('placeholder', config.placeholder);
		config.maxlength && attrs.attr('maxlength', config.maxlength);
		config.error && attrs.attr('error');
		attrs.attr('data-jc-bind', '');
		config.height && attrs.attr('style', 'height:{0}px'.format(config.height));
		config.autofocus === 'true' && attrs.attr('autofocus');
		config.disabled && attrs.attr('disabled');
		builder.push('<textarea {0}></textarea>'.format(attrs.join(' ')));

		var label = config.label || content;

		if (!label.length) {
			config.error && builder.push('<div class="ui-textarea-helper"><i class="fa fa-warning" aria-hidden="true"></i> {0}</div>'.format(config.error));
			self.aclass('ui-textarea ui-textarea-container');
			self.html(builder.join(''));
			input = self.find('textarea');
			container = self.element;
			return;
		}

		var html = builder.join('');

		builder = [];
		builder.push('<div class="ui-textarea-label{0}">'.format(config.required ? ' ui-textarea-label-required' : ''));
		config.icon && builder.push('<i class="fa fa-{0}"></i>'.format(config.icon));
		builder.push(label);
		builder.push(':</div><div class="ui-textarea">{0}</div>'.format(html));
		config.error && builder.push('<div class="ui-textarea-helper"><i class="fa fa-warning" aria-hidden="true"></i> {0}</div>'.format(config.error));

		self.html(builder.join(''));
		self.rclass('ui-textarea');
		self.aclass('ui-textarea-container');
		input = self.find('textarea');
		container = self.find('.ui-textarea');
	};

	self.make = function() {
		content = self.html();
		self.type = config.type;
		self.format = config.format;
		self.redraw();
	};

	self.state = function(type) {
		if (!type)
			return;
		var invalid = config.required ? self.isInvalid() : false;
		if (invalid === self.$oldstate)
			return;
		self.$oldstate = invalid;
		container.tclass('ui-textarea-invalid', invalid);
		config.error && self.find('.ui-textarea-helper').tclass('ui-textarea-helper-show', invalid);
	};
});

COMPONENT('filereader', function(self, config) {
	self.readonly();
	self.nocompile();
	self.make = function() {

		var element = self.element;
		var content = self.html();
		var html = '<span class="fa fa-folder"></span><input type="file"' + (config.accept ? ' accept="' + config.accept + '"' : '') + ' class="ui-filereader-input" /><input type="text" placeholder="' + (config.placeholder || '') + '" readonly="readonly" />';

		if (content.length) {
			self.html('<div class="ui-filereader-label' + (config.required ? ' ui-filereader-label-required' : '') + '">' + (config.icon ? '<span class="fa fa-' + config.icon + '"></span> ' : '') + content + ':</div><div class="ui-filereader">' + html + '</div>');
		} else {
			self.aclass('ui-filereader');
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

COMPONENT('nosqlcounter', 'count:0;height:80', function(self, config) {

	var months = MONTHS;
	var container, labels;

	self.nocompile();
	self.bindvisible();
	self.readonly();

	self.make = function() {
		self.aclass('ui-nosqlcounter');
		self.append('<div class="ui-nosqlcounter-table"{0}><div class="ui-nosqlcounter-cell"></div></div><div class="ui-nosqlcounter-labels"></div>'.format(config.height ? ' style="height:{0}px"'.format(config.height) : ''));
		container = self.find('.ui-nosqlcounter-cell');
		labels = self.find('.ui-nosqlcounter-labels');
	};

	self.configure = function(key, value) {
		switch (key) {
			case 'months':
				if (value instanceof Array)
					months = value;
				else
					months = value.split(',').trim();
				break;
		}
	};

	self.redraw = function(maxbars) {

		var value = self.get();
		if (!value)
			value = [];

		var dt = new Date();
		var current = dt.format('yyyyMM');
		var stats = null;

		if (config.lastvalues) {
			var max = value.length - maxbars;
			if (max < 0)
				max = 0;
			stats = value.slice(max, value.length);
		} else {
			stats = [];
			for (var i = 0; i < maxbars; i++) {
				var id = dt.format('yyyyMM');
				var item = value.findItem('id', id);
				stats.push(item ? item : { id: id, month: dt.getMonth() + 1, year: dt.getFullYear(), value: 0 });
				dt = dt.add('-1 month');
			}
			stats.reverse();
		}

		var max = stats.scalar('max', 'value');
		var bar = 100 / maxbars;
		var builder = [];
		var dates = [];
		var cls = '';
		var min = ((20 / config.height) * 100) >> 0;
		var sum = '';

		for (var i = 0, length = stats.length; i < length; i++) {
			var item = stats[i];
			var val = item.value;

			if (val > 999)
				val = (val / 1000).format(1, 2) + 'K';

			sum += val + ',';

			var h = max === 0 ? 0 : ((item.value / max) * (100 - min));
			h += min;

			cls = item.value ? '' : 'empty';

			if (item.id === current)
				cls += (cls ? ' ' : '') + 'current';

			if (i === maxbars - 1)
				cls += (cls ? ' ' : '') + 'last';

			var w = bar.format(2, '');

			builder.push('<div style="width:{0}%" title="{3}" class="{4}"><div style="height:{1}%"><span>{2}</span></div></div>'.format(w, h.format(0, ''), val, months[item.month - 1] + ' ' + item.year, cls));
			dates.push('<div style="width:{0}%">{1}</div>'.format(w, months[item.month - 1].substring(0, 3)));
		}

		if (self.old !== sum) {
			self.old = sum;
			labels.html(dates.join(''));
			container.html(builder.join(''));
		}
	};

	self.setter = function(value) {
		if (config.count === 0) {
			self.width(function(width) {
				self.redraw(width / 30 >> 0);
			});
		} else
			self.redraw(WIDTH() === 'xs' ? config.count / 2 : config.count, value);
	};
});

COMPONENT('fileupload', function(self, config) {

	var id = 'fileupload' + self.id;
	var input = null;

	self.nocompile();
	self.readonly();
	self.configure = function(key, value, init) {
		if (init)
			return;
		switch (key) {
			case 'disabled':
				self.tclass('ui-disabled', value);
				break;
			case 'accept':
				var el = $('#' + id);
				if (value)
					el.prop('accept', value);
				else
					el.removeProp('accept');
				break;
			case 'multiple':
				var el = $('#' + id);
				if (value)
					el.prop('multiple', true);
				else
					el.removeProp('multiple');
				break;
			case 'label':
				self.html(value);
				break;
		}
	};

	self.make = function() {

		config.disabled && self.aclass('ui-disabled');
		$(document.body).append('<input type="file" id="{0}" class="hidden"{1}{2} />'.format(id, config.accept ? ' accept="{0}"'.format(config.accept) : '', config.multiple ? ' multiple="multiple"' : ''));
		input = $('#' + id);

		self.event('click', function() {
			!config.disabled && input.click();
		});

		input.on('change', function(evt) {

			if (config.disabled)
				return;

			var files = evt.target.files;
			var data = new FormData();
			var el = this;

			for (var i = 0, length = files.length; i < length; i++)
				data.append('file' + i, files[i]);

			SETTER('loading', 'show');
			UPLOAD(config.url, data, function(response, err) {

				el.value = '';
				SETTER('loading', 'hide', 500);

				if (err) {
					SETTER('message', 'warning', err.toString());
					return;
				}

				self.change();

				if (config.array)
					self.push(response);
				else
					self.set(response);
			});
		});
	};

	self.destroy = function() {
		input.off().remove();
	};
});

COMPONENT('range', function(self, config) {

	var content = '';

	self.nocompile();

	self.validate = function(value) {
		return !config.required || config.disabled ? true : value != 0;
	};

	self.configure = function(key, value, init, prev) {
		if (init)
			return;
		var redraw = false;
		switch (key) {
			case 'step':
			case 'max':
			case 'min':
				var input = self.find('input');
				if (value)
					input.prop(key, value);
				else
					input.removeProp(key);
				break;

			case 'icon':
				if (value && prev)
					self.find('i').rclass().aclass('fa fa-' + value);
				else
					redraw = true;
				break;

			case 'required':
				self.find('.ui-range-label').tclass('ui-range-label-required', value);
				break;

			case 'type':
				self.type = value;
				break;

			case 'label':
				redraw = true;
				break;
		}

		if (redraw) {
			self.redraw();
			self.refresh();
		}
	};

	self.redraw = function() {

		var label = config.label || content;
		var html = '';

		if (label)
			html = '<div class="ui-range-label{1}">{2}{0}:</div>'.format(label, config.required ? ' ui-range-label-required' : '', (config.icon ? '<i class="fa fa-{0}"></i>'.format(config.icon) : ''));

		var attrs = [];
		config.step && attrs.attr('step', config.step);
		config.max && attrs.attr('max', config.max);
		config.min && attrs.attr('min', config.min);
		self.html('{0}<input type="range" data-jc-bind=""{1} />'.format(html, attrs.length ? ' ' + attrs.join(' ') : ''));
	};

	self.make = function() {
		self.type = config.type;
		content = self.html();
		self.aclass('ui-range');
		self.redraw();
	};
});

COMPONENT('audio', function(self) {

	var can = false;
	var volume = 0.5;

	self.items = [];
	self.readonly();
	self.singleton();
	self.nocompile();

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

COMPONENT('controls', function(self) {

	var is = false;
	var timeout;
	var container;

	self.template = Tangular.compile('<div data-value="{{ index }}" class="item{{ if selected }} selected{{ fi }}{{ if disabled }} disabled{{ fi }}"><i class="fa {{ icon }}"></i><span>{{ name | raw }}</span></div>');
	self.singleton();
	self.readonly();
	self.nocompile();
	self.callback = null;

	self.make = function() {

		self.classes('ui-controls');
		self.append('<div class="ui-controls-items"></div>');
		container = self.find('.ui-controls-items');

		self.event('touchstart mousedown', 'div[data-value]', function(e) {
			var el = $(this);
			!el.hclass('disabled') && self.callback && self.callback(self.items[+el.attr('data-value')], $(self.target));
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
			var obj = target instanceof jQuery ? target[0] : target;
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

		self.target = target[0];
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
			self.element.hide().rclass('ui-controls-visible');
			self.emit('controls', false, self, self.target);
			self.callback = null;
			self.target = null;
			is = false;
		}, sleep ? sleep : 100);
	};
});

COMPONENT('multioptions', 'rebind:true', function(self, config) {

	var Tinput = Tangular.compile('<input class="ui-moi-save ui-moi-value-inputtext" data-name="{{ name }}" type="text" value="{{ value }}"{{ if def }} placeholder="{{ def }}"{{ fi }}{{ if max }} maxlength="{{ max }}"{{ fi }} data-type="text" />');
	var Tselect = Tangular.compile('<div class="ui-moi-value-select"><i class="fa fa-chevron-down"></i><select data-name="{{ name }}" class="ui-moi-save ui-multioptions-select">{{ foreach m in values }}<option value="{{ $index }}"{{ if value === m.value }} selected="selected"{{ fi }}>{{ m.text }}</option>{{ end }}</select></div>');
	var Tnumber = Tangular.compile('<div class="ui-moi-value-inputnumber-buttons"><span class="multioptions-operation" data-type="number" data-step="{{ step }}" data-name="plus" data-max="{{ max }}" data-min="{{ min }}"><i class="fa fa-plus"></i></span><span class="multioptions-operation" data-type="number" data-name="minus" data-step="{{ step }}" data-max="{{ max }}" data-min="{{ min }}"><i class="fa fa-minus"></i></span></div><div class="ui-moi-value-inputnumber"><input data-name="{{ name }}" class="ui-moi-save ui-moi-value-numbertext" type="text" value="{{ value }}"{{ if def }} placeholder="{{ def }}"{{ fi }} data-max="{{ max }}" data-min="{{ max }}" data-type="number" /></div>');
	var Tboolean = Tangular.compile('<div data-name="{{ name }}" data-type="boolean" class="ui-moi-save multioptions-operation ui-moi-value-boolean{{ if value }} checked{{ fi }}"><i class="fa fa-check"></i></div>');
	var Tdate = Tangular.compile('<div class="ui-moi-value-inputdate-buttons"><span class="multioptions-operation" data-type="date" data-name="date"><i class="fa fa-calendar"></i></span></div><div class="ui-moi-value-inputdate"><input class="ui-moi-save ui-moi-date" data-name="{{ name }}" type="text" value="{{ value | format(\'yyyy-MM-dd\') }}" placeholder="dd.mm.yyyy" maxlength="10" data-type="date" /></div>');
	var Tcolor = null;
	var skip = false;
	var mapping = null;
	var dep = {};
	var pending = 0;

	self.getter = null;
	self.novalidate();
	self.nocompile();

	self.init = function() {
		window.Tmultioptionscolor = Tangular.compile('<div class="ui-moi-value-colors ui-moi-save" data-name="{{ name }}" data-value="{{ value }}">{0}</div>'.format(['#ED5565', '#DA4453', '#FC6E51', '#E9573F', '#FFCE54', '#F6BB42', '#A0D468', '#8CC152', '#48CFAD', '#37BC9B', '#4FC1E9', '#3BAFDA', '#5D9CEC', '#4A89DC', '#AC92EC', '#967ADC', '#EC87C0', '#D770AD', '#F5F7FA', '#E6E9ED', '#CCD1D9', '#AAB2BD', '#656D78', '#434A54', '#000000'].map(function(n) { return '<span data-value="{0}" data-type="color" class="multioptions-operation" style="background-color:{0}"><i class="fa fa-check-circle"></i></span>'.format(n); }).join('')));
	};

	self.form = function() {};

	self.dependencies = function() {
		return dep;
	};

	self.make = function() {

		Tcolor = window.Tmultioptionscolor;
		self.aclass('ui-multioptions');

		var el = self.find('script');

		if (el.length) {
			self.remap(el.html());
			el.remove();
		}

		self.event('click', '.multioptions-operation', function(e) {
			var el = $(this);
			var name = el.attrd('name');
			var type = el.attrd('type');

			e.stopPropagation();

			if (type === 'date') {
				el = el.parent().parent().find('input');
				FIND('calendar').show(el, el.val().parseDate(), function(date) {
					el.val(date.format('yyyy-MM-dd'));
					self.$save();
				});
			} else if (type === 'color') {
				el.parent().find('.selected').rclass('selected');
				el.aclass('selected');
				self.$save();
			} else if (type === 'boolean') {
				el.tclass('checked');
				self.$save();
			} else if (type === 'number') {
				var input = el.parent().parent().find('input');
				var step = (el.attrd('step') || '0').parseInt();
				var min = el.attrd('min');
				var max = el.attrd('max');

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
			} else
				self.form(type, el.parent().parent().find('input'), name);
		});

		self.event('change', 'select', self.$save);
		self.event('input', 'input', self.$save);

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

	self.redraw = function() {
		if (pending) {
			setTimeout(self.redraw, 500);
		} else {
			self.refresh();
			self.change(false);
			config.rebind && self.$save();
		}
	};

	self.remap = function(js) {
		var fn = new Function('option', js);
		mapping = {};
		dep = {};
		pending = 0;
		fn(self.mapping);
		self.redraw();
	};

	self.remap2 = function(callback) {
		mapping = {};
		dep = {};
		pending = 0;
		callback(self.mapping);
		self.redraw();
	};

	self.mapping = function(key, label, def, type, max, min, step, validator) {

		var T = typeof(type);
		var values, url;

		if (T === 'number') {
			validator = step;
			step = min;
			min = max;
			max = type;
			type = 'number';
		} else if (T === 'string') {
			var tmp = type.substring(0, 6);
			url = type.substring(0, 1) === '/' || tmp === 'http:/' || tmp === 'https:' ? type : '';
			if (url)
				type = 'array';
		} if (!type)
			type = def instanceof Date ? 'date' : typeof(def);

		if (type instanceof Array) {
			values = [];
			for (var i = 0; i < type.length; i++) {
				var val = type[i];
				values.push({ text: val.text == null ? val : val.text, value: val.value == null ? val : val.value });
			}
			type = 'array';
		}

		if (validator && typeof(validator) !== 'function')
			validator = null;

		var bindmapping = function(values) {
			dep[key] = values;
			mapping[key] = { name: key, label: label, type: url ? 'array' : type.toLowerCase(), def: def, max: max, min: min, step: step, value: def, values: values, validator: validator };
		};

		if (url) {
			pending++;
			AJAX('GET ' + url, function(values) {
				pending--;
				bindmapping(values);
			});
		} else
			bindmapping(values);
	};

	self.$save = function() {
		setTimeout2('multioptions.' + self._id, self.save, 150);
	};

	self.save = function() {
		var obj = self.get();
		var values = self.find('.ui-moi-save');

		Object.keys(mapping).forEach(function(key) {

			var opt = mapping[key];
			var el = values.filter('[data-name="{0}"]'.format(opt.name));

			if (el.hclass('ui-moi-value-colors')) {
				obj[key] = el.find('.selected').attrd('value');
				return;
			}

			if (el.hclass('ui-moi-value-boolean')) {
				obj[key] = el.hclass('checked');
				return;
			}

			if (el.hclass('ui-moi-date')) {
				obj[key] = el.val().parseDate();
				return;
			}

			if (el.hclass('ui-moi-value-inputtext')) {
				obj[key] = el.val();
				return;
			}

			if (el.hclass('ui-moi-value-numbertext')) {

				obj[key] = el.val().parseInt();

				if (opt.max !== null && obj[key] > opt.max) {
					obj[key] = opt.max;
					el.val(opt.max);
				}

				if (opt.min !== null && obj[key] < opt.min) {
					obj[key] = opt.min;
					el.val(opt.min);
				}

				return;
			}

			if (el.hclass('ui-multioptions-select')) {
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
		self.change(true);
	};

	self.setter = function(options) {

		if (!options || skip || !mapping) {
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

			option.value = options[key] == null ? option.def : options[key];

			var value = '';

			switch (option.type.toLowerCase()) {
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

		self.empty().html(builder);

		self.find('.ui-moi-value-colors').each(function() {
			var el = $(this);
			var value = el.attrd('value');
			el.find('[data-value="{0}"]'.format(value)).aclass('selected');
		});
	};
});

COMPONENT('dragdropfiles', function(self, config) {

	self.readonly();

	self.mirror = function(cls) {
		var arr = cls.split(' ');
		for (var i = 0, length = arr.length; i < length; i++) {
			arr[i] = arr[i].replace(/^(\+|-)/g, function(c) {
				return c === '+' ? '-' : '+';
			});
		}
		return arr.join(' ');
	};

	self.make = function() {
		var has = false;

		self.event('dragenter dragover dragexit drop dragleave', function (e) {

			e.stopPropagation();
			e.preventDefault();

			switch (e.type) {
				case 'drop':
					config.class && has && self.classes(self.mirror(config.class));
					break;
				case 'dragenter':
				case 'dragover':
					config.class && !has && self.classes(config.class);
					has = true;
					return;
				case 'dragleave':
				case 'dragexit':
				default:
					setTimeout2(self.id, function() {
						config.class && has && self.classes(self.mirror(config.class));
						has = false;
					}, 100);
					return;
			}

			EXEC(config.files, e.originalEvent.dataTransfer.files, e);
		});
	};
});

COMPONENT('snackbar', 'timeout:3000;button:Dismiss', function(self, config) {

	var show = true;
	var callback;

	self.nocompile();
	self.readonly();
	self.blind();
	self.make = function() {
		self.aclass('ui-snackbar hidden');
		self.append('<div><a href="javasc' + 'ript:void(0)" class="ui-snackbar-dismiss"></a><div class="ui-snackbar-body"></div></div>');
		self.event('click', '.ui-snackbar-dismiss', function() {
			self.hide();
			callback && callback();
		});
	};

	self.hide = function() {
		self.rclass('ui-snackbar-visible');
		setTimeout(function() {
			self.aclass('hidden');
		}, 1000);
		show = true;
	};

	self.success = function(message, button, close) {
		self.show('<i class="fa fa-check-circle ui-snackbar-icon"></i>' + message, button, close);
	};

	self.warning = function(message, button, close) {
		self.show('<i class="fa fa-times-circle ui-snackbar-icon"></i>' + message, button, close);
	};

	self.show = function(message, button, close) {

		if (typeof(button) === 'function') {
			close = button;
			button = null;
		}

		callback = close;

		self.find('.ui-snackbar-body').html(message);
		self.find('.ui-snackbar-dismiss').html(button || config.button);

		if (show) {
			self.rclass('hidden');
			setTimeout(function() {
				self.aclass('ui-snackbar-visible');
			}, 50);
		}

		setTimeout2(self.ID, self.hide, config.timeout + 50);
		show = false;
	};
});

COMPONENT('shortcuts', function(self) {

	var items = [];
	var length = 0;

	self.singleton();
	self.readonly();
	self.blind();
	self.nocompile();

	self.make = function() {
		$(window).on('keydown', function(e) {
			if (length && !e.isPropagationStopped()) {
				for (var i = 0; i < length; i++) {
					var o = items[i];
					if (o.fn(e)) {
						if (o.prevent) {
							e.preventDefault();
							e.stopPropagation();
						}
						setTimeout(function(o, e) {
							o.callback(e);
						}, 100, o, e);
					}
				}
			}
		});
	};

	self.exec = function(shortcut) {
		var item = items.findItem('shortcut', shortcut.toLowerCase().replace(/\s/g, ''));
		item && item.callback(EMPTYOBJECT);
	};

	self.register = function(shortcut, callback, prevent) {
		shortcut.split(',').trim().forEach(function(shortcut) {
			var builder = [];
			var alias = [];
			shortcut.split('+').trim().forEach(function(item) {
				var lower = item.toLowerCase();
				alias.push(lower);
				switch (lower) {
					case 'ctrl':
					case 'alt':
					case 'shift':
						builder.push('e.{0}Key'.format(lower));
						return;
					case 'win':
					case 'meta':
					case 'cmd':
						builder.push('e.metaKey');
						return;
					case 'space':
						builder.push('e.keyCode===32');
						return;
					case 'tab':
						builder.push('e.keyCode===9');
						return;
					case 'esc':
						builder.push('e.keyCode===27');
						return;
					case 'enter':
						builder.push('e.keyCode===13');
						return;
					case 'backspace':
					case 'del':
					case 'delete':
						builder.push('(e.keyCode===8||e.keyCode===127)');
						return;
					case 'up':
						builder.push('e.keyCode===38');
						return;
					case 'down':
						builder.push('e.keyCode===40');
						return;
					case 'right':
						builder.push('e.keyCode===39');
						return;
					case 'left':
						builder.push('e.keyCode===37');
						return;
					case 'f1':
					case 'f2':
					case 'f3':
					case 'f4':
					case 'f5':
					case 'f6':
					case 'f7':
					case 'f8':
					case 'f9':
					case 'f10':
					case 'f11':
					case 'f12':
						var a = item.toUpperCase();
						builder.push('e.key===\'{0}\''.format(a));
						return;
					case 'capslock':
						builder.push('e.which===20');
						return;
				}

				var num = item.parseInt();
				if (num)
					builder.push('e.which===' + num);
				else
					builder.push('e.key===\'{0}\''.format(item));

			});

			items.push({ shortcut: alias.join('+'), fn: new Function('e', 'return ' + builder.join('&&')), callback: callback, prevent: prevent });
			length = items.length;
		});
		return self;
	};
});

COMPONENT('radiobutton', function(self, config) {

	self.nocompile();

	self.configure = function(key, value, init) {
		if (init)
			return;
		switch (key) {
			case 'disabled':
				self.tclass('ui-disabled', value);
				break;
			case 'required':
				self.find('.ui-radiobutton-label').tclass('ui-radiobutton-label-required', value);
				break;
			case 'type':
				self.type = config.type;
				break;
			case 'label':
				self.find('.ui-radiobutton-label').html(value);
				break;
			case 'items':
				self.find('span').remove();
				var builder = [];
				value.split(',').forEach(function(item) {
					item = item.split('|');
					builder.push('<span data-value="{0}"><i class="fa fa-circle-o"></i>{1}</span>'.format(item[0] || item[1], item[1] || item[0]));
				});
				self.append(builder.join(''));
				self.refresh();
				break;
		}
	};

	self.make = function() {
		var builder = [];
		var label = config.label || self.html();
		label && builder.push('<div class="ui-radiobutton-label{1}">{0}</div>'.format(label, config.required ? ' ui-radiobutton-label-required' : ''));
		self.aclass('ui-radiobutton{0}'.format(config.inline === false ? ' ui-radiobutton-block' : ''));
		self.event('click', 'span', function() {
			if (config.disabled)
				return;
			var value = self.parser($(this).attr('data-value'));
			self.set(value);
			self.change(true);
		});
		self.html(builder.join(''));
		config.items && self.reconfigure('items:' + config.items);
		config.type && (self.type = config.type);
	};

	self.validate = function(value) {
		return config.disabled || !config.required ? true : !!value;
	};

	self.setter = function(value) {
		self.find('span').each(function() {
			var el = $(this);
			var is = el.attr('data-value') === (value == null ? null : value.toString());
			el.tclass('ui-radiobutton-selected', is);
			el.find('.fa').tclass('fa-circle-o', !is).tclass('fa-circle', is);
		});
	};
});

COMPONENT('devicetype', function(self, config) {

	self.nocompile();

	self.configure = function(key, value, init) {
		if (init)
			return;
		switch (key) {
			case 'items':
				self.find('span').remove();
				var builder = [];
				value.split(',').forEach(function(item) {
					item = item.split('|');
					builder.push('<span data-value="{0}">{1}</span>'.format(item[1] || item[0], item[0] || item[1]));
				});
				self.append(builder.join(''));
				self.refresh();
				break;
		}
	};

	self.make = function() {
		var builder = [];
		self.aclass('ui-devicetype');
		self.event('click', 'span', function() {
			if (config.disabled)
				return;
			var value = $(this).attrd('value');
			self.set(value);
			self.change(true);
		});
		self.html(builder.join(''));
		config.items && self.reconfigure('items:' + config.items);
		config.type && (self.type = config.type);
	};

	self.validate = function(value) {
		return config.disabled || !config.required ? true : !!value;
	};

	self.setter = function(value) {
		self.find('span').each(function() {
			var el = $(this);
			var is = el.attrd('value') === (value == null ? null : value.toString());
			el.tclass('ui-devicetype-selected', is);
		});
	};
});

COMPONENT('fontawesomebox', 'height:300;fa:false', function(self, config) {

	self.init = function() {
		window.fontawesomeicons = '500px,address-book,address-book-o,address-card,address-card-o,adjust,adn,align-center,align-justify,align-left,align-right,amazon,ambulance,american-sign-language-interpreting,anchor,android,angellist,angle-double-down,angle-double-left,angle-double-right,angle-double-up,angle-down,angle-left,angle-right,angle-up,apple,archive,area-chart,arrow-circle-down,arrow-circle-left,arrow-circle-o-down,arrow-circle-o-left,arrow-circle-o-right,arrow-circle-o-up,arrow-circle-right,arrow-circle-up,arrow-down,arrow-left,arrow-right,arrow-up,arrows,arrows-alt,arrows-h,arrows-v,asl-interpreting,assistive-listening-systems,asterisk,at,audio-description,automobile,backward,balance-scale,ban,bandcamp,bank,bar-chart,bar-chart-o,barcode,bars,bath,bathtub,battery,battery-0,battery-1,battery-2,battery-3,battery-4,battery-empty,battery-full,battery-half,battery-quarter,battery-three-quarters,bed,beer,behance,behance-square,bell,bell-o,bell-slash,bell-slash-o,bicycle,binoculars,birthday-cake,bitbucket,bitbucket-square,bitcoin,black-tie,blind,bluetooth,bluetooth-b,bold,bolt,bomb,book,bookmark,bookmark-o,braille,briefcase,btc,bug,building,building-o,bullhorn,bullseye,bus,buysellads,cab,calculator,calendar,calendar-check-o,calendar-minus-o,calendar-o,calendar-plus-o,calendar-times-o,camera,camera-retro,car,caret-down,caret-left,caret-right,caret-square-o-down,caret-square-o-left,caret-square-o-right,caret-square-o-up,caret-up,cart-arrow-down,cart-plus,cc,cc-amex,cc-diners-club,cc-discover,cc-jcb,cc-mastercard,cc-paypal,cc-stripe,cc-visa,certificate,chain,chain-broken,check,check-circle,check-circle-o,check-square,check-square-o,chevron-circle-down,chevron-circle-left,chevron-circle-right,chevron-circle-up,chevron-down,chevron-left,chevron-right,chevron-up,child,chrome,circle,circle-o,circle-o-notch,circle-thin,clipboard,clock-o,clone,close,cloud,cloud-download,cloud-upload,cny,code,code-fork,codepen,codiepie,coffee,cog,cogs,columns,comment,comment-o,commenting,commenting-o,comments,comments-o,compass,compress,connectdevelop,contao,copy,copyright,creative-commons,credit-card,credit-card-alt,crop,crosshairs,css3,cube,cubes,cut,cutlery,dashboard,dashcube,database,deaf,deafness,dedent,delicious,desktop,deviantart,diamond,digg,dollar,dot-circle-o,download,dribbble,drivers-license,drivers-license-o,dropbox,drupal,edge,edit,eercast,eject,ellipsis-h,ellipsis-v,empire,envelope,envelope-o,envelope-open,envelope-open-o,envelope-square,envira,eraser,etsy,eur,euro,exchange,exclamation,exclamation-circle,exclamation-triangle,expand,expeditedssl,external-link,external-link-square,eye,eye-slash,eyedropper,fa,facebook,facebook-f,facebook-official,facebook-square,fast-backward,fast-forward,fax,feed,female,fighter-jet,file,file-archive-o,file-audio-o,file-code-o,file-excel-o,file-image-o,file-movie-o,file-o,file-pdf-o,file-photo-o,file-picture-o,file-powerpoint-o,file-sound-o,file-text,file-text-o,file-video-o,file-word-o,file-zip-o,files-o,film,filter,fire,fire-extinguisher,firefox,first-order,flag,flag-checkered,flag-o,flash,flask,flickr,floppy-o,folder,folder-o,folder-open,folder-open-o,font,font-awesome,fonticons,fort-awesome,forumbee,forward,foursquare,free-code-camp,frown-o,futbol-o,gamepad,gavel,gbp,ge,gear,gears,genderless,get-pocket,gg,gg-circle,gift,git,git-square,github,github-alt,github-square,gitlab,gittip,glass,glide,glide-g,globe,google,google-plus,google-plus-circle,google-plus-official,google-plus-square,google-wallet,graduation-cap,gratipay,grav,group,h-square,hacker-news,hand-grab-o,hand-lizard-o,hand-o-down,hand-o-left,hand-o-right,hand-o-up,hand-paper-o,hand-peace-o,hand-pointer-o,hand-rock-o,hand-scissors-o,hand-spock-o,hand-stop-o,handshake-o,hard-of-hearing,hashtag,hdd-o,header,headphones,heart,heart-o,heartbeat,history,home,hospital-o,hotel,hourglass,hourglass-1,hourglass-2,hourglass-3,hourglass-end,hourglass-half,hourglass-o,hourglass-start,houzz,html5,i-cursor,id-badge,id-card,id-card-o,ils,image,imdb,inbox,indent,industry,info,info-circle,inr,instagram,institution,internet-explorer,intersex,ioxhost,italic,joomla,jpy,jsfiddle,key,keyboard-o,krw,language,laptop,lastfm,lastfm-square,leaf,leanpub,legal,lemon-o,level-down,level-up,life-bouy,life-buoy,life-ring,life-saver,lightbulb-o,line-chart,link,linkedin,linkedin-square,linode,linux,list,list-alt,list-ol,list-ul,location-arrow,lock,long-arrow-down,long-arrow-left,long-arrow-right,long-arrow-up,low-vision,magic,magnet,mail-forward,mail-reply,mail-reply-all,male,map,map-marker,map-o,map-pin,map-signs,mars,mars-double,mars-stroke,mars-stroke-h,mars-stroke-v,maxcdn,meanpath,medium,medkit,meetup,meh-o,mercury,microchip,microphone,microphone-slash,minus,minus-circle,minus-square,minus-square-o,mixcloud,mobile,mobile-phone,modx,money,moon-o,mortar-board,motorcycle,mouse-pointer,music,navicon,neuter,newspaper-o,object-group,object-ungroup,odnoklassniki,odnoklassniki-square,opencart,openid,opera,optin-monster,outdent,pagelines,paint-brush,paper-plane,paper-plane-o,paperclip,paragraph,paste,pause,pause-circle,pause-circle-o,paw,paypal,pencil,pencil-square,pencil-square-o,percent,phone,phone-square,photo,picture-o,pie-chart,pied-piper,pied-piper-alt,pied-piper-pp,pinterest,pinterest-p,pinterest-square,plane,play,play-circle,play-circle-o,plug,plus,plus-circle,plus-square,plus-square-o,podcast,power-off,print,product-hunt,puzzle-piece,qq,qrcode,question,question-circle,question-circle-o,quora,quote-left,quote-right,ra,random,ravelry,rebel,recycle,reddit,reddit-alien,reddit-square,refresh,registered,remove,renren,reorder,repeat,reply,reply-all,resistance,retweet,rmb,road,rocket,rotate-left,rotate-right,rouble,rss,rss-square,rub,ruble,rupee,s15,safari,save,scissors,scribd,search,search-minus,search-plus,sellsy,send,send-o,server,share,share-alt,share-alt-square,share-square,share-square-o,shekel,sheqel,shield,ship,shirtsinbulk,shopping-bag,shopping-basket,shopping-cart,shower,sign-in,sign-language,sign-out,signal,signing,simplybuilt,sitemap,skyatlas,skype,slack,sliders,slideshare,smile-o,snapchat,snapchat-ghost,snapchat-square,snowflake-o,soccer-ball-o,sort,sort-alpha-asc,sort-alpha-desc,sort-amount-asc,sort-amount-desc,sort-asc,sort-desc,sort-down,sort-numeric-asc,sort-numeric-desc,sort-up,soundcloud,space-shuttle,spinner,spoon,spotify,square,square-o,stack-exchange,stack-overflow,star,star-half,star-half-empty,star-half-full,star-half-o,star-o,steam,steam-square,step-backward,step-forward,stethoscope,sticky-note,sticky-note-o,stop,stop-circle,stop-circle-o,street-view,strikethrough,stumbleupon,stumbleupon-circle,subscript,subway,suitcase,sun-o,superpowers,superscript,support,table,tablet,tachometer,tag,tags,tasks,taxi,telegram,television,tencent-weibo,terminal,text-height,text-width,th,th-large,th-list,themeisle,thermometer,thermometer-0,thermometer-1,thermometer-2,thermometer-3,thermometer-4,thermometer-empty,thermometer-full,thermometer-half,thermometer-quarter,thermometer-three-quarters,thumb-tack,thumbs-down,thumbs-o-down,thumbs-o-up,thumbs-up,ticket,times,times-circle,times-circle-o,times-rectangle,times-rectangle-o,tint,toggle-down,toggle-left,toggle-off,toggle-on,toggle-right,toggle-up,trademark,train,transgender,transgender-alt,trash,trash-o,tree,trello,tripadvisor,trophy,truck,try,tty,tumblr,tumblr-square,turkish-lira,tv,twitch,twitter,twitter-square,umbrella,underline,undo,universal-access,university,unlink,unlock,unlock-alt,unsorted,upload,usb,usd,user,user-circle,user-circle-o,user-md,user-o,user-plus,user-secret,user-times,users,vcard,vcard-o,venus,venus-double,venus-mars,viacoin,viadeo,viadeo-square,video-camera,vimeo,vimeo-square,vine,vk,volume-control-phone,volume-down,volume-off,volume-up,warning,wechat,weibo,weixin,whatsapp,wheelchair,wheelchair-alt,wifi,wikipedia-w,window-close,window-close-o,window-maximize,window-minimize,window-restore,windows,won,wordpress,wpbeginner,wpexplorer,wpforms,wrench,xing,xing-square,y-combinator,y-combinator-square,yahoo,yc,yc-square,yelp,yen,yoast,youtube,youtube-play,youtube-square'.split(',');
	};

	var container, input, icon, prev;
	var template = '<li data-search="{0}"><i class="fa fa-{0}"></i></li>';
	var skip = false;
	var refresh = false;

	self.nocompile();
	self.readonly();

	self.make = function() {
		self.aclass('ui-fontawesomebox');
		self.css('height', config.height + 'px');
		self.append('<div class="ui-fontawesomebox-search"><span><i class="fa fa-search clearsearch"></i></span><div><input type="text" maxlength="50" placeholder="{0}" /></div></div><div class="ui-fontawesomebox-search-empty"></div><div class="ui-fontawesomebox-icons"><ul style="height:{1}px"></ul></div>'.format(config.search, config.height - 40));
		container = $(self.find('.ui-fontawesomebox-icons').find('ul')[0]);
		input = self.find('input');
		icon = self.find('.ui-fontawesomebox-search').find('.fa');

		self.event('click', '.clearsearch', function() {
			input.val('').trigger('keydown');
		});

		self.event('click', 'li', function() {
			var el = $(this);
			var val = '';

			if (!el.hclass('selected')) {
				var icon = el.find('.fa').attr('class').replace('fa ', '');
				val = config.fa ? icon : icon.replace('fa-', '');
			}

			skip = true;
			config.exec && EXEC(config.exec, val, self);
			self.set(val);
			self.change(true);
		});

		self.event('keydown', 'input', function() {
			var self = this;
			setTimeout2(self.id, function() {
				var hide = [];
				var show = [];
				var value = self.value.toSearch();
				container.find('li').each(function() {
					if (value && this.getAttribute('data-search').toSearch().indexOf(value) === -1)
						hide.push(this);
					else
						show.push(this);
				});
				$(hide).aclass('hidden');
				$(show).rclass('hidden');
				icon.tclass('fa-times', !!value).tclass('fa-search', !value);
			}, 300);
		});
	};

	self.configure = function (key, value, init) {

		if (init)
			return;

		switch (key) {
			case 'height':
				self.css('height', value + 'px');
				container.css('height', value - (38) + 'px');
				break;
		}
	};

	self.released = function(is) {
		if (is) {
			container.empty();
		} else {
			self.render();
			refresh && self.refresh();
		}
	};

	self.render = function() {
		var builder = [];
		var icons = window.fontawesomeicons;
		for (var i = 0, length = icons.length; i < length; i++)
			builder.push(template.format(icons[i]));
		container.empty();
		input.val('').trigger('keydown');
		container.html(builder.join(''));
	};

	self.setter = function(value) {
		prev && prev.rclass('selected');
		if (value) {
			var fa = container.find(config.fa ? ('.' + value) : ('.fa-' + value));
			prev = fa.parent().aclass('selected');
			setTimeout(function() {
				!skip && prev.length && prev.rescroll(-40);
			}, 100);
		}
		skip = false;
		refresh = true;
	};
});

COMPONENT('listing', 'pages:3;count:20', function(self, config) {

	var container, paginate, current, pages = 0;
	var layout;

	self.readonly();
	self.nocompile();

	self.make = function() {

		self.find('script').each(function(index) {
			var T =  Tangular.compile(this.innerHTML);
			if (index)
				layout = T;
			else
				self.template = T;
		});

		self.aclass('ui-listing');
		self.html('<div class="ui-listing-container"></div><div class="ui-listing-paginate"></div>');
		container = self.find('.ui-listing-container');
		paginate = self.find('.ui-listing-paginate');
		paginate.on('click', 'button', function() {
			var index = $(this).attrd('index');
			switch (index) {
				case '+':
					index = current + 1;
					if (index > pages)
						index = 1;
					break;
				case '-':
					index = current - 1;
					if (index < 1)
						index = pages;
					break;
				default:
					index = +index;
					break;
			}
			self.page(index);
		});
	};

	self.page = function(index) {

		var builder = [];
		var items = self.get();
		var arr = items.takeskip(config.count, (index - 1) * config.count);
		var g = { count: items.length, page: index, pages: pages };

		for (var i = 0; i < arr.length; i++) {
			g.index = i;
			builder.push(self.template(arr[i], g));
		}

		current = index;
		self.paginate(items.length, index);
		container.html(layout ? layout({ page: index, pages: pages, body: builder.join(''), count: items.length }) : builder.join(''));
	};

	self.paginate = function(count, page) {

		var max = config.pages;
		var half = Math.ceil(max / 2);

		pages = Math.ceil(count / config.count);

		var pfrom = page - half;
		var pto = page + half;
		var plus = 0;

		if (pfrom <= 0) {
			plus = Math.abs(pfrom);
			pfrom = 1;
			pto += plus;
		}

		if (pto >= pages) {
			pto = pages;
			pfrom = pages - max;
		}

		if (pfrom <= 0)
			pfrom = 1;

		if (page < half + 1) {
			pto++;
			if (pto > pages)
				pto--;
		}

		if (page < 2) {
			var template = '<button data-index="{0}"><i class="fa fa-caret-{1}"></i></button>';
			var builder = [];
			builder.push(template.format('-', 'left'));

			for (var i = pfrom; i < pto + 1; i++)
				builder.push('<button class="ui-listing-page" data-index="{0}">{0}</button>'.format(i));

			builder.push(template.format('+', 'right'));
			paginate.html(builder.join(''));
		} else {

			var max = half * 2 + 1;
			var cur = (pto - pfrom) + 1;

			if (max > cur && pages > config.pages && pfrom > 1)
				pfrom--;

			paginate.find('.ui-listing-page[data-index]').each(function(index) {
				var page = pfrom + index;
				$(this).attrd('index', page).html(page);
			});

		}

		paginate.find('.selected').rclass('selected');
		paginate.find('.ui-listing-page[data-index="{0}"]'.format(page)).aclass('selected');
		paginate.tclass('hidden', pages < 2);
		self.tclass('hidden', count === 0);
	};

	self.setter = function(value) {
		if (value)
			self.page(1);
		else {
			container.empty();
			paginate.empty();
		}
	};

});

COMPONENT('donutchart', 'format:{{ value | format(0) }};size:0;tooltip:true;presentation:true;animate:true', function(self, config) {

	var svg, g, selected, tooltip;
	var strokew = 0;
	var animate = true;
	var indexer = 0;
	var indexerskip = false;
	var force = false;
	var W = $(window);

	self.readonly();
	self.make = function() {
		self.aclass('ui-donutchart');
		self.append('<div class="ui-donutchart-tooltip"></div><svg></svg>');
		svg = self.find('svg');
		g = svg.asvg('g').attr('class', 'pieces');
		tooltip = self.find('.ui-donutchart-tooltip');

		W.on('resize', self.resize);

		self.event('mouseenter touchstart', '.piece', function() {
			self.select(+this.getAttribute('data-index'));
			!indexerskip && config.presentation && setTimeout2(self.id + '.skip', self.next, 30000);
			indexerskip = true;
		});
	};

	self.select = function(index) {
		var item = self.get()[index];
		if (item === selected)
			return;

		self.find('.selected').rclass('selected').css('stroke-width', strokew);
		selected = item;

		var el = self.find('.piece' + (index + 1));

		if (config.tooltip) {
			var w = self.width();
			tooltip.css('font-size', w / 15);
			tooltip.html('<b>' + item.name + '</b><br />' + Tangular.render(config.format, item));
		}

		config.select && EXEC(config.select, item);
		el.css('stroke-width', strokew.inc('+15%')).aclass('selected');
		indexer = index;
	};

	self.destroy = function() {
		W.off('resize', self.resize);
	};

	self.resize = function() {
		setTimeout2('resize.' + self.id, function() {
			animate = false;
			force = true;
			self.refresh();
		}, 100);
	};

	self.next = function() {

		if (self.removed)
			return;

		if (indexerskip) {
			indexerskip = false;
			return;
		}

		indexer++;

		if (!self.get()[indexer])
			indexer = 0;

		self.select(indexer);
		setTimeout2(self.id + '.next', self.next, 4000);
	};

	function arcradius(centerX, centerY, radius, degrees) {
		var radians = (degrees - 90) * Math.PI / 180.0;
		return { x: centerX + (radius * Math.cos(radians)), y: centerY + (radius * Math.sin(radians)) };
	}

	function arc(x, y, radius, startAngle, endAngle){
		var start = arcradius(x, y, radius, endAngle);
		var end = arcradius(x, y, radius, startAngle);
		var largeArcFlag = endAngle - startAngle <= 180 ? 0 : 1;
		var d = ['M', start.x, start.y, 'A', radius, radius, 0, largeArcFlag, 0, end.x, end.y].join(' ');
		return d;
	}

	self.redraw = function(width, value) {

		var sum = null;

		for (var i = 0, length = value.length; i < length; i++) {
			var item = value[i];

			if (item.value == null)
				item.value = 0;

			var val = item.value + 1;
			sum = sum ? sum + val : val;
		}

		var count = 0;
		var beg = 0;
		var end = 0;
		var items = [];

		for (var i = 0, length = value.length; i < length; i++) {
			var item = value[i];
			var p = (((item.value + 1) / sum) * 100).floor(2);

			count += p;

			if (i === length - 1 && count < 100)
				p = p + (100 - count);

			end = beg + ((360 / 100) * p);
			items.push({ name: item.name, percentage: p, beg: beg, end: end });
			beg = end;
		}

		if (!force && NOTMODIFIED(self.id, items))
			return;

		var size = width;
		var half = size / 2;
		var midpoint = size / 2.4;

		strokew = (size / 6 >> 0).inc('-15%');

		svg.attr('width', size);
		svg.attr('height', size);
		g.empty();

		var pieces = [];

		for (var i = 0, length = items.length; i < length; i++) {
			var item = items[i];
			if (item.percentage === 0)
				continue;
			if (item.end === 360)
				item.end = 359.99;
			pieces.push(g.asvg('path').attr('data-index', i).attr('data-beg', item.beg).attr('data-end', item.end).attr('stroke-width', strokew).attr('class', 'piece piece' + (i + 1)).attr('d', arc(half, half, midpoint, item.beg, animate ? item.beg : item.end)));
		}

		animate && pieces.waitFor(function(item, next) {
			var beg = +item.attrd('beg');
			var end = +item.attrd('end');
			var diff = end - beg;

			if (config.animate) {
				item.animate({ end: diff }, { duration: 180, step: function(fx) {
					item.attr('d', arc(half, half, midpoint, beg, beg + fx));
				}, complete: function() {
					next();
				}});
			} else {
				item.attr('d', arc(half, half, midpoint, beg, end));
				next();
			}
		});

		selected = null;
		animate = true;
		force = false;

		config.redraw && EXEC(config.redraw);

		self.select(0);
		if (config.presentation) {
			indexerskip = false;
			setTimeout(self.next, 4000);
		}
	};

	self.setter = function(value) {

		if (!value) {
			g.empty();
			return;
		}

		if (config.size) {
			self.redraw(config.size, value);
		} else {
			self.width(function(width) {
				self.redraw(width, value);
			});
		}
	};
});
