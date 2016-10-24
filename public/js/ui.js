COMPONENT('click', function() {
	var self = this;

	self.readonly();

	self.click = function() {
		var value = self.attr('data-value');
		if (typeof(value) === 'string')
			self.set(self.parser(value));
		else
			self.get(self.attr('data-component-path'))(self);
	};

	self.make = function() {
		self.element.on('click', self.click);
		var enter = self.attr('data-enter');
		enter && $(enter).on('keydown', 'input', function(e) {
			e.keyCode === 13 && setTimeout(function() {
				!self.element.get(0).disabled && self.click();
			}, 100);
		});
	};
});

COMPONENT('visible', function() {
	var self = this;
	var condition = self.attr('data-if');
	self.readonly();
	self.setter = function(value) {
		var is = true;
		if (condition)
			is = EVALUATE(self.path, condition);
		else
			is = value ? true : false;
		self.element.toggleClass('hidden', !is);
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

		self.element.on('click', '.fa-times', function() {
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

		self.element.on('change keypress', 'input', function(e) {

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

	self.setter = function(value, path, type) {

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

COMPONENT('message', function() {
	var self = this;
	var is = false;
	var visible = false;
	var timer;

	self.readonly();
	self.singleton();

	self.make = function() {
		self.element.addClass('ui-message hidden');

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
		self.element.removeClass('ui-message-visible');
		timer && clearTimeout(timer);
		timer = setTimeout(function() {
			visible = false;
			self.element.addClass('hidden');
		}, 1000);
	};

	self.content = function(cls, text, icon) {
		!is && self.html('<div><div class="ui-message-body"><span class="fa fa-warning"></span><div class="ui-center"></div></div><button>' + (self.attr('data-button') || 'Close') + '</button></div>');
		timer && clearTimeout(timer);
		visible = true;
		self.element.find('.ui-message-body').removeClass().addClass('ui-message-body ' + cls);
		self.element.find('.fa').removeClass().addClass('fa ' + icon);
		self.element.find('.ui-center').html(text);
		self.element.removeClass('hidden');
		setTimeout(function() {
			self.element.addClass('ui-message-visible');
		}, 5);
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
		var disabled = jC.disabled(path);
		if (!disabled && self.evaluate)
			disabled = !EVALUATE(self.path, self.evaluate);
		elements.prop({ disabled: disabled });
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
		self.element.addClass('ui-checkbox');
		self.html('<div><i class="fa fa-check"></i></div><span{1}>{0}</span>'.format(self.html(), isRequired ? ' class="ui-checkbox-label-required"' : ''));
		self.element.on('click', function() {
			self.dirty(false);
			self.getter(!self.get(), 2, true);
		});
	};

	self.setter = function(value) {
		self.element.toggleClass('ui-checkbox-checked', value ? true : false);
	};
});

COMPONENT('dropdown', function() {

	var self = this;
	var isRequired = self.attr('data-required') === 'true';
	var select;
	var container;

	self.validate = function(value) {

		if (select.prop('disabled') || !isRequired)
			return true;

		var type = typeof(value);
		if (type === 'undefined' || type === 'object')
			value = '';
		else
			value = value.toString();

		EXEC('$calendar.hide');

		if (self.type === 'currency' || self.type === 'number')
			return value > 0;

		return value.length > 0;
	};

	!isRequired && self.noValid();

	self.required = function(value) {
		self.element.find('.ui-dropdown-label').toggleClass('ui-dropdown-label-required', value);
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

		self.element.addClass('ui-dropdown-container');

		var label = self.html();
		var html = '<div class="ui-dropdown"><span class="fa fa-sort"></span><select data-component-bind="">{0}</select></div>'.format(options.join(''));
		var builder = [];

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

		var prerender = function(path) {
			var value = self.get(self.attr('data-source'));
			!NOTMODIFIED(self.id, value) && self.render(value || EMPTYARRAY);
		};

		self.watch(ds, prerender, true);
	};

	self.state = function(type, who) {
		if (!type)
			return;
		var invalid = self.isInvalid();
		if (invalid === self.$oldstate)
			return;
		self.$oldstate = invalid;
		container.toggleClass('ui-dropdown-invalid', self.isInvalid());
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

		EXEC('$calendar.hide');

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
		self.element.find('.ui-textbox-label').toggleClass('ui-textbox-label-required', value);
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
		attrs.attr('data-component-keypress', self.attr('data-component-keypress'));
		attrs.attr('data-component-keypress-delay', self.attr('data-component-keypress-delay'));
		attrs.attr('data-component-bind', '');

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

		icon2 && builder.push('<div><span class="fa {0}"></span></div>'.format(icon2));
		increment && !icon2 && builder.push('<div><span class="fa fa-caret-up"></span><span class="fa fa-caret-down"></span></div>');
		increment && self.element.on('click', '.fa-caret-up,.fa-caret-down', function(e) {
			var el = $(this);
			var inc = -1;
			if (el.hasClass('fa-caret-up'))
				inc = 1;
			self.change(true);
			self.inc(inc);
		});

		self.type === 'date' && self.element.on('click', '.fa-calendar', function(e) {
			e.preventDefault();
			window.$calendar && window.$calendar.toggle($(this).parent().parent(), self.element.find('input').val(), function(date) {
				self.set(date);
			});
		});

		if (!content.length) {
			self.element.addClass('ui-textbox ui-textbox-container');
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
		self.element.addClass('ui-textbox-container');
		input = self.find('input');
		container = self.find('.ui-textbox');
	};

	self.state = function(type, who) {
		if (!type)
			return;
		var invalid = self.isInvalid();
		if (invalid === self.$oldstate)
			return;
		self.$oldstate = invalid;
		container.toggleClass('ui-textbox-invalid', self.isInvalid());
	};
});

COMPONENT('textarea', function() {

	var self = this;
	var isRequired = self.attr('data-required') === 'true';
	var input;
	var container;

	self.validate = function(value) {

		var is = false;
		var type = typeof(value);
		if (input.prop('disabled') || isRequired)
			return true;

		if (type === 'undefined' || type === 'object')
			value = '';
		else
			value = value.toString();

		EXEC('$calendar.hide');
		return value.length > 0;
	};

	!isRequired && self.noValid();

	self.required = function(value) {
		self.element.find('.ui-textarea-label').toggleClass('ui-textarea-label-required', value);
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
		attrs.attr('data-component-bind', '');

		tmp = self.attr('data-height');
		tmp && attrs.attr('style', 'height:' + tmp);
		self.attr('data-autofocus') === 'true' && attrs.attr('autofocus');
		builder.push('<textarea {0}></textarea>'.format(attrs.join(' ')));

		var element = self.element;
		var content = element.html();

		if (!content.length) {
			self.element.addClass('ui-textarea ui-textarea-container');
			self.html(builder.join(''));
			input = self.find('textarea');
			container = self.element;
			return;
		}

		var height = self.attr('data-height');
		var icon = self.attr('data-icon');
		var html = builder.join('');

		builder = [];
		builder.push('<div class="ui-textarea-label{0}">'.format(isRequired ? ' ui-textarea-label-required' : ''));
		icon && builder.push('<span class="fa {0}"></span> '.format(icon));
		builder.push(content);
		builder.push(':</div><div class="ui-textarea">{0}</div>'.format(html));

		self.html(builder.join(''));
		self.element.addClass('ui-textarea-container');
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
		container.toggleClass('ui-textarea-invalid', self.isInvalid());
	};
});

COMPONENT('template', function() {
	var self = this;
	self.readonly();
	self.make = function(template) {

		if (template) {
			self.template = Tangular.compile(template);
			return;
		}

		var script = self.element.find('script');

		if (!script.length) {
			script = self.element;
			self.element = self.element.parent();
		}

		self.template = Tangular.compile(script.html());
		script.remove();
	};

	self.setter = function(value) {
		if (NOTMODIFIED(self.id, value))
			return;
		if (!value)
			return self.element.addClass('hidden');
		KEYPRESS(function() {
			self.html(self.template(value)).removeClass('hidden');
		}, 100, self.id);
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
		recompile = html.indexOf('data-component="') !== -1;
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
			builder.push(self.template(item).replace(/\$index/g, i.toString()).replace(/\$/g, self.path + '[' + i + ']'));
		}

		self.html(builder);
		recompile && jC.compile();
	};
});

COMPONENT('error', function() {
	var self = this;
	var element;

	self.readonly();

	self.make = function() {
		self.element.append('<ul class="ui-error hidden"></ul>');
		element = self.element.find('ul');
	};

	self.setter = function(value) {

		if (!(value instanceof Array) || !value.length) {
			element.addClass('hidden');
			return;
		}

		var builder = [];
		for (var i = 0, length = value.length; i < length; i++)
			builder.push('<li><span class="fa fa-times-circle"></span> ' + value[i].error + '</li>');

		element.empty();
		element.append(builder.join(''));
		element.removeClass('hidden');
	};
});

COMPONENT('page', function() {
	var self = this;
	var isProcessed = false;
	var isProcessing = false;
	var reload = self.attr('data-reload');

	self.hide = function() {
		self.set('');
	};

	self.getter = null;
	self.setter = function(value) {

		if (isProcessing)
			return;

		var el = self.element;
		var is = el.attr('data-if') == value;

		if (isProcessed || !is) {
			el.toggleClass('hidden', !is);

			if (is && reload)
				self.get(reload)();

			return;
		}

		var loading = FIND('loading');
		loading.show();
		isProcessing = true;
		INJECT(el.attr('data-template'), el, function() {
			isProcessing = false;

			var init = el.attr('data-init');
			if (init) {
				var fn = GET(init || '');
				if (typeof(fn) === 'function')
					fn(self);
			}

			isProcessed = true;
			el.toggleClass('hidden', !is);
			loading.hide(1200);
		});
	};
});

COMPONENT('form', function() {

	var self = this;
	var autocenter;

	if (!MAN.$$form) {
		window.$$form_level = window.$$form_level || 1;
		MAN.$$form = true;
		$(document).on('click', '.ui-form-button-close', function() {
			SET($.components.findById($(this).attr('data-id')).path, '');
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
	self.submit = function(hide) { self.hide(); };
	self.cancel = function(hide) { self.hide(); };
	self.onHide = function(){};

	var hide = self.hide = function() {
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
		ui.css({ marginTop: r > 30 ? (r - 15) + 'px' : '20px' });
	};

	self.make = function() {
		var width = self.attr('data-width') || '800px';
		var submit = self.attr('data-submit');
		var enter = self.attr('data-enter');
		autocenter = self.attr('data-autocenter') === 'true';
		self.condition = self.attr('data-if');

		$(document.body).append('<div id="{0}" class="hidden ui-form-container"><div class="ui-form-container-padding"><div class="ui-form" style="max-width:{1}"><div class="ui-form-title"><span class="fa fa-times ui-form-button-close" data-id="{2}"></span>{3}</div>{4}</div></div>'.format(self._id, width, self.id, self.attr('data-title')));

		self.element.data(COM_ATTR, self);
		var el = $('#' + self._id);
		el.find('.ui-form').get(0).appendChild(self.element.get(0));
		self.element = el;

		self.element.on('scroll', function() {
			EXEC('$calendar.hide');
		});

		self.element.find('button').on('click', function(e) {
			window.$$form_level--;
			switch (this.name) {
				case 'submit':
					self.submit(hide);
					break;
				case 'cancel':
					!this.disabled && self[this.name](hide);
					break;
			}
		});

		enter === 'true' && self.element.on('keydown', 'input', function(e) {
			e.keyCode === 13 && self.element.find('button[name="submit"]').get(0).disabled && self.submit(hide);
		});

		return true;
	};

	self.getter = null;
	self.setter = function(value) {

		setTimeout2('noscroll', function() {
			$('html,body').toggleClass('noscroll', value ? true : false);
		}, 50);

		var isHidden = !EVALUATE(self.path, self.condition);
		self.element.toggleClass('hidden', isHidden);
		EXEC('$calendar.hide');

		if (isHidden) {
			self.element.find('.ui-form').removeClass('ui-form-animate');
			return;
		}

		self.resize();
		var el = self.element.find('input,select,textarea');
		el.length && el.eq(0).focus();
		window.$$form_level++;
		self.element.css('z-index', window.$$form_level * 10);
		self.element.animate({ scrollTop: 0 }, 0, function() {
			setTimeout(function() {
				self.element.find('.ui-form').addClass('ui-form-animate');
			}, 300);
		});
	};
});

COMPONENT('repeater-group', function() {

	var self = this;
	var template_group;
	var group;

	self.readonly();

	self.make = function() {
		group = self.attr('data-group');
		self.element.find('script').each(function(index) {
			var element = $(this);
			var html = element.html();
			element.remove();

			if (!index) {
				self.template = Tangular.compile(html);
				return;
			}

			template_group = Tangular.compile(html);
		});
	};

	self.setter = function(value) {

		if (!value || !value.length) {
			self.element.empty();
			return;
		}

		if (NOTMODIFIED(self.id, value))
			return;

		var length = value.length;
		var groups = {};

		for (var i = 0; i < length; i++) {
			var name = value[i][group];
			if (!name)
				name = '0';

			if (!groups[name])
				groups[name] = [value[i]];
			else
				groups[name].push(value[i]);
		}

		var index = 0;
		var builder = '';
		var keys = Object.keys(groups);

		keys.sort();
		keys.forEach(function(key) {
			var arr = groups[key];

			if (key !== '0') {
				var options = {};
				options[group] = key;
				options.length = arr.length;
				builder += template_group(options);
			}

			for (var i = 0, length = arr.length; i < length; i++) {
				var item = arr[i];
				item.index = index++;
				builder += self.template(item).replace(/\$index/g, index.toString()).replace(/\$/g, self.path + '[' + index + ']');
			}
		});

		self.element.empty().append(builder);
	};
});

COMPONENT('calendar', function() {

	var self = this;
	var skip = false;
	var skipDay = false;
	var callback;

	self.days = self.attr('data-days').split(',');
	self.days_short = [];
	self.months = self.attr('data-months').split(',');
	self.first = parseInt(self.attr('data-firstday'));
	self.today = self.attr('data-today');
	self.months_short = [];

	for (var i = 0, length = self.days.length; i < length; i++)
		self.days_short.push(self.days[i].substring(0, 2).toUpperCase());

	for (var i = 0, length = self.months.length; i < length; i++) {
		var m = self.months[i];
		if (m.length > 4)
			m = m.substring(0, 3) + '.';
		self.months_short.push(m);
	}

	self.readonly();
	self.click = function(date) {};

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
			output.header.push({ index: firstDay, name: self.days_short[firstDay] });
			firstDay++;
			if (firstDay > 6)
				firstDay = 0;
		}

		var index = 0;
		var indexEmpty = 0;
		var count = 0;
		var prev = getMonthDays(new Date(year, month - 1, 1)) - from;

		for (var i = 0; i < days + from; i++) {

			count++;
			var obj = { isToday: false, isSelected: false, isEmpty: false, isFuture: false, number: 0, index: count };

			if (i >= from) {
				index++;
				obj.number = index;
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
		for (var i = count; i < 42; i++) {
			count++;
			indexEmpty++;
			var obj = { isToday: false, isSelected: false, isEmpty: true, isFuture: false, number: indexEmpty, index: count };
			output.days.push(obj);
		}

		return output;
	}

	self.hide = function() {
		if (self.element.hasClass('hidden'))
			return;
		self.element.addClass('hidden');
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

		self.element.css({ left: off.left + (offset || 0), top: off.top + h + 5 }).removeClass('hidden');
		self.click = callback;
		self.date(value);
		return self;
	};

	self.make = function() {

		self.element.addClass('ui-calendar hidden');

		self.element.on('click', '.ui-calendar-today', function() {
			var dt = new Date();
			self.hide();
			if (self.click)
				self.click(dt);
		});

		self.element.on('click', '.ui-calendar-day', function() {
			var arr = this.getAttribute('data-date').split('-');
			var dt = new Date(parseInt(arr[0]), parseInt(arr[1]), parseInt(arr[2]));
			skip = true;
			self.element.find('.ui-calendar-selected').removeClass('ui-calendar-selected');
			$(this).addClass('ui-calendar-selected');
			self.hide();
			if (self.click)
				self.click(dt);
		});

		self.element.on('click', 'button', function(e) {

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
			window.$calendar && window.$calendar.hide();
		});

		$(document).on('click', function() {
			if (!window.$calendar || window.$calendar.element.hasClass('hidden'))
				return;
			window.$calendar.hide();
		});

		window.$calendar = self;
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

		old = value;

		var output = calculate(value.getFullYear(), value.getMonth(), value);
		var builder = [];

		for (var i = 0; i < 42; i++) {

			var item = output.days[i];

			if (i % 7 === 0) {
				if (builder.length > 0)
					builder.push('</tr>');
				builder.push('<tr>');
			}

			var cls = [];

			if (item.isEmpty)
				cls.push('ui-calendar-disabled');
			else
				cls.push('ui-calendar-day');

			if (!empty && item.isSelected)
				cls.push('ui-calendar-selected');

			if (item.isToday)
				cls.push('ui-calendar-day-today');

			builder.push('<td class="' + cls.join(' ') + '" data-date="' + output.year + '-' + output.month + '-' + item.number + '">' + item.number + '</td>');
		}

		builder.push('</tr>');

		var header = [];
		for (var i = 0; i < 7; i++)
			header.push('<th>' + output.header[i].name + '</th>');

		self.element.html('<div class="ui-calendar-header"><button class="ui-calendar-header-prev" name="prev" data-date="' + output.year + '-' + output.month + '"><span class="fa fa-chevron-left"></span></button><div class="ui-calendar-header-info">' + self.months[value.getMonth()] + ' ' + value.getFullYear() + '</div><button class="ui-calendar-header-next" name="next" data-date="' + output.year + '-' + output.month + '"><span class="fa fa-chevron-right"></span></button></div><table cellpadding="0" cellspacing="0" border="0"><thead>' + header.join('') + '</thead><tbody>' + builder.join('') + '</tbody></table>' + (self.today ? '<div><a href="javascript:void(0)" class="ui-calendar-today">' + self.today + '</a></div>' : ''));
	};
});

COMPONENT('tabmenu', function() {
	var self = this;
	self.readonly();
	self.make = function() {
		self.element.on('click', 'li', function() {
			var el = $(this);
			!el.hasClass('selected') && self.set(self.parser(el.attr('data-value')));
		});
	};
	self.setter = function(value) {
		self.element.find('.selected').removeClass('selected');
		self.element.find('li[data-value="' + value + '"]').addClass('selected');
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
		self.element.on('click', 'button', function() {
			self.hide($(this).attr('data-index').parseInt());
		});

		self.element.on('click', function(e) {
			if (e.target.tagName !== 'DIV')
				return;
			var el = self.element.find('.ui-confirm-body');
			el.addClass('ui-confirm-click');
			setTimeout(function() {
				el.removeClass('ui-confirm-click');
			}, 300);
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
		self.element.removeClass('ui-confirm-visible');
		setTimeout2(self.id, function() {
			visible = false;
			self.element.addClass('hidden');
		}, 1000);
	};

	self.content = function(cls, text) {
		!is && self.html('<div><div class="ui-confirm-body"></div></div>');
		visible = true;
		self.element.find('.ui-confirm-body').empty().append(text);
		self.element.removeClass('hidden');
		setTimeout2(self.id, function() {
			self.element.addClass('ui-confirm-visible');
		}, 5);
	};
});

COMPONENT('loading', function() {
	var self = this;
	var pointer;

	self.readonly();
	self.singleton();

	self.make = function() {
		self.element.addClass('ui-loading');
	};

	self.show = function() {
		clearTimeout(pointer);
		self.element.toggleClass('hidden', false);
		return self;
	};

	self.hide = function(timeout) {
		clearTimeout(pointer);
		pointer = setTimeout(function() {
			self.element.toggleClass('hidden', true);
		}, timeout || 1);
		return self;
	};
});

jC.parser(function(path, value, type) {

	if (type === 'date') {
		if (value instanceof Date)
			return value;

		if (!value)
			return null;

		var isEN = value.indexOf('.') === -1;
		var tmp = isEN ? value.split('-') : value.split('.');
		if (tmp.length !== 3)
			return null;
		var dt = isEN ? new Date(parseInt(tmp[0]) || 0, (parseInt(tmp[1], 10) || 0) - 1, parseInt(tmp[2], 10) || 0) : new Date(parseInt(tmp[2]) || 0, (parseInt(tmp[1], 10) || 0) - 1, parseInt(tmp[0], 10) || 0);
		return dt;
	}

	return value;
});

jC.formatter(function(path, value, type) {

	if (type === 'date') {
		if (value instanceof Date)
			return value.format(this.attr('data-component-format'));
		if (!value)
			return value;
		return new Date(Date.parse(value)).format(this.attr('data-component-format'));
	}

	if (type !== 'currency')
		return value;

	if (typeof(value) !== 'number') {
		value = parseFloat(value);
		if (isNaN(value))
			value = 0;
	}

	return value.format(2);
});

COMPONENT('tagger', function() {

	var self = this;
	var elements;

	self.readonly();

	self.make = function() {
		elements = self.find('[data-name]');
		elements.each(function() {
			this.$tagger = {};
			this.$tagger.def = this.innerHTML;
		});
	};

	self.arrow = function(value) {
		return FN(value.replace(/\&gt\;/g, '>').replace(/\&lt\;/g, '<').replace(/\&amp\;/g, '&'));
	};

	self.setter = function(value) {

		if (!value) {
			self.element.addClass('hidden');
			return;
		}

		// self.element.toggleClass('transparent', true).removeClass('hidden');
		elements.each(function() {

			var name = this.getAttribute('data-name');
			var format = this.getAttribute('data-format');
			var type = this.getAttribute('data-type');
			var visible = this.getAttribute('data-visible');
			var before = this.getAttribute('data-before');
			var after = this.getAttribute('data-after');
			var val = name ? GET(name, value) : value;
			var cache = this.$tagger;
			var key;

			if (format) {
				key = 'format';
				if (cache[key])
					format = cache[key];
				else
					format = cache[key] = self.arrow(format);
			}

			var typeval = typeof(val);

			switch (type) {
				case 'date':
					if (typeval === 'string')
						val = val.parseDate();
					else if (typeval === 'number')
						val = new Date(val);
					else
						val = '';
					break;

				case 'number':
				case 'currency':
					if (typeval === 'string')
						val = val.parseFloat();
					if (typeof(val) !== 'number')
						val = '';
					break;
			}

			if ((val || val === 0) && format)
				val = format(val);

			if (visible) {
				key = 'visible';
				if (cache[key])
					visible = cache[key];
				else
					visible = cache[key] = self.arrow(visible);
				var is = visible(val);
				$(this).toggleClass('hidden', !is);
				return;
			}

			val = val == null ? '' : val.toString();

			if (val && !format)
				val = Ta.helpers.encode(val);

			if (val) {
				if (this.innerHTML !== val)
					this.innerHTML = (before ? before : '') + val + (after ? after : '');
				return;
			}

			if (this.innerHTML !== cache.def)
				this.innerHTML = cache.def;
		});

		self.element.removeClass('transparent hidden');
	};
});

COMPONENT('multioptions', function() {

	var self = this;
	var colors = ['#ED5565', '#DA4453', '#FC6E51', '#E9573F', '#FFCE54', '#F6BB42', '#A0D468', '#8CC152', '#48CFAD', '#37BC9B', '#4FC1E9', '#3BAFDA', '#5D9CEC', '#4A89DC', '#AC92EC', '#967ADC', '#EC87C0', '#D770AD', '#F5F7FA', '#E6E9ED', '#CCD1D9', '#AAB2BD', '#656D78', '#434A54', '#000000'];
	var Tinput = Tangular.compile('<input class="ui-moi-save ui-moi-value-inputtext" data-name="{{ name }}" type="text" value="{{ value }}"{{ if def }} placeholder="{{ def }}"{{ fi }}{{ if max }} maxlength="{{ max }}"{{ fi }} data-type="text" />');
	var Tcolor = Tangular.compile('<div class="ui-moi-value-colors ui-moi-save" data-name="{{ name }}" data-value="{{ value }}">{0}</div>'.format(colors.map(function(n) { return '<span data-value="{0}" data-type="color" class="multioptions-operation" style="background-color:{0}"><i class="fa fa-check-circle"></i></span>'.format(n) }).join('')));
	var Tselect = Tangular.compile('<div class="ui-moi-value-select"><i class="fa fa-chevron-down"></i><select data-name="{{ name }}" class="ui-moi-save ui-multioptions-select">{{ foreach m in values }}<option value="{{ $index }}"{{ if value === m.value }} selected="selected"{{ fi }}>{{ m.text }}</option>{{ end }}</select></div>');
	var Tnumber = Tangular.compile('<div class="ui-moi-value-inputnumber-buttons"><span class="multioptions-operation" data-type="number" data-step="{{ step }}" data-name="plus" data-max="{{ max }}" data-min="{{ min }}"><i class="fa fa-plus"></i></span><span class="multioptions-operation" data-type="number" data-name="minus" data-step="{{ step }}" data-max="{{ max }}" data-min="{{ min }}"><i class="fa fa-minus"></i></span></div><div class="ui-moi-value-inputnumber"><input data-name="{{ name }}" class="ui-moi-save ui-moi-value-numbertext" type="text" value="{{ value }}"{{ if def }} placeholder="{{ def }}"{{ fi }} data-max="{{ max }}" data-min="{{ max }}" data-type="number" /></div>');
	var Tpath = Tangular.compile('<div class="ui-moi-value-inputpath-buttons"><span class="multioptions-operation" data-type="path" data-name="find"><i class="fa fa-search"></i></span></div><div class="ui-moi-value-inputpath"><input class="ui-moi-save" data-name="{{ name }}" type="text" value="{{ value }}"{{ if def }} placeholder="{{ def }}"{{ fi }}{{ if max }} maxlength="{{ max }}"{{ fi }} data-type="text" /></div>');
	var Tboolean = Tangular.compile('<div data-name="{{ name }}" data-type="boolean" class="ui-moi-save multioptions-operation ui-moi-value-boolean{{ if value }} checked{{ fi }}"><i class="fa fa-check"></i></div>');
	var Tdate = Tangular.compile('<div class="ui-moi-value-inputdate-buttons"><span class="multioptions-operation" data-type="date" data-name="date"><i class="fa fa-calendar"></i></span></div><div class="ui-moi-value-inputdate"><input class="ui-moi-save ui-moi-date" data-name="{{ name }}" type="text" value="{{ value | format(\'yyyy-MM-dd\') }}" placeholder="dd.mm.yyyy" maxlength="10" data-type="date" /></div>');
	var skip = false;

	self.readonly();

	self.form = function(type, input, name) {};

	self.make = function() {
		self.element.addClass('ui-multioptions');
		self.element.on('click', '.multioptions-operation', function(e) {
			var el = $(this);
			var name = el.attr('data-name');
			var type = el.attr('data-type');

			e.stopPropagation();

			if (type === 'date') {

				el = el.parent().parent().find('input');

				FIND('calendar').show(el, el.val().parseDate(), function(date) {
					el.val(date.format('yyyy-MM-dd'));
				});

				return;
			}

			if (type === 'color') {
				el.parent().find('.selected').removeClass('selected');
				el.addClass('selected');
				return;
			}

			if (type === 'boolean') {
				el.toggleClass('checked');
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
				return;
			}

			self.form(type, el.parent().parent().find('input'), name);
			return;
		});

		self.element.on('change', 'input', function() {
			var el = $(this);
			var type = el.attr('data-type');
			// @TODO: make validation
		});

		self.element.on('click', '.ui-moi-date', function(e) {
			e.stopPropagation();
		});

		self.element.on('focus', '.ui-moi-date', function(e) {
			var el = $(this);
			FIND('calendar').toggle(el, el.val().parseDate(), function(date) {
				el.val(date.format('yyyy-MM-dd'));
			});
		});
	};

	self.save = function() {
		var obj = self.get();
		var values = self.element.find('.ui-moi-save');

		Object.keys(obj).forEach(function(key) {

			var opt = obj[key];
			var el = values.filter('[data-name="{0}"]'.format(opt.name));

			if (el.hasClass('ui-moi-value-colors')) {
				opt.value = el.find('.selected').attr('data-value');
				return;
			}

			if (el.hasClass('ui-moi-value-boolean')) {
				opt.value = el.hasClass('checked');
				return;
			}

			if (el.hasClass('ui-moi-date')) {
				opt.value = el.val().parseDate();
				return;
			}

			if (el.hasClass('ui-moi-value-inputtext')) {
				opt.value = el.val();
				return;
			}

			if (el.hasClass('ui-moi-value-numbertext')) {
				opt.value = el.val().parseInt();
				return;
			}

			if (el.hasClass('ui-moi-value-numbertext')) {
				opt.value = el.val().parseInt();
				return;
			}

			if (el.hasClass('ui-multioptions-select')) {
				var index = el.val().parseInt();
				var val = opt.values[index];
				opt.value = val ? val.value : null;
				return;
			}

			if (el.attr('data-name') === 'path') {
				opt.value = el.val();
				return;
			}
		});
	};

	self.setter = function(options) {

		if (!options || skip) {
			skip = false;
			return;
		}

		var builder = [];

		Object.keys(options).forEach(function(key) {

			var option = options[key];

			// option.name
			// option.label
			// option.type (lowercase)
			// option.def
			// option.value
			// option.max
			// option.min
			// option.step

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
				case 'path':
					value = Tpath(option);
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

COMPONENT('dictionary', function() {
	var self = this;
	var container;
	var empty = {};
	var skip = false;

	self.template = Tangular.compile('<div class="ui-dictionary-item"><div class="ui-dictionary-item-remove"><i class="fa fa-times"></i></div><div class="ui-dictionary-item-key"><input type="text" name="key" maxlength="{{ max }}" placeholder="{{ placeholder_key }}" value="{{ key }}" /></div><div class="ui-dictionary-item-value"><input type="text" maxlength="{{ max }}" placeholder="{{ placeholder_value }}" value="{{ value }}" /></div></div>');
	self.make = function() {

		empty.max = (self.attr('data-maxlength') || '100').parseInt();
		empty.placeholder_key = self.attr('data-placeholder-key');
		empty.placeholder_value = self.attr('data-placeholder-value');
		empty.value = '';

		var html = self.html();
		var icon = self.attr('data-icon');

		if (icon)
			icon = '<i class="fa {0}"></i>'.format(icon);

		self.toggle('ui-dictionary');
		self.html((html ? '<div class="ui-dictionary-label">{1}{0}:</div>'.format(html, icon) : '') + '<div class="ui-dictionary-items"></div>' + self.template(empty).replace('-item"', '-item ui-dictionary-base"'));

		container = self.find('.ui-dictionary-items');

		self.element.on('click', '.fa-times', function() {
			var el = $(this);
			var parent = el.closest('.ui-dictionary-item');
			var inputs = parent.find('input');
			var obj = self.get();
			var key = inputs.get(0).value;
			parent.remove();
			delete obj[key];
			self.set(self.path, obj, 2);
		});

		self.element.on('change keypress', 'input', function(e) {

			if (e.type !== 'change' && e.keyCode !== 13)
				return;

			var el = $(this);
			var inputs = el.closest('.ui-dictionary-item').find('input');
			var key = inputs.get(0).value;
			var value = inputs.get(1).value;

			if (!key || !value)
				return;

			var arr = [];
			var base = el.closest('.ui-dictionary-base').length > 0;
			if (base && e.type === 'change')
				return;

			if (base) {
				var tmp = self.get();
				tmp[key] = value;
				self.set(tmp);
				inputs.val('');
				inputs.eq(0).focus();
				return;
			}

			var dictionary = {};
			var k;

			container.find('input').each(function() {
				if (this.name === 'key') {
					k = this.value.trim();
				} else if (k) {
					dictionary[k] = this.value.trim();
					k = '';
				}
			});

			skip = true;
			self.set(self.path, dictionary, 2);
		});
	};

	self.setter = function(value, path, type) {

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

COMPONENT('highlightsyntax', function() {
	var self = this;
	var text;
	self.readonly();

	self.make = function() {
		text = self.html();
	};

	self.setter = function(value) {

		if (!value) {
			self.toggle('hidden', true);
			return;
		}

		self.html((text ? text : '') + '<pre><code class="{0}">{1}</code></pre>'.format(self.attr('data-type'), Tangular.helpers.encode(value)));
		hljs.highlightBlock(self.find('code').get(0));
		self.toggle('hidden', false);
	};
});

COMPONENT('dashboard', function() {

	var COUNT = 36 * 5;
	var self = this;
	var drag = {};
	var grid;
	var mode = 0;  // 0 == readonly, 1 == change
	var tresize;
	var template = '<div class="col-sm-2"><div class="grid">&nbsp;</div></div>';

	drag.x = 0;
	drag.y = 0;
	drag.is = false;
	drag.beg = null;

	self.readonly();
	self.blind();

	self.mode = function(type) {

		if (type === undefined) {
			if (mode === 0)
				type = 1;
			else
				type = 0;
		}

		mode = type;
		self.element.toggleClass('readonly', type === 0);
		return type;
	};

	self.getMode = function() {
		return mode;
	};

	self.make = function() {

		self.mode(mode);

		var builder = [];

		for (var i = 0; i < COUNT; i++)
			builder.push(template);

		self.html(builder);
		grid = self.find('.grid');

		setTimeout(function() {
			self.recalculate();
		}, 500);

		self.element.addClass('gridcontainer');

		self.element.on('mouseleave', function() {
			if (!mode || !drag.is)
				return;
			drag.is = false;
			grid.each(function() {
				$(this).toggleClass('grid-hover', false);
			});
		});

		self.element.on('click', '.grid', function(e) {
			if (!mode)
				return;
			self.resize();
		});

		self.element.on('click', '.widget-remove', function(e) {
			if (!mode)
				return;

			e.preventDefault();
			e.stopPropagation();

			var el = $(this);

			FIND('confirm').confirm(RESOURCE('confirm-remove-widget'), [RESOURCE('yes'), RESOURCE('no')], function(index) {
				if (index)
					return;
				var id = el.parent().attr('data-instance');
				var widget = WIDGETS_DASHBOARD.findItem('id', id);

				self.element.find('[data-id="{0}"]'.format(id)).removeClass('grid-disabled').removeAttr('data-id', '');

				if (widget) {
					WIDGET_REMOVE(id);
					WIDGETS_REFRESH_DATASOURCE(false);
				} else
					self.element.find('[data-instance="{0}"]'.format(id)).remove();

				dashboard.changed = true;
			});
		});

		self.element.on('click', '.widget,.widget-settings', function(e) {

			if (!mode)
				return;

			var el = $(this);

			if (el.hasClass('widget-settings'))
				el = el.parent();

			var instance = el.attr('data-instance');
			var id = el.attr('data-widget');
			var size = WIDGET_GETSIZE(el);
			var grid = size.rows + 'x' + size.cols;

			if (id) {
				WIDGETS_DASHBOARD.findItem('id', instance).configure();
				return;
			}

			var widgets = [];

			Object.keys(WIDGETS_DATABASE).forEach(function(name) {
				var widget = WIDGETS_DATABASE[name];
				var disabled = widget.sizes && widget.sizes.length && widget.sizes.indexOf(grid) === -1;
				widgets.push({ id: name, name: widget.name || name, preview: widget.preview, category: widget.category || 'Common', author: widget.author, sizes: widget.sizes, disabled: disabled });
			});

			IMPORTSET('formwidgets', 'common.form', 'widgets');
			SET('formwidgets.widgets', widgets);
			formwidgets.current = instance;
		});

		self.element.on('mouseup',function(e) {
			if (!drag.is)
				return;
			drag.is = false;
			grid.filter('.grid-hover').addClass('grid-disabled').removeClass('grid-hover').attr('data-id', GUID());
			self.resize();
		});

		self.element.on('mousedown mousemove', '.grid', function(e) {

			if (!mode)
				return;

			if (e.type === 'mousedown') {
				drag.is = true;
				drag.beg = this;
				drag.x = e.pageX;
				drag.y = e.pageY;
				e.preventDefault();
				e.stopPropagation();
				return;
			}

			if (!drag.is)
				return;

			var x = e.pageX - drag.x;
			var y = e.pageY - drag.y;

			var x1 = x >= 0 ? drag.beg.gridX : this.gridX;
			var y1 = y >= 0 ? drag.beg.gridY : this.gridY;
			var x2 = x >= 0 ? this.gridX : drag.beg.gridX;
			var y2 = y >= 0 ? this.gridY : drag.beg.gridY;

			if (!x1 && !x2 && !y1 && !y2) {
				drag.is = false;
				return;
			}

			grid.each(function() {

				if (!drag.is)
					return;

				var el = $(this);
				var is = (this.gridX >= x1 && this.gridX <= x2) && (this.gridY >= y1 && this.gridY <= y2);

				if (is && el.hasClass('grid-disabled')) {
					drag.is = false;
					return;
				}

				el.toggleClass('grid-hover', is);
			});

			!drag.is && grid.filter('.grid-hover').removeClass('grid-hover');
		});

		$(window).on('resize', function() {
			self.resize();
		});
	};

	self.clear = function() {

		// Remove old
		self.element.find('[data-instance]').each(function() {
			var el = $(this);
			var id = el.attr('data-instance');
			self.element.find('[data-id="{0}"]'.format(id)).removeClass('grid-disabled').removeAttr('data-id', '');
			var widget = WIDGETS_DASHBOARD.findItem('id', id);
			if (widget)
				WIDGET_REMOVE(id);
			else
				self.element.find('[data-instance="{0}"]'.format(id)).remove();
		});

		WIDGETS_DASHBOARD = [];
		WIDGETS_REFRESH_DATASOURCE(true);

		return self;
	};

	self.create = function(id, x, y, width, height, cols, rows, w, h, device) {

		if (!cols)
			cols = 1;
		if (!rows)
			rows = 1;

		var widget = self.find('[data-instance="{0}"]'.format(id));
		var ratio = getDeviceRatio(device);
		var fontsize = ((cols * 10) + 40) / ratio.fontsizeratio;

		if (widget.length) {
			widget.removeClass('xs sm md lg cols-1 cols-2 cols-3 cols-4 cols-5 cols-6 rows-1 rows-2 rows-3 rows-4 rows-5 rows-6').addClass(device + ' cols-' + cols + ' rows-' + rows);
			widget.attr('data-size', 'x:{0},y:{1},w:{2},h:{3},cols:{4},rows:{5},width:{6},height:{7},ratio:1.1,fontsize:{8},percentageW:{9},percentageH:{10},ratioW:{11},ratioH:{12}'.format(x, y, width, height, cols, rows, w, h, fontsize, ((cols / 6) * 100) >> 0, ((rows / 6) * 100) >> 0, ratio.ratioW, ratio.ratioH));
			widget.find('.widget-container,.widget-body').css({ width: width, height: height, 'font-size': fontsize + '%' });
			widget.stop().animate({ left: x, top: y, width: width, height: height }, 200, function() {
				var obj = WIDGETS_DASHBOARD.findItem('id', id);
				if (!obj)
					return;
				var size = WIDGET_GETSIZE(widget);
				size.device = device;
				var is = !obj.size || obj.size.w !== size.w || obj.size.h !== size.h;
				if (is)
					obj.size = size;
				is && obj.resize && obj.resize(obj.size, obj.dimension());
			});

			return self;
		}

		self.append('<div data-instance="{0}" class="widget {7}" data-size="{5}" style="left:{1}px;top:{2}px;width:{3}px;height:{4}px;font-size:{6}%"><div class="widget-remove"><i class="fa fa-times-circle"></i></div><div class="widget-settings"><i class="fa fa-cogs"></i></div><div class="widget-container" style="width:{3}px;height:{4}px;font-size:{6}%"></div></div>'.format(id, x, y, width, height, 'x:{0},y:{1},w:{2},h:{3},cols:{4},rows:{5},width:{6},height:{7},ration:1.1,fontsize:{8},percentageW:{9},percentageH:{10},ratioW:{11},ratioH:{12}'.format(x, y, width, height, cols, rows, w, h, fontsize, ((cols / 6) * 100) >> 0, ((rows / 6) * 100) >> 0, ratio.ratioW, ratio.ratioH), fontsize, device + ' cols-' + cols + ' rows-' + rows));
		return self;
	};

	self.resize = function(callback) {

		var widgets = {};

		grid.addClass('visible');
		clearTimeout(tresize);

		tresize = setTimeout(function() {
			var current = WIDTH();
			self.recalculate();
			grid.each(function() {

				var id = this.getAttribute('data-id');
				if (!id)
					return;

				var o = widgets[id];

				if (!o)
					o = widgets[id] = { index: 0, id: id, rows: 0, cols: 0, w: 0, h: 0, ratio: 1.1 };

				var x = o.x;
				var y = o.y;
				var w = o.width;
				var h = o.height;

				if (o.index++) {
					x = Math.min(x, this.gridX);
					w = Math.max(w, this.gridX + this.gridW);
					y = Math.min(y, this.gridY);
					h = current === 'xs' ? this.gridH : Math.max(h, this.gridY + this.gridH);
					o.w = this.gridW;
					o.h = this.gridH;
				} else {
					x = this.gridX;
					w = this.gridX + this.gridW;
					y = this.gridY;
					h = this.gridY + this.gridH;
				}

				o.x = x;
				o.y = y;
				o.width = w;
				o.height = h;
			});

			Object.keys(widgets).forEach(function(id) {
				var o = widgets[id];
				var w = ((o.width - o.x) >> 0);
				var h = ((o.height - o.y) >> 0);
				self.create(id, (o.x >> 0) + 1, (o.y >> 0) + 1, w + 1, h + 1, w / o.w >> 0, h / o.h >> 0, o.w, o.h, current);
			});

			grid.removeClass('visible');
			$('.widget').each(function(index) {
				(function(el, index) {
					setTimeout(function() {
						el.addClass('widget-visible');
					}, index * 100);
				})($(this), index);
			});

			callback && callback();
		}, 200);
	};

	self.recalculate = function() {
		var size = getDeviceWidth(WIDTH());
		grid.each(function() {
			var el = $(this);
			var offset = el.offset();
			this.gridX = offset.left;
			this.gridY = offset.top;
			this.gridW = size.width;
			this.gridH = size.height;
			el.css('height', size.height);
		});
	};
});

function getDeviceRatio(type) {
	var obj = {};
	switch (type) {
		case 'lg':
			obj.ratioW = 1;
			obj.ratioH = 1;
			obj.fontsizeratio = 1;
			break;
		case 'md':
			obj.ratioW = 1.253;
			obj.ratioH = 1.398;
			obj.fontsizeratio = 1.1;
			break;
		case 'sm':
			obj.ratioW = 1.736;
			obj.ratioH = 1.744;
			obj.fontsizeratio = 1.2;
			break;
		case 'xs':
			obj.ratioW = 0.445;
			obj.ratioH = 0.446;
			obj.fontsizeratio = 1.2;
			break;
	}
	return obj;
}

function getDeviceWidth(type) {
	var obj = {};
	switch (type) {
		case 'lg':
			obj.width = 165;
			obj.height = 150;
			break;
		case 'md':
			obj.width = 131.66;
			obj.height = 107.25;
			break;
		case 'sm':
			obj.width = 95;
			obj.height = 86.36;
			break;
		case 'xs':
			obj.width = $(window).width() - 34;
			obj.height = obj.width / 1.1;
	}
	return obj;
}

COMPONENT('resource', function() {
	var self = this;

	self.readonly();
	self.blind();

	self.init = function() {
		window.RESOURCEDB = {};
		window.RESOURCE = function(name, def) {
			return RESOURCEDB[name] || def || name;
		};
	};

	self.make = function() {

		var w = window;
		var el = self.element.find('script');
		var dictionary = el.html();

		el.remove();

		dictionary.split('\n').forEach(function(line) {

			var clean = line.trim();
			if (clean.substring(0, 2) === '//')
				return;

			var index = clean.indexOf(':');
			if (index === -1)
				return;

			var key = clean.substring(0, index).trim();
			var value = clean.substring(index + 1).trim();

			w.RESOURCEDB[key] = value;
		});
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

		if (!options_selector || !options_attribute)
			return;

		KEYPRESS(function() {

			var elements = self.element.find(options_selector);

			if (!value) {
				elements.removeClass(options_class);
				return;
			}

			var search = value.toLowerCase().replace(/y/gi, 'i');

			elements.toArray().waitFor(function(item, next) {
				var el = $(item);
				var val = (el.attr(options_attribute) || '').toLowerCase().replace(/y/gi, 'i');
				el.toggleClass(options_class, val.indexOf(search) === -1);
				setTimeout(next, 5);
			});

		}, options_delay, 'search' + self.id);
	};
});

COMPONENT('tooltip', function() {

	var self = this;
	var container;
	var css = {};
	var anim = {};

	self.singleton();
	self.readonly();
	self.blind();

	self.make = function() {
		self.element.addClass('ui-tooltip hidden');
		self.html('<div></div>');
		container = $(self.find('div').get(0));
	};

	self.hide = function() {
		setTimeout2(self.id, function() {
			self.toggle('hidden', true);
		}, 100);
	};

	// show(el, body, width, offX, offY)
	// show(x, y, body, width)
	self.show = function() {

		clearTimeout2(self.id);

		if (typeof(arguments[0]) !== 'number') {
			var target = $(arguments[0]);
			var off = target.offset();
			body = arguments[1] || '';
			css.width = arguments[2] || 140;
			css.top = off.top + target.height() + (arguments[4] || 0);
			css.left = (off.left - ((css.width / 2) - (target.width() / 2))) + (arguments[3] || 0);
		} else {
			css.left = arguments[0] || 0;
			css.top = arguments[1] || 0;
			body = arguments[2] || '';
			css.width = arguments[3] || 140;
		}

		if (body.substring(0, 1) !== '<')
			body = '<div class="ui-tooltip-arrow"><span class="fa fa-caret-up"></span></div><div class="ui-tooltip-body">{0}</div>'.format(body);

		container.html(body);

		var el = self.element;
		var is = el.hasClass('hidden');

		if (is) {
			anim.top = css.top;
			css.top += 20;
			el.css(css).removeClass('hidden').animate(anim, 100);
		} else
			el.css(css);
	};
});

COMPONENT('notifications', function() {
	var self = this;
	var autoclosing;

	self.singleton();
	self.readonly();
	self.template = Tangular.compile('<div class="ui-notification" data-id="{{ id }}"{{ if callback }} style="cursor:pointer"{{ fi }}><i class="fa fa-times-circle"></i><div class="ui-notification-icon"><i class="fa {{ icon }}"></i></div><div class="ui-notification-message"><div class="ui-notification-datetime">{{ date | format(\'{0}\') }}</div>{{ message | raw }}</div></div>'.format(self.attr('data-date-format') || 'yyyy-MM-dd HH:mm'));
	self.items = {};

	self.make = function() {

		self.element.addClass('ui-notification-container');

		self.element.on('click', '.fa-times-circle', function() {
			var el = $(this).closest('.ui-notification');
			self.close(+el.attr('data-id'));
			clearTimeout(autoclosing);
			autoclosing = null;
			self.autoclose();
		});

		self.element.on('click', 'a,button', function() {
			e.stopPropagation();
		});

		self.element.on('click', '.ui-notification', function(e) {
			var el = $(this);
			var id = +el.attr('data-id');
			var obj = self.items[id];
			if (!obj || !obj.callback)
				return;
			obj.callback();
			self.close(id);
		});
	};

	self.close = function(id) {
		var obj = self.items[id];
		if (!obj)
			return;
		obj.callback = null;
		delete self.items[id];
		self.find('div[data-id="{0}"]'.format(id)).remove();
	};

	self.append = function(icon, message, date, callback) {
		if (icon && icon.substring(0, 3) !== 'fa-')
			icon = 'fa-' + icon;

		if (typeof(date) === 'function') {
			callback = date;
			date = null;
		}

		var obj = { id: Math.floor(Math.random() * 100000), icon: icon || 'fa-info-circle', message: message, date: date || new Date(), callback: callback };
		self.items[obj.id] = obj;
		self.element.append(self.template(obj));
		self.autoclose();
	};

	self.autoclose = function() {

		if (autoclosing)
			return self;

		autoclosing = setTimeout(function() {
			clearTimeout(autoclosing);
			autoclosing = null;
			var el = self.find('.ui-notification');
			el.length > 1 && self.autoclose();
			el.length && self.close(+el.eq(0).attr('data-id'));
		}, +self.attr('data-timeout') || 5000);
	};
});

