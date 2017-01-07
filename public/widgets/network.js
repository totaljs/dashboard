WIDGET('Network', function() {

	var self = this;
	var Eupload, Edownload, Eopen, Echart, svg, g;

	self.make = function(size) {
		self.toggle('network');
		self.center(false);
		self.html('<div class="header"><i class="fa fa-server"></i>Network</div><div class="open-container"><div class="open"><i class="fa fa-circle green"></i><span>340</span></div></div><div class="chart"><svg width="100%" height="100%"></svg></div><div class="info"><div class="upload"><b><i class="fa fa-cloud-upload"></i>UPLOAD</b><span>...</span></div><div class="download"><b><i class="fa fa-cloud-download"></i>DOWNLOAD</b><span>...</span></div></div>');
		Eopen = self.find('.open').find('span');
		Edownload = self.find('.download').find('span');
		Eupload = self.find('.upload').find('span');
		Echart = self.find('.chart');
		svg = d3.select(Echart.find('svg').get(0));
		g = svg.append('g');
	};

	self.render = function(value, size, counter) {

		Eopen.html(value.open);
		Edownload.html(value.download.filesize());
		Eupload.html(value.upload.filesize());

		if (NOTMODIFIED(self.id, value.history))
			return;

		var max = 0;
		var history = [];

		value.history.reverse();
		var tmp = value.history.take(15);
		tmp.reverse();

		tmp.forEach(function(item) {
			if (item.network) {
				max = Math.max(item.network, max);
				history.push(item);
			}
		});

		for (var i = history.length; i < 15; i++)
			history.push({ network: 0 });

		if (max < 3000)
			max = 3000;

		var width = Echart.width();
		var height = Echart.height();

		var x = d3.scaleBand().rangeRound([0, width]).padding(0.2);
		var y = d3.scaleLinear().rangeRound([height, 0]);

		x.domain(d3.range(15));
		y.domain([0, max]);

		g.selectAll('rect').remove();
		g.selectAll('.data').data(history).enter().append('rect').attr('x', function(d, i) { return x(i); }).attr('y', function(d) { return y(d.network); }).attr('width', x.bandwidth()).attr('height', function(d) { return height - y(d.network); });
	};

	self.resize = function(size) {
		self.refresh();
	};

}, function(config, inject) {
	this.example = { open: 403, download: 39334993, upload: 934989398, history: [{ network: 300 }, { network: 693 }, { network: 230 }] };
	this.preview = '/widgets/network.png';
	this.author = 'Peter Širka';
	this.title = 'Network';
	this.group = 'Monitoring';
	this.url = 'https://www.totaljs.com/dashboard/';
	this.type = ['network'];
	this.sizes = ['2x2', '3x3', '4x4', '5x5'];
});