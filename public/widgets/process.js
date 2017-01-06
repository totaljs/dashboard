WIDGET('Process', function() {
	var self = this;
	var Eprogress, Ecpu, Ememory, Echart, g, svg, Etitle, Efiles, Euptime, Ethreads;

	self.make = function(size) {
		self.toggle('process');
		self.center(false);
		self.html('<div class="header"><i class="fa fa-circle-o blinking"></i>Process: <span></span></div><div class="info"><div><b><i class="fa fa-microchip"></i>CPU</b><span data-name="cpu">...</span></div><div><b><i class="fa fa-braille"></i>RSS</b><span data-name="memory">...</span></div><div><b><i class="fa fa-folder-o"></i>Open Files</b><span data-name="files">...</span></div></div></div></div><div class="center"><div class="threads">Count of all threads: <span>...</span></div></div><div class="uptime"><i class="fa fa-clock-o"></i><span>...</span></div><div class="progress"><div></div></div><div class="chart"><svg width="100%" height="100%"></svg></div>');
		Eprogress = self.find('.progress').find('div');
		Ecpu = self.find('[data-name="cpu"]');
		Ememory = self.find('[data-name="memory"]');
		Efiles = self.find('[data-name="files"]');
		Echart = self.find('.chart');
		Etitle = self.find('.header').find('span');
		Euptime = self.find('.uptime').find('span');
		Ethreads = self.find('.threads').find('span');
		svg = d3.select(Echart.find('svg').get(0));
		g = svg.append('g');
	};

	self.render = function(value, size, counter) {

		if (value.type !== self.options.find)
			return;

		Etitle.html(value.type);
		Ecpu.html((value.cpu || 0) + '%');
		Ememory.html((value.memory || 0).filesize());
		Efiles.html((value.files || 0) + 'x');
		Ethreads.html((value.count || 0) + 'x');
		Euptime.html((value.uptime || '...').replace('-', ' days '));

		var p = value.cpu;
		Eprogress.animate({ width: p + '%' }, 300);
		Eprogress.css('background-color', p < 20 ? '#A0D468' : p < 40 ? '#F6BB42' : p < 60 ? '#FC6E51' : 'DA4453');

		var builder = [];
		var max = 1000;
		var history = [];
		var key = value.type + '_memory';

		value.history.forEach(function(item) {
			if (item[key]) {
				max = Math.max(item[key], max);
				history.push(item);
			}
		});

		for (var i = history.length; i < 24; i++) {
			var obj = {};
			obj[key] = 0;
			history.push(obj);
		}

		var width = Echart.width();
		var height = Echart.height();

		var x = d3.scaleBand().rangeRound([0, width]).padding(0.2);
		var y = d3.scaleLinear().rangeRound([height, 0]);

		x.domain(d3.range(24));
		y.domain([0, max]);

		g.selectAll('rect').remove();
		g.selectAll('.data').data(history).enter().append('rect').attr('x', function(d, i) { return x(i); }).attr('y', function(d) { return y(d[key]); }).attr('width', x.bandwidth()).attr('height', function(d) { var tmp = height - y(d[key]); return tmp < 0 ? 0 : tmp; });
	};

	self.resize = function(size) {
		self.refresh();
	};

}, function(config) {
	this.example = { type: 'nginx', cpu: 7.1, memory: 39641088, files: 393, uptime: '32:22', history: [{ nginx_cpu: 14.3, nginx_memory: 39641088 }, { nginx_cpu: 20, nginx_memory: 59641088 }, { nginx_cpu: 7, nginx_memory: 29641088 }] };
	this.preview = '/widgets/process.png';
	this.author = 'Peter Širka';
	this.title = 'Process';
	this.category = 'Monitoring';
	this.url = 'https://www.totaljs.com/dashboard/';
	this.type = ['process'];
	this.sizes = ['2x2', '3x3', '4x4', '5x5'];
	config('find', 'Application', 'nginx', '/modules/monitoring/codelist/processes/');
});