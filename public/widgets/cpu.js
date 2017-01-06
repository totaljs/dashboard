WIDGET('CPU', function() {

	var self = this;
	var corescount = 0;
	var cores;
	var Ecpu, Eavg;

	self.make = function(size) {
		self.center(false);
		self.toggle('cpu');
		self.html('<div class="header"><i class="fa fa-microchip"></i>CPU utilization</div><div class="avg"></div><div class="info"><span>...</span><div>CPU utilization (all <b>...</b> cores)</div></div><div class="chart"></div>');
		self.recreate();
		Ecpu = self.find('.info').find('span');
		Eavg = self.find('.avg');
	};

	self.recreate = function() {
		var builder = [];
		var width = (100 / corescount).format(3, '', '.');
		for (var i = 0; i < corescount; i++)
			builder.push('<div class="corecontainer" style="width:{0}%"><div class="core"><div></div></div></div>'.format(width));
		self.find('.chart').html(builder.join(''));
		cores = self.find('.core');
	};

	self.render = function(value, size, counter, type) {

		var tmp = value.cores.length;
		if (tmp !== corescount) {
			corescount = tmp;
			self.recreate();
			self.find('b').html(corescount);
		}

		var css = SINGLETON('cpu-css');
		css['background-color'] = 'white';

		Eavg.html(value.avg);

		var grow = 0;
		var a = value.history[0];
		var b = value.history[1];
		var bar = (100 / corescount);

		if (a)
			a = a.cpu;
		if (b)
			b = b.cpu;

		grow = a > b ? 1 : a < b ? -1 : 0;
		Ecpu.html((grow === 1 ? '<i class="fa fa-long-arrow-up"></i>' : grow === -1 ? '<i class="fa fa-long-arrow-down"></i>' : '') + value.all.format(1, '', '.') + '%');

		if (size.device !== 'xs' && size.rows === 1 && size.cols === 1)
			return;

		cores.each(function(index) {
			var el = $(this);
			var val = value.cores[index];
			css['background-color'] = val > 75 ? '#DA4453' : val > 50 ? '#E9573F' : val > 35 ? '#F6BB42' : '#8CC152';
			var div = el.find('div');
			if (counter) {
				div.animate({ height: val + '%' }, 300);
				delete css.height;
			} else
				css.height = val + '%';
			div.css(css).html((size.rows === 1 || size.fontsize > 60) && val > 10 && bar > 10 ? (val.format(1, '', '.') + '%') : '');
		});
	};

	self.resize = function(size) {
		self.refresh();
	};

	self.state = function(type, changes) {
		type && self.refresh();
	};

}, function(config, inject) {
	this.example = { all: 59, cores: [32, 20, 38, 15, 18, 12, 3, 8, 19], hours: [{ created: new Date(), value: 29 }, { created: new Date(), value: 39 }] };
	this.author = 'Peter Širka';
	this.title = 'CPU';
	this.category = 'Monitoring';
	this.url = 'https://www.totaljs.com/dashboard/';
	this.preview = '/widgets/cpu.png';
	this.sizes = ['1x1', '1x2', '1x3', '1x4', '1x5', '1x6', '2x2', '3x3', '4x4', '5x5', '3x2', '2x3', '2x4', '2x5', '2x6'];
	this.type = ['cpu'];
});
