WIDGET('Memory', function() {

	var self = this;
	var g, gHistory;
	var Ehistory, Etrend;

	self.make = function(size) {
		self.center(false);
		self.toggle('memory');
		self.html('<div class="header"><i class="fa fa-braille"></i>Memory</div><div class="trend"><i class="fa"></i></div><div class="chart"><svg height="100%" width="100%"></svg></div><div class="chart-history"><svg height="100%" width="100%"></svg></div><div class="info"><div><b><i class="fa fa-circle"></i>Total</b><span data-name="total">...</span></div><div><b><i class="fa fa-circle green"></i>Free</b><span data-name="free">...</span></div><div><b><i class="fa fa-circle red"></i>Used</b><span data-name="used">...</span></div></div></div>');
		g = d3.select(self.find('.chart').find('svg').get(0)).append('g');
		Etrend = self.find('.trend').find('.fa');
		Ehistory = self.find('.chart-history');
		gHistory = d3.select(self.find('.chart-history').find('svg').get(0)).append('g');
	};

	self.render = function(value, size, counter, type) {

		if (counter)
			return;

		var data = [value.used, value.free];
		var height = size.rows === 1 && size.cols === 1 && size.device !== 'xs' ? size.height.inc('-10%') : size.height.inc('-42%'); // 68% is the chart height
		var radius = (height / 2) - 10;
		var radius_padding = radius.inc('-70%');
		var arc = d3.arc().innerRadius(radius - radius_padding).outerRadius(radius);
		var pie = d3.pie().padAngle(.05);

		g.attr('transform', 'translate({0},{1})'.format(size.width / 2, height / 2));
		g.selectAll('path').remove();
		g.selectAll('path').data(pie(data)).enter().append('path').style('fill', function(d, i) {
			return i ? '#68B25B' : '#D63B32';
		}).attr('d', arc);

		self.find('[data-name]').each(function() {
			var el = $(this);
			el.html(value[el.attr('data-name')].filesize());
		});

		var grow = 0;
		var a = value.history[0];
		var b = value.history[1];

		if (a)
			a = a.memory;
		if (b)
			b = b.memory;

		grow = a > b ? 1 : a < b ? -1 : 0;
		Etrend.toggleClass('fa-long-arrow-up', grow === 1).toggleClass('fa-long-arrow-down', grow === -1);

		if (NOTMODIFIED(self.id, value.history))
			return;

		var width = size.width;
		height = Ehistory.height();

		var max = value.total;
		var history = [];

		value.history.reverse();
		var tmp = value.history.take(15);
		tmp.reverse();

		tmp.forEach(function(item) {
			if (item.memory) {
				max = Math.max(item.memory, max);
				history.push(item);
			}
		});

		for (var i = history.length; i < 15; i++)
			history.push({ memory: 0 });

		var x = d3.scaleBand().rangeRound([0, width]).padding(0.2);
		var y = d3.scaleLinear().rangeRound([height, 0]);

		x.domain(d3.range(15));
		y.domain([0, max]);

		gHistory.selectAll('rect').remove();
		gHistory.selectAll('.data').data(history).enter().append('rect').attr('x', function(d, i) { return x(i); }).attr('y', function(d) { return y(d.memory); }).attr('width', x.bandwidth()).attr('height', function(d) { return height - y(d.memory); });

	};

	self.resize = function(size) {
		self.refresh();
	};

	self.state = function(type, changes) {
		type && self.refresh();
	};

}, function(config, inject) {
	this.example = { free: 2150699008, total: 3895230464, used: 1744531456, history: [] };
	this.author = 'Peter Širka';
	this.title = 'Memory';
	this.category = 'Monitoring';
	this.url = 'https://www.totaljs.com/dashboard/';
	this.preview = '/widgets/memory.png';
	this.sizes = ['1x1', '2x2', '3x3', '4x4', '5x5'];
	this.type = ['memory'];
});