WIDGET('Disk', function() {
	var self = this;
	var Eprogress, Etotal, Efree, Eused, Echart, g, svg;

	self.make = function(size) {
		self.toggle('disk');
		self.center(false);
		self.html('<div class="header"><i class="fa fa-hdd-o"></i>Disk</div><div class="info"><div><b><i class="fa fa-circle silver"></i>Total</b><span data-name="total">...</span></div><div><b><i class="fa fa-circle green"></i>Free</b><span data-name="free">...</span></div><div><b><i class="fa fa-circle red"></i>Used</b><span data-name="used">...</span></div></div></div><div class="progress"><div></div></div><div class="chart"><svg width="100%" height="100%"></svg></div>');
		Eprogress = self.find('.progress').find('div');
		Etotal = self.find('[data-name="total"]');
		Efree = self.find('[data-name="free"]');
		Eused = self.find('[data-name="used"]');
		Echart = self.find('.chart');
		svg = d3.select(Echart.find('svg').get(0));
		g = svg.append('g');
	};

	self.render = function(value, size, counter) {
		var p = ((value.used / value.total) * 100).floor(1);
		Etotal.html(value.total.filesize());
		Efree.html(value.free.filesize());
		Eused.html(value.used.filesize());
		Eprogress.animate({ width: p + '%' }, 300);
		Eprogress.html(p > 20 ? p + '%' : '');

		if (NOTMODIFIED(self.id, value.history))
			return;

		var max = value.total;
		var history = [];

		value.history.forEach(function(item) {
			if (item.disk) {
				max = Math.max(item.disk, max);
				history.push(item);
			}
		});

		for (var i = history.length; i < 24; i++)
			history.push({ disk: 0 });

		var width = Echart.width();
		var height = Echart.height();

		var x = d3.scaleBand().rangeRound([0, width]).padding(0.2);
		var y = d3.scaleLinear().rangeRound([height, 0]);

		x.domain(d3.range(24));
		y.domain([0, max]);

		g.selectAll('rect').remove();
		g.selectAll('.data').data(history).enter().append('rect').attr('x', function(d, i) { return x(i); }).attr('y', function(d) { return y(d.disk); }).attr('width', x.bandwidth()).attr('height', function(d) { var tmp = height - y(d.disk); return tmp < 0 ? 0 : tmp; });
	};

	self.resize = function(size) {
		self.refresh();
	};

}, function(config, inject) {

	this.example = { free: 3498393939, total: 6996787878, used: 3498393939, history: [{ disk: 3498393939 }, { disk: 3198393939 }, { disk: 2498393939 }] };
	this.preview = '/widgets/disk.png';
	this.author = 'Peter Širka';
	this.title = 'Disk';
	this.category = 'Monitoring';
	this.url = 'https://www.totaljs.com/dashboard/';
	this.type = ['disk'];
	this.sizes = ['2x2', '3x3', '4x4', '5x5'];
});