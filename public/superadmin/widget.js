function gauge(name, element, radius, width, height, bg) {

	var el = d3.select(element.get(0));

	el.selectAll('svg').remove();

	var svgProgress = el.append('svg');
	svgProgress.attr('width', width);
	svgProgress.attr('height', height - 20);
	svgProgress.style('position', 'absolute');

	var svgPointer = el.append('svg');
	svgPointer.attr('width', width);
	svgPointer.attr('height', height);
	svgPointer.style('position', 'absolute');

	height -= 20;
	var r = Math.min(width, height) / 2;

	var arc = d3.arc().innerRadius(height - radius).outerRadius(height).startAngle(0);
	var g = svgProgress.append('g').attr('transform', 'translate({0},{1})'.format(width / 2, height));

	g.append('path').attr('transform', 'rotate(-90)').datum({ endAngle: 0.5 * TAU }).style('fill', bg || '#E0E0E0').attr('d', arc);

	var gprogress = g.append('g');
	var progress = gprogress.append('path').attr('transform', 'rotate(-270)').datum({ endAngle: 0.5 * TAU }).attr('d', arc);

	var gpointer = svgPointer.append('g').attr('transform', 'translate({0},{1})'.format(width / 2, height));
	var pointer = gpointer.append('g').attr('transform', 'rotate(90)');

	pointer.append('circle')
		.attr('r', 10)
		.style('fill', 'black');

	pointer.append('path')
		.attr('d', 'M-10 0 L0 {0} L10 0 Z'.format(height));

	return function(value, color) {
		var value = ((180 / 100) * value >> 0);
		gprogress.transition().duration(500).attr('transform', 'rotate({0})'.format(value));
		gpointer.transition().duration(500).attr('transform', 'translate({0},{1}) rotate({2})'.format(width / 2, height, value));
		color && progress.style('fill', color);
	};
}

WIDGET('CPU', function() {

	var self = this;
	var colors = ['#FFCE54', '#F6BB42', '#FC6E51', '#E9573F', '#DA4453'];
	var sizes = {};
	var cpu;
	var cls = '';

	// Elements
	var label;
	var svg;
	var percentage;
	var servername;

	self.dimension('sm', '1x1', 'width:95,height:55,radius:12');
	self.dimension('sm', '2x2', 'width:190,height:100,radius:25');
	self.dimension('sm', '3x3', 'width:284,height:140,radius:35');

	self.dimension('md', '1x1', 'width:120,height:70,radius:15');
	self.dimension('md', '2x2', 'width:230,height:120,radius:30');
	self.dimension('md', '3x3', 'width:350,height:170,radius:40');

	self.dimension('lg', '1x1', 'width:170,height:90,radius:20');
	self.dimension('lg', '2x2', 'width:330,height:170,radius:40');
	self.dimension('lg', '3x3', 'width:500,height:240,radius:70');

	self.dimension('xs', '1x1', 'width:170,height:90,radius:20');
	self.dimension('xs', '2x2', 'width:330,height:170,radius:40');
	self.dimension('xs', '3x3', 'width:500,height:240,radius:70');

	self.make = function(size) {
		self.center(false);
		self.toggle('superadmin-cpu');
		self.append('<div class="servername"></div><div class="svg"></div><div class="label">...</div><div class="percentage">...</div>');
		svg = self.find('.svg');
		percentage = self.find('.percentage');
		servername = self.find('.servername');
		label = self.find('.label');
		self.resize(size, self.dimension());
	};

	self.resize = function(size, dimension) {
		cls && self.toggle(cls, false);
		cls = 'superadmin-cpu-' + self.getDimension();
		self.toggle(cls, true);
		cpu = gauge('cpu', svg, dimension.radius, dimension.width, dimension.height);
	};

	self.render = function(value) {
		if (!cpu || !value)
			return;
		percentage.html(value.cpu);
		value = value.cpu.parseFloat();
		var color = value < 20 ? 0 : value < 40 ? 1 : value < 60 ? 2 : value < 80 ? 3 : 4;
		cpu(value, colors[color]);
	};

	self.state = function() {
		label.html(self.rename('CPU usage'));
		servername.html(self.options.server);
	};

}, function(config, inject) {

	this.example = { cpu: '13.1%' };
	this.preview = ''; // URL TO preview 200x150
	this.author = 'Peter Širka';
	this.title = 'CPU';
	this.category = 'SuperAdmin';
	this.sizes = ['1x1', '2x2', '3x3'];

	config('server', 'Server name', 'My server', 'String');
	inject('/superadmin/widget.css');
});

