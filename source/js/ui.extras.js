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
					// Clicks won't work if the code below is not commented
					// e.preventDefault();
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
					
					// Clicks won't work if the code below is not commented
					//e.preventDefault();
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
		obj.pixelsh = obj.pixels + 0.5;
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
		widget.mouse_offset = { col: Math.floor((e.pageX - offset.left) / size.pixels), row: Math.floor((e.pageY - offset.top) / size.pixelsh)};
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
			var mouse_row = Math.floor((e.pageY - offset.top) / size.pixelsh);
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
			widget.element.animate({ left: col * size.pixels, top: row * size.pixelsh }, 15);
			widget.index = (row * 24) + col;
			if (item)
				item[common.device === 'desktop' ? 'index' : 'mindex'] = widget.index;
		}

		if (widget.resizing) {
			var resize_cols = Math.floor((e.pageX - offset.left) / size.pixelsh) - widget.mouse_offset.col - widget.origin.pos.col;
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
			widget.element.animate({ width: widget.size.cols * size.pixels, height: widget.size.rows * size.pixelsh }, 15);
			if (item) {
				item[common.device === 'desktop' ? 'cols' : 'mcols'] = widget.size.cols;
				item[common.device === 'desktop' ? 'rows' : 'mrows'] = widget.size.rows;
				var instance = widget.element.find('figure')[0].$widget;
				var padding = instance.size.padding;
				instance.size = { cols: widget.size.cols, rows: widget.size.rows, height: (size.pixelsh * widget.size.rows) - (padding * 2), width: (size.pixels * widget.size.cols) - (padding * 2), padding: padding, pixels: size.pixels };
				instance.emit('resize', instance.size);
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
		var fy = y > move.y ? move.y : y - size.pixelsh;
		var tx = x > move.x ? x : move.x + size.pixels;
		var ty = y > move.y ? y : move.y + size.pixelsh;
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
		html = html.format(pos.col * size.pixels, pos.row * size.pixelsh, w[key + 'cols'] * size.pixels, w[key + 'rows'] * size.pixelsh, grid, w.tab, w.id, w.app ? '<figure data-name="{0}"></figure>'.format(w.app) : '');
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
			opt.height = opt[common.device === 'desktop' ? 'rows' : 'mrows'] * size.pixelsh;

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
		obj.y = row * size.pixelsh;
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

		arr.wait(function(item, next) {
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
			arr.wait(function(item, next) {
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

			cells.css('height', size.pixelsh + 'px');

			widgets.find('.widget').each(function() {
				var el = $(this);
				var grid = self.grid(el.attrd('grid').split(','));
				var cols = grid.cols;
				var rows = grid.rows;
				var index = grid.index;
				var pos = self.getPosition(index);

				css.left = pos.col * size.pixels + 'px';
				css.top = pos.row * size.pixelsh + 'px';
				css.width = cols * size.pixels + 'px';
				css.height = rows * size.pixelsh + 'px';
				el.css(css);

				var app = el.find('[data-name]')[0];
				if (app) {
					var opt = {};
					opt.cols = cols;
					opt.rows = rows;
					opt.device = device;
					opt.width = cols * size.pixels;
					opt.height = rows * size.pixelsh;
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

COMPONENT('controls', function(self) {

	var is = false;
	var timeout;
	var container;

	self.template = Tangular.compile('<div data-value="{{ index }}" class="item{{ if selected }} selected{{ fi }}{{ if disabled }} disabled{{ fi }}"><i class="fa {{ icon }}"></i><span>{{ name | raw }}</span></div>');
	self.singleton();
	self.readonly();
	self.callback = null;

	self.make = function() {

		self.aclass('ui-controls');
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

COMPONENT('devicetype', function(self, config) {

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