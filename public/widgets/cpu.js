WIDGET('CPU', function() {

	var self = this;
	var corescount = 0;
	var cores;
	var Ecpu;

	self.make = function(size) {
		self.center(false);
		self.toggle('cpu');
		self.html('<div class="header"><i class="fa fa-microchip"></i>CPU utilization</div><div class="info"><span>...</span><div>CPU utilization (all <b>...</b> cores)</div></div><div class="chart"></div>');
		self.recreate();
		Ecpu = self.find('.info').find('span');
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

		var grow = 0;
		var a = value.history[0];
		var b = value.history[1];

		if (a)
			a = a.cpu;
		if (b)
			b = b.cpu;

		grow = a > b ? 1 : a < b ? -1 : 0;
		Ecpu.html((grow === 1 ? '<i class="fa fa-long-arrow-up"></i>' : grow === -1 ? '<i class="fa fa-long-arrow-down"></i>' : '') + value.all.format(1, '', '.') + '%');

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
			div.css(css).html(size.fontsize > 60 && val > 10 ? (val.format(1, '', '.') + '%') : '');
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
	this.category = 'Server Monitoring';
	this.url = 'https://www.totaljs.com/dashboard/';
	this.preview = '/server/cpu.png';
	this.sizes = ['2x2', '3x3', '4x4', '5x5', '3x2'];
	this.type = ['cpu'];
});