WIDGET('Memory', function() {

	var self = this;
	var divs;
	var device;

	self.make = function(size) {
		device = size.device;
		self.center(false);
		self.toggle('superadmin-memory superadmin-memory-' + device);
		self.append('<div class="servername"></div><div class="progress"><div class="free" style="width:50%">&nbsp;</div><div class="used" style="width:50%">&nbsp;</div></div><div class="total"></div>');
		divs = self.find('.progress').find('div');
	};

	self.render = function(value) {

		var used = (value.memused / value.memtotal) * 100;
		var free = 100 - used;

		divs.each(function(index) {
			var el = $(this);
			var text = index ? self.rename('Used') + '<b>{0} MB</b>'.format(value.memused.format(0)) : self.rename('Free') + '<b>{0} MB</b>'.format((value.memtotal - value.memused).format(0));
			var width = (index ? used : free);
			el.css({ 'background-color': index ? '#DA4453' : '#8CC152' }).animate({ width: width.toFixed(2) + '%' }, 300).html(width > 15 ? text : '');
		});

		self.find('.total').html(self.rename('Total memory') + ': <b>{0} MB</b>'.format(value.memtotal.format(0)));
	};

	self.resize = function(size) {
		if (device === size.device)
			return;
		self.toggle('superadmin-memory-' + device, false);
		device = size.device;
		self.toggle('superadmin-memory-' + device, true);
	};

	self.state = function() {
		self.find('.servername').html(self.options.server);
	};

}, function(config, inject) {
	this.example = { memfree: 226, memtotal: 2459, memused: 2232 };
	this.preview = ''; // URL TO preview 200x150
	this.author = 'Peter Širka';
	this.title = 'Memory';
	this.category = 'SuperAdmin';
	this.sizes = ['1x2', '1x3', '1x4', '1x5', '1x6'];
	config('server', 'Server name', 'My server', 'String');
	inject('/superadmin/widget.css');
});

WIDGET('HDD', function() {

	var self = this;
	var divs;
	var device;

	self.make = function(size) {
		device = size.device;
		self.center(false);
		self.toggle('superadmin-hdd superadmin-hdd-' + device);
		self.append('<div class="servername"></div><div class="progress"><div class="free" style="width:33.3%">&nbsp;</div><div class="used" style="width:33.3%">&nbsp;</div><div class="total" style="width:33.3%">&nbsp;</div></div><div class="total"></div>');
		divs = self.find('.progress').find('div');
	};

	self.render = function(value) {

		value.hddfree = value.hddfree.parseInt();
		value.hddused = value.hddused.parseInt();
		value.hddtotal = value.hddtotal.parseInt();

		var used = (value.hddused / value.hddtotal) * 100 >> 0;
		var free = (value.hddfree / value.hddtotal) * 100 >> 0;
		var total = 100 - (used + free);

		divs.each(function(index) {
			var el = $(this);
			var color = '';
			var text = '';
			var width = total;

			switch (index) {
				case 0:
					// free
					text = self.rename('Free') + '<b>{0} GB</b>'.format(value.hddfree.format(0));
					color = '#8CC152';
					width = free;
					break;
				case 1:
					// used
					text = self.rename('Used') + '<b>{0} GB</b>'.format(value.hddused.format(0));
					color = '#DA4453';
					width = used;
					break;
				case 2:
					// total
					text = self.rename('Total') + '<b>{0} GB</b>'.format(value.hddtotal.format(0));
					color = '#FFFFFF';
					break;
			}

			el.css({ 'background-color': color }).animate({ width: width.toFixed(2) + '%' }, 300).html(width > 10 ? text : '');
		});
	};

	self.resize = function(size) {
		if (device === size.device)
			return;
		self.toggle('superadmin-hdd-' + device, false);
		device = size.device;
		self.toggle('superadmin-hdd-' + device, true);
	};

	self.state = function() {
		self.find('.servername').html(self.options.server);
	};

}, function(config, inject) {
	this.example = { hddfree: '30 GB', hddtotal: '100 GB', hddused: '15.8 GB' };
	this.preview = ''; // URL TO preview 200x150
	this.author = 'Peter Širka';
	this.title = 'HDD';
	this.category = 'SuperAdmin';
	this.sizes = ['1x2', '1x3', '1x4', '1x5', '1x6'];
	config('server', 'Server name', 'My server', 'String');
	inject('/superadmin/widget.css');
});