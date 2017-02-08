var COLORS = ['#ED5565', '#DA4453', '#FC6E51', '#E9573F', '#FFCE54', '#F6BB42', '#A0D468', '#8CC152', '#48CFAD', '#37BC9B', '#4FC1E9', '#3BAFDA', '#5D9CEC', '#4A89DC', '#AC92EC', '#967ADC', '#EC87C0', '#D770AD', '#F5F7FA', '#E6E9ED', '#CCD1D9', '#AAB2BD', '#656D78', '#434A54', '#000000'];

COMPONENT('click', function() {
	var self = this;

	self.readonly();

	self.click = function() {
		var value = self.attr('data-value');
		if (typeof(value) === 'string')
			self.set(self.parser(value));
		else
			self.get(self.attr('data-jc-path'))(self);
	};

	self.make = function() {
		self.event('click', self.click);
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
			is = EVALUATE(self.path, condition) ? true : false;
		else
			is = value ? true : false;
		self.toggle('hidden', !is);
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
			var arr = self.getArray();

			parent.remove();

			var index = arr.indexOf(value);
			if (index === -1)
				return;
			arr.splice(index, 1);
			skip = true;
			self.set(self.path, arr, 2);
			self.change(true);
		});

		self.getArray = function() {
			var arr = self.get();
			if (!arr)  {
				arr = [];
				self.set(arr);
			}
			return arr;
		};

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
				self.getArray().indexOf(value) === -1 && self.push(self.path, value, 2);
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
		self.classes('ui-message hidden');

		self.event('click', 'button', function() {
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
		self.classes('-ui-message-visible');
		timer && clearTimeout(timer);
		timer = setTimeout(function() {
			visible = false;
			self.classes('hidden');
		}, 1000);
	};

	self.content = function(cls, text, icon) {
		!is && self.html('<div><div class="ui-message-body"><span class="fa fa-warning"></span><div class="ui-center"></div></div><button>' + (self.attr('data-button') || 'Close') + '</button></div>');
		timer && clearTimeout(timer);
		visible = true;
		self.find('.ui-message-body').removeClass().addClass('ui-message-body ' + cls);
		self.find('.fa').removeClass().addClass('fa ' + icon);
		self.find('.ui-center').html(text);
		self.classes('-hidden');
		setTimeout(function() {
			self.classes('ui-message-visible');
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
		self.classes('ui-checkbox');
		self.html('<div><i class="fa fa-check"></i></div><span{1}>{0}</span>'.format(self.html(), isRequired ? ' class="ui-checkbox-label-required"' : ''));
		self.event('click', function() {
			self.dirty(false);
			self.getter(!self.get(), 2, true);
		});
	};

	self.setter = function(value) {
		self.toggle('ui-checkbox-checked', value ? true : false);
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
		container.toggleClass('ui-dropdown-invalid', invalid);
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
		increment && self.event('click', '.fa-caret-up,.fa-caret-down', function(e) {
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

	self.state = function(type, who) {
		if (!type)
			return;
		var invalid = self.isInvalid();
		if (invalid === self.$oldstate)
			return;
		self.$oldstate = invalid;
		container.toggleClass('ui-textbox-invalid', invalid);
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

		var height = self.attr('data-height');
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

COMPONENT('template', function() {
	var self = this;
	self.readonly();
	self.make = function(template) {

		if (template) {
			self.template = Tangular.compile(template);
			return;
		}

		var script = self.find('script');

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
		self.append('<ul class="ui-error hidden"></ul>');
		element = self.find('ul');
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
		if (r > 30)
			ui.css({ marginTop: (r - 15) + 'px' });
		else
			ui.css({ marginTop: '20px' });
	};

	self.make = function() {
		var width = self.attr('data-width') || '800px';
		var submit = self.attr('data-submit');
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

		self.find('button').on('click', function(e) {
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

		enter === 'true' && self.event('keydown', 'input', function(e) {
			e.keyCode === 13 && !self.find('button[name="submit"]').get(0).disabled && self.submit(hide);
		});
	};

	self.setter = function(value) {

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

		var el = self.find('input,select,textarea');
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

COMPONENT('repeater-group', function() {

	var self = this;
	var template_group;
	var group;

	self.readonly();

	self.make = function() {
		group = self.attr('data-group');
		self.find('script').each(function(index) {
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
			self.empty();
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

		self.html(builder);
	};
});

COMPONENT('calendar', function() {

	var self = this;
	var skip = false;
	var skipDay = false;
	var visible = false;
	var callback;

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
			visible && EMIT('reflow', self.name);
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

		old = value;

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

COMPONENT('tabmenu', function() {
	var self = this;
	self.readonly();
	self.make = function() {
		self.event('click', 'li', function() {
			var el = $(this);
			!el.hasClass('selected') && self.set(self.parser(el.attr('data-value')));
		});
	};
	self.setter = function(value) {
		self.find('.selected').removeClass('selected');
		self.find('li[data-value="' + value + '"]').addClass('selected');
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
			if (e.target.tagName !== 'DIV')
				return;
			var el = self.find('.ui-confirm-body');
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
		self.classes('-ui-confirm-visible');
		setTimeout2(self.id, function() {
			visible = false;
			self.classes('hidden');
		}, 1000);
	};

	self.content = function(cls, text) {
		!is && self.html('<div><div class="ui-confirm-body"></div></div>');
		visible = true;
		self.find('.ui-confirm-body').empty().append(text);
		self.classes('-hidden');
		setTimeout2(self.id, function() {
			self.classes('ui-confirm-visible');
		}, 5);
	};
});

COMPONENT('loading', function() {
	var self = this;
	var pointer;
	var mainmenu;

	self.readonly();
	self.singleton();

	self.make = function() {
		mainmenu = $('.mainmenu').find('.fa');
	};

	self.show = function() {
		clearTimeout(pointer);
		mainmenu.removeClass('fa-navicon').addClass('fa-spin fa-circle-o-notch');
		return self;
	};

	self.hide = function(timeout) {
		clearTimeout(pointer);
		pointer = setTimeout(function() {
			mainmenu.addClass('fa-navicon').removeClass('fa-spin fa-circle-o-notch');
		}, timeout || 100);
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
			return value.format(this.attr('data-jc-format'));
		if (!value)
			return value;
		return new Date(Date.parse(value)).format(this.attr('data-jc-format'));
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
			self.classes('hidden');
			return;
		}

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

		self.classes('-transparent hidden');
	};
});

COMPONENT('multioptions', function() {

	var self = this;
	var colors = COLORS;
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
		self.classes('ui-multioptions');
		self.event('click', '.multioptions-operation', function(e) {
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

		self.event('change', 'input', function() {
			var el = $(this);
			var type = el.attr('data-type');
			// @TODO: make validation
		});

		self.event('click', '.ui-moi-date', function(e) {
			e.stopPropagation();
		});

		self.event('focus', '.ui-moi-date', function(e) {
			var el = $(this);
			FIND('calendar').toggle(el, el.val().parseDate(), function(date) {
				el.val(date.format('yyyy-MM-dd'));
			});
		});
	};

	self.save = function() {
		var obj = self.get();
		var values = self.find('.ui-moi-save');

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

		self.event('click', '.fa-times', function() {
			var el = $(this);
			var parent = el.closest('.ui-dictionary-item');
			var inputs = parent.find('input');
			var obj = self.get();
			var key = inputs.get(0).value;
			parent.remove();
			delete obj[key];
			self.set(self.path, obj, 2);
		});

		self.event('change keypress', 'input', function(e) {

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

		value = JSON.stringify(typeof(value) === 'string' ? JSON.parse(value) : value, null, '  ');
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
	var template = '<div class="col-sm-2 hidden-xs"><div class="grid" data-indexer="{0}">&nbsp;</div></div>';

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
		self.toggle('readonly', type === 0);
		return type;
	};

	self.getMode = function() {
		return mode;
	};

	self.make = function() {

		self.mode(mode);

		var builder = [];

		for (var i = 0; i < COUNT; i++)
			builder.push(template.format(i));

		self.html(builder);
		grid = self.find('.grid');

		setTimeout(function() {
			self.recalculate();
		}, 500);

		self.classes('gridcontainer');

		self.event('mouseleave', function() {
			if (!mode || !drag.is)
				return;
			drag.is = false;
			grid.each(function() {
				$(this).toggleClass('grid-hover grid-can', false);
			});
		});

		self.event('click', '.grid', function(e) {
			mode && self.resize();
		});

		self.event('click', '.widget-remove', function(e) {
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

				self.find('[data-id="{0}"]'.format(id)).removeClass('grid-disabled').removeAttr('data-id', '');

				if (widget)
					WIDGET_REMOVE(id);
				else
					self.find('[data-instance="{0}"]'.format(id)).remove();

				dashboard.changed = true;
			});
		});

		self.event('click', '.widget-replace', function(e) {
			var el = $(this);
			var container = el.parent().parent();
			var size = WIDGET_GETSIZE(container);
			var grid = size.rows + 'x' + size.cols;
			var widgets = [];

			Object.keys(WIDGETS_DATABASE).forEach(function(name) {
				var widget = WIDGETS_DATABASE[name];
				var disabled = (widget.sizes && widget.sizes.length && widget.sizes.indexOf(grid) === -1) || (dashboard.current && dashboard.current.group !== widget.group);
				widgets.push({ id: name, name: widget.name || name, preview: widget.preview, category: widget.category || 'Common', author: widget.author, sizes: widget.sizes, disabled: disabled, group: widget.group });
			});

			IMPORTSET('formwidgets', 'common.form', 'widgets', 'form-widgets');
			SET('formwidgets.widgets', widgets);
			formwidgets.current = container.attr('data-instance');
		});

		self.event('click', '.widget-empty,.widget-settings', function(e) {

			if (!mode)
				return;

			var el = $(this);

			if (el.hasClass('widget-settings'))
				el = el.parent().parent();

			var instance = el.attr('data-instance');
			var id = el.attr('data-widget');

			if (id) {
				WIDGETS_DASHBOARD.findItem('id', instance).configure();
				return;
			}

			var size = WIDGET_GETSIZE(el);
			var grid = size.rows + 'x' + size.cols;
			var widgets = [];

			Object.keys(WIDGETS_DATABASE).forEach(function(name) {
				var widget = WIDGETS_DATABASE[name];
				var disabled = (widget.sizes && widget.sizes.length && widget.sizes.indexOf(grid) === -1) || (dashboard.current && dashboard.current.group !== widget.group);
				widgets.push({ id: name, name: widget.title || widget.name || name, preview: widget.preview, category: widget.category || 'Common', author: widget.author, sizes: widget.sizes, disabled: disabled, group: widget.group });
			});

			IMPORTSET('formwidgets', 'common.form', 'widgets', 'form-widgets');
			SET('formwidgets.widgets', widgets);
			formwidgets.current = instance;
		});

		self.event('mouseup touchend touchcancel',function(e) {
			if (!drag.is)
				return;
			drag.is = false;
			grid.filter('.grid-hover').addClass('grid-disabled').removeClass('grid-hover').attr('data-id', GUID());
			grid.filter('.grid-can').removeClass('grid-can');
			self.resize();
		});

		self.event('mousedown mousemove touchstart touchmove', function(e) {

			if (!mode || !e.target.classList.contains('grid'))
				return;

			var el = e.touches ? e.touches[0].target : e.target;

			if (e.type === 'mousedown' || e.type === 'touchstart') {

				drag.is = true;
				drag.beg = el;

				if (e.touches) {
					drag.x = e.touches[0].pageX;
					drag.y = e.touches[0].pageY;
				} else {
					drag.x = e.pageX;
					drag.y = e.pageY;
				}

				drag.size = getDeviceWidth(WIDTH());
				e.preventDefault();
				e.stopPropagation();
				return;
			}

			if (!drag.is)
				return;

			e.preventDefault();
			e.stopPropagation();

			var x = (e.touches ? e.touches[0].pageX : e.pageX);
			var y = (e.touches ? e.touches[0].pageY : e.pageY);
			var x1 = drag.beg.gridX;
			var y1 = drag.beg.gridY;
			var x2 = x;
			var y2 = y;

			var minX = 10000000;
			var maxX = 0;
			var minY = 10000000;
			var maxY = 0;

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
				!is && el.removeClass('grid-can');

				if (is) {
					minX = Math.min(minX, this.gridX >> 0);
					maxX = Math.max(maxX, this.gridX >> 0);
					minY = Math.min(minY, this.gridY >> 0);
					maxY = Math.max(maxY, this.gridY >> 0);
				}
			});

			var cols = ((maxX - minX) / drag.size.width >> 0) + 1;
			var rows = ((maxY - minY) / drag.size.height >> 0) + 1;

			if (drag.cols !== cols || drag.rows !== rows) {
				drag.cols = cols;
				drag.rows = rows;
				var key = rows + 'x' + cols;
				grid.filter('.grid-hover').toggleClass('grid-can', WIDGETS_DIMENSIONS[key] > 0);
			}

			!drag.is && grid.filter('.grid-hover').removeClass('grid-hover grid-can');
		});

		$(window).on('resize', function() {
			self.resize();
		});
	};

	self.clear = function() {

		// Remove old
		self.find('[data-instance]').each(function() {
			var el = $(this);
			var id = el.attr('data-instance');
			self.find('[data-id="{0}"]'.format(id)).removeClass('grid-disabled').removeAttr('data-id', '');
			var widget = WIDGETS_DASHBOARD.findItem('id', id);
			if (widget)
				WIDGET_REMOVE(id);
			else
				self.find('[data-instance="{0}"]'.format(id)).remove();
		});

		WIDGETS_DASHBOARD = [];
		return self;
	};

	self.create = function(id, x, y, width, height, cols, rows, w, h, device) {

		if (!cols)
			cols = 1;
		if (!rows)
			rows = 1;

		var widget = self.find('[data-instance="{0}"]'.format(id));
		var ratio = getDeviceRatio(device);

		if (cols === 1 || rows === 1)
			ratio.fontsizeratio += 0.25;

		var fontsizeW = ((cols * 10) + 40) / ratio.fontsizeratio;
		var fontsizeH = ((rows * 10) + 40) / ratio.fontsizeratio;
		var fontsize = rows > cols ? fontsizeW : fontsizeH;

		if (widget.length) {
			var css = { width: width, height: height };
			widget.removeClass('noxs xs sm md lg cols1 cols2 cols3 cols4 cols5 cols6 rows1 rows2 rows3 rows4 rows5 rows6 g1x1 g1x2 g1x3 g1x4 g1x5 g1x6 g2x1 g2x2 g2x3 g2x4 g2x5 g2x6 g3x1 g3x2 g3x3 g3x4 g3x5 g3x6 g4x1 g4x2 g4x3 g4x4 g4x5 g4x6 g5x1 g5x2 g5x3 g5x4 g5x5 g5x6 g6x1 g6x2 g6x3 g6x4 g6x5 g6x6 widget-empty').addClass(device + ' cols' + cols + ' rows' + rows + ' g' + rows + 'x' + cols + (device !== 'xs' ? ' noxs' : ''));
			widget.attr('data-size', 'x:{0},y:{1},w:{2},h:{3},cols:{4},rows:{5},width:{6},height:{7},ratio:1.1,fontsize:{8},percentageW:{9},percentageH:{10},ratioW:{11},ratioH:{12},fontsizeW:{13},fontsizeH:{14},fontsizeratio:{15}'.format(x, y, w, h, cols, rows, width, height, fontsize, ((cols / 6) * 100) >> 0, ((rows / 6) * 100) >> 0, ratio.ratioW, ratio.ratioH, fontsizeW, fontsizeH, ratio.fontsizeratio));
			css['font-size'] = fontsize + '%';
			widget.find('.widget-body').css(css);
			widget.find('.widget-container').css(css);
			widget.stop().animate({ left: x, top: y, width: width, height: height }, 200, function() {
				var obj = WIDGETS_DASHBOARD.findItem('id', id);
				if (!obj)
					return;
				var size = WIDGET_GETSIZE(widget);
				size.device = device;
				var is = !obj.size || obj.size.w !== size.w || obj.size.h !== size.h;
				if (is) {
					obj.size = size;
					obj.$resize(obj.size, obj.dimension());
				}
			});

			return self;
		}

		self.append('<div data-instance="{0}" class="widget widget-empty {7}" data-size="{5}" style="left:{1}px;top:{2}px;width:{3}px;height:{4}px;font-size:{6}%"><a href="javascript:void(0)" class="widget-remove"><i class="fa fa-times-circle"></i></a><div class="widget-buttons"><a href="javascript:void(0)" class="widget-replace"><i class="fa fa-retweet"></i></a><a href="javascript:void(0)" class="widget-settings"><i class="fa fa-cog"></i></a></div><div class="widget-loading widget-loading-show"></div><div class="widget-container" style="width:{3}px;height:{4}px;font-size:{6}%"></div></div>'.format(id, x, y, width, height, 'x:{0},y:{1},w:{2},h:{3},cols:{4},rows:{5},width:{6},height:{7},ratio:1.1,fontsize:{8},percentageW:{9},percentageH:{10},ratioW:{11},ratioH:{12},fontsizeW:{13},fontsizeH:{14},fontsizeratio:{15}'.format(x, y, w, h, cols, rows, width, height, fontsize, ((cols / 6) * 100) >> 0, ((rows / 6) * 100) >> 0, ratio.ratioW, ratio.ratioH, fontsizeW, fontsizeH, ratio.fontsizeratio), fontsize, device + ' cols' + cols + ' rows' + rows + ' g' + rows + 'x' + cols + (device !== 'xs' ? ' noxs' : '')));
		return self;
	};

	self.resize = function(callback) {

		var widgets = {};

		grid.addClass('visible');
		clearTimeout(tresize);

		tresize = setTimeout(function() {

			var current = WIDTH();
			var top = current === 'xs' ? 60 : 0;
			var topmax = 0;

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

				if (current === 'xs') {
					o.y = top;
					o.x = 20;
					top += h + 20;
				}

				topmax = Math.max(o.y + h + 1, topmax);

				var cols = w / o.w >> 0;
				self.create(id, (o.x >> 0) + 1, (o.y >> 0) + 1, w + 1 - 10, h + 1, cols, h / o.h >> 0, o.w, o.h, current);
			});

			grid.removeClass('visible');
			$('.widget').each(function(index) {
				(function(el, index) {
					setTimeout(function() {
						el.addClass('widget-visible');
					}, index * 50);
				})($(this), index);
			});


			if (!topmax)
				topmax = $(window).height();

			self.css({ height: topmax - 30 });
			callback && callback();
		}, 200);
	};

	self.recalculate = function() {
		var device = WIDTH();
		var size = getDeviceWidth(device);
		grid.each(function() {
			var el = $(this);
			var offset = el.offset();
			if (offset.top < 0)
				offset.top = 0;
			this.gridX = device === 'xs' ? 0 : offset.left;
			this.gridY = device === 'xs' ? 0 : offset.top;
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
			obj.fontsizeratio = 0.6;
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
		var el = self.find('script');
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

	self.setter = function(value, path, type) {

		if (!options_selector || !options_attribute || value == null)
			return;

		KEYPRESS(function() {

			var elements = self.find(options_selector);

			if (!value) {
				elements.removeClass(options_class);
				return;
			}

			var search = value.toLowerCase().replace(/y/gi, 'i');
			var hide = [];
			var show = [];

			elements.toArray().waitFor(function(item, next) {
				var el = $(item);
				var val = (el.attr(options_attribute) || '').toLowerCase().replace(/y/gi, 'i');
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

COMPONENT('tooltip', function() {

	var self = this;
	var container;
	var css = {};
	var anim = {};

	self.singleton();
	self.readonly();
	self.blind();

	self.make = function() {
		self.classes('ui-tooltip hidden');
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

		self.classes('ui-notification-container');

		self.event('click', '.fa-times-circle', function() {
			var el = $(this).closest('.ui-notification');
			self.close(+el.attr('data-id'));
			clearTimeout(autoclosing);
			autoclosing = null;
			self.autoclose();
		});

		self.event('click', 'a,button', function() {
			e.stopPropagation();
		});

		self.event('click', '.ui-notification', function(e) {
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
		self.append(self.template(obj));
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

COMPONENT('empty', function() {

	var self = this;

	self.readonly();

	self.make = function() {
		self.classes('ui-empty');
	};

	self.setter = function(value) {
		self.toggle('hidden', value && value.length ? true : false);
	};
});

COMPONENT('themeselector', function() {

	var self = this;
	var colors = ['#F0F0F0', '#8CC152', '#3BAFDA', '#DA4453', '#F6BB42', '#D770AD', '#37BC9B', '#967ADC', '#303030'];
	var themes = ['', 'theme-green', 'theme-blue', 'theme-red', 'theme-yellow', 'theme-pink', 'theme-mint', 'theme-lavender', 'theme-dark'];
	var selected;
	var list;
	var required = self.attr('data-required') === 'true';

	self.validate = function(value) {
		return colors.indexOf(value) === -1
	};

	if (!required)
		self.noValid();

	self.make = function() {
		var builder = [];
		self.toggle('ui-themeselector');
		builder.push('<ul>');
		for (var i = 0, length = colors.length; i < length; i++)
			builder.push('<li data-index="{0}" style="background-color:{1}"></li>'.format(i, colors[i]));
		builder.push('</ul>');

		self.html(builder.join(''));
		list = self.find('li');

		self.event('click', 'li', function(e) {
			var li = $(this);
			self.change(true);
			self.set(themes[parseInt(li.attr('data-index'))]);
		});
	};

	self.setter = function(value) {
		var index = themes.indexOf(value || '');
		if (selected)
			selected.removeClass('selected');
		if (index === -1)
			return;
		selected = list.eq(index);
		selected.addClass('selected');
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

	self.autobind = function(path, value) {
		var mapper = keys[path];
		var template = {};
		mapper && mapper.forEach(function(item) {
			var value = self.get(item.path);
			template.value = value;
			item.classes && classes(item.element, item.classes(value));
			item.visible && item.element.toggleClass('hidden', item.visible(value) ? false : true);
			item.html && item.element.html(item.html(value));
			item.template && item.element.html(item.template(template));
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
		self.find('[data-binder]').each(function() {

			var el = $(this);
			var path = el.attr('data-binder');
			var arr = path.split('.');
			var p = '';

			var classes = el.attr('data-binder-class');
			var html = el.attr('data-binder-html');
			var visible = el.attr('data-binder-visible');
			var obj = el.data('data-binder');

			keys_unique[path] = true;

			if (!obj) {
				obj = {};
				obj.path = path;
				obj.element = el;
				obj.classes = classes ? FN(decode(classes)) : undefined;
				obj.html = html ? FN(decode(html)) : undefined;
				obj.visible = visible ? FN(decode(visible)) : undefined;

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

				el.data('data-binder', obj);
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

COMPONENT('contextmenu', function() {
	var self = this;
	var $window = $(window);
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
			self.callback && self.callback($(this).attr('data-value'), $(self.target));
			self.hide();
			e.preventDefault();
			e.stopPropagation();
		});

		$(document).on('touchstart mousedown', function(e) {
			FIND('contextmenu').hide();
		});
	};

	self.show = function(orientation, target, items, callback, offsetX) {

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
			builder.push(self.template(item));
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
				arrow.css({ left: '107px' });
				break;
		}

		var options = { left: orientation === 'center' ? (Math.ceil((offset.left - self.element.width() / 2) + (target.innerWidth() / 2)) + (offsetX || 0)) : orientation === 'left' ? (offset.left - 8 + (offsetX || 0)) : ((offset.left - self.element.width()) + target.innerWidth() + (offsetX || 0)), top: offset.top + target.innerHeight() + 10 };
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
});
