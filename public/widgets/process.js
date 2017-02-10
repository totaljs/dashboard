WIDGET('Process', function() {
	var self = this;
	var Eprogress, Ecpu, Ememory, Echart, g, gCpu, svg, Etitle, Efiles, Euptime, Ethreads, tooltip;

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
		gCpu = svg.append('g');
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

		if (NOTMODIFIED(self.id, value.history))
			return;

		var builder = [];
		var max_memory = 1048576000;
		var max_cpu = 100;
		var history_memory = [];
		var history_cpu = [];

		var key_memory = value.type + '_memory';
		var key_cpu = value.type + '_cpu';

		value.history.reverse();
		var tmp = value.history.take(15);
		tmp.reverse();

		tmp.forEach(function(item) {
			if (item[key_memory]) {
				max_memory = Math.max(item[key_memory], max_memory);
				history_memory.push(item);
			}
			item[key_cpu] !== undefined && history_cpu.push(item);
		});

		var obj = {};
		obj[key_memory] = 0;
		obj[key_cpu] = 0;

		for (var i = history_memory.length; i < 15; i++)
			history_memory.push(obj);

		for (var i = history_cpu.length; i < 15; i++)
			history_cpu.push(obj);

		var width = Echart.width();
		var height = Echart.height();

		var x = d3.scaleBand().rangeRound([0, width]).padding(0.2);
		var y = d3.scaleLinear().rangeRound([height, 0]);
		var line = d3.line().x(function(d, index) { return x(index) + 10; }).y(function(d) { var tmp = d[key_cpu]; return y(tmp > 100 ? 100 : tmp); });

		x.domain(d3.range(15));
		y.domain([0, max_memory]);

		g.selectAll('rect,text').remove();

		MAKE(g.selectAll('.memorychart').data(history_memory).enter(), function() {
			this.append('rect').attr('x', function(d, i) { return x(i); }).attr('y', function(d) { return y(d[key_memory]); }).attr('width', x.bandwidth()).attr('height', function(d) { var tmp = height - y(d[key_memory]); return tmp < 0 ? 0 : tmp; }).on('mouseenter mouseleave', function(item) {

				var e = d3.event;

				if (e.type === 'mouseleave') {
					self.tooltip(false);
					tooltip = null;
					return;
				}

				if (tooltip === e.target)
					return;

				tooltip = e.target;
				var pos = tooltip.getBBox();
				var x = (self.size.x - 80) + pos.x;
				var y = self.size.y + size.height - (size.device === 'xs' ? -20 : (40).inc('-' + size.percentageH));
				self.tooltip(x, y, 'RSS: <b>{0}</b><br />CPU: <b>{1}%</b><br />Created: <b>{2}</b>'.format(item[key_memory].filesize(), item[key_cpu], item.updated.parseDate().format('yyyy-MM-dd HH:mm')), 180);
			});
			(size.device === 'xs' || size.device === 'lg') && this.append('text').attr('transform', 'translate(9,0)').attr('text-anchor', 'middle').attr('x', function(d, i) { return x(i); }).attr('y', height - 3).text(function(d) { return d.hour; });
		});

		y = d3.scaleLinear().rangeRound([height.inc('-15%'), 0]);
		y.domain([0, max_cpu]);
		gCpu.selectAll('path').remove('path');
		gCpu.append('path').datum(history_cpu).attr('d', line);
	};

}, function(config) {
	this.example = { type: 'nginx', cpu: 7.1, memory: 39641088, files: 393, uptime: '32:22', history: [{ nginx_cpu: 14.3, nginx_memory: 39641088 }, { nginx_cpu: 20, nginx_memory: 59641088 }, { nginx_cpu: 7, nginx_memory: 29641088 }] };
	this.preview = '/widgets/process.png';
	this.author = 'Peter Širka';
	this.title = 'Process';
	this.group = 'Monitoring';
	this.url = 'https://www.totaljs.com/dashboard/';
	this.type = ['process'];
	this.sizes = ['2x2', '3x3', '4x4', '5x5'];
	config('find', 'Application', 'nginx', '/modules/monitoring/codelist/processes/');
});