WIDGET('online', function() {

	var self = this;

	self.resize = function(dimension) {
		// console.log('onresize', dimension);
	};

	self.make = function(dimension) {
		self.element.css('background-color', self.options.color);
	};

	self.state = function(type, changes) {
		if (!type)
			return;
		self.element.css('background-color', self.options.color);
	};

	self.render = function(value) {
		self.html('NO DATA - ' + self.name);
	};

}, function(config, inject) {
	this.title = 'Online Counter';
	this.author = 'Peter Širka';
	this.sizes = ['1x1'];
	config('color', 'Color', '#A0D468', 'color');
});

WIDGET('Peter', function() {

	var self = this;
	var id;

	self.make = function(dimension) {
		self.element.css({ 'font-size': '80px' });
		self.element.css({ 'background-color': 'black' });
		self.render();
	};

	self.destroy = function() {
		clearInterval(id);
	};

	self.render = function(value) {
		var interval = self.config('interval') || 0;
		id = setInterval(function() {
			self.html(interval++);

			if (interval % 2 === 0)
				self.element.animate({ 'font-size': '140px' }, 300);
			else
				self.element.animate({ 'font-size': '80px' }, 300);

			self.config('interval', interval);
		}, 1000);
	};

}, function(config, inject) {
	this.title = 'Petrov Widget';
	this.author = 'Janko Hraško';
});

WIDGET('barchart', function() {

	var self = this;

	self.resize = function(dimension) {
		console.log('onresize', dimension);
	};

	self.make = function(dimension) {
		self.element.css('background-color', self.options.color);
	};

	self.state = function(type, changes) {
		if (!type)
			return;
		self.element.css('background-color', self.options.color);
	};

	self.render = function(value) {
		self.html('NO DATA - ' + self.rename('january'));
	};

}, function(config, inject) {

	this.example = { name: 'value', amount: 30 };
	this.title = 'Barchart';

	config('year', 'Year', new Date().getFullYear(), 2020, 2000, 5);
	config('color', 'Peter', '#A0D468', 'Color');
	config('size', 'Size', 'large', ['large', 'medium', 'small', 'mobile']);
	config('type', 'Vyber typ', 'X1', ['X1', 'X2', 'X3']);
	config('path', 'Path', '["webcounter"]["errors"]', 'Path');
	config('legend', 'Show legend', false);
	config('datefrom', 'Date from', new Date());
});

WIDGET('Chart.js', function() {

	var self = this;
	var myChart;

	self.make = function(dimension) {

		self.html('<canvas width="{0}" height="{1}"></canvas>'.format(dimension.width - 30, dimension.height - 30));
		self.css('background-color', 'white').css('padding', '15px');

		myChart = new Chart(self.find('canvas').get(0).getContext('2d'), {
		    type: 'bar',
		    data: {
		        labels: ["Red", "Blue", "Yellow", "Green", "Purple", "Orange"],
		        datasets: [{
		            label: '# of Votes',
		            data: [12, 19, 3, 5, 2, 3],
		            backgroundColor: [
		                'rgba(255, 99, 132, 0.2)',
		                'rgba(54, 162, 235, 0.2)',
		                'rgba(255, 206, 86, 0.2)',
		                'rgba(75, 192, 192, 0.2)',
		                'rgba(153, 102, 255, 0.2)',
		                'rgba(255, 159, 64, 0.2)'
		            ],
		            borderColor: [
		                'rgba(255,99,132,1)',
		                'rgba(54, 162, 235, 1)',
		                'rgba(255, 206, 86, 1)',
		                'rgba(75, 192, 192, 1)',
		                'rgba(153, 102, 255, 1)',
		                'rgba(255, 159, 64, 1)'
		            ],
		            borderWidth: 1
		        }]
		    },
		    options: {
		        scales: {
		            yAxes: [{
		                ticks: {
		                    beginAtZero:true
		                }
		            }]
		        }
		    }
		});
	};

	self.destroy = function() {
		myChart.destroy();
	};

});

WIDGET('Chart.js Radar', function() {

	var self = this;
	var myChart;

	self.make = function(dimension) {

		self.html('<canvas width="{0}" height="{1}"></canvas>'.format(dimension.width - 30, dimension.height - 30));
		self.css('background-color', 'white').css('padding', '15px');

		var data = {
		    labels: ["Eating", "Drinking", "Sleeping", "Designing", "Coding", "Cycling", "Running"],
		    datasets: [
		        {
		            label: "My First dataset",
		            backgroundColor: "rgba(179,181,198,0.2)",
		            borderColor: "rgba(179,181,198,1)",
		            pointBackgroundColor: "rgba(179,181,198,1)",
		            pointBorderColor: "#fff",
		            pointHoverBackgroundColor: "#fff",
		            pointHoverBorderColor: "rgba(179,181,198,1)",
		            data: [65, 59, 90, 81, 56, 55, 40]
		        },
		        {
		            label: "My Second dataset",
		            backgroundColor: "rgba(255,99,132,0.2)",
		            borderColor: "rgba(255,99,132,1)",
		            pointBackgroundColor: "rgba(255,99,132,1)",
		            pointBorderColor: "#fff",
		            pointHoverBackgroundColor: "#fff",
		            pointHoverBorderColor: "rgba(255,99,132,1)",
		            data: [28, 48, 40, 19, 96, 27, 100]
		        }
		    ]
		};

		var ctx = self.find('canvas').get(0).getContext('2d');
		myChart = new Chart(ctx, {
		    type: 'radar',
		    data: data
		});
	};

	self.destroy = function() {
		myChart.destroy();
	};

});

WIDGET('Chart.js Pie', function() {

	var self = this;
	var myChart;

	self.make = function(dimension) {

		self.html('<canvas width="{0}" height="{1}"></canvas>'.format(dimension.width - 30, dimension.height - 30));
		self.css('background-color', 'white').css('padding', '15px');

		var data = {
		    labels: [
		        "Red",
		        "Blue",
		        "Yellow"
		    ],
		    datasets: [
		        {
		            data: [300, 50, 100],
		            backgroundColor: [
		                "#FF6384",
		                "#36A2EB",
		                "#FFCE56"
		            ],
		            hoverBackgroundColor: [
		                "#FF6384",
		                "#36A2EB",
		                "#FFCE56"
		            ]
		        }]
		};

		var ctx = self.find('canvas').get(0).getContext('2d');
		myChart = new Chart(ctx,{
		    type: 'pie',
		    data: data,
		});
	};

	self.destroy = function() {
		myChart.destroy();
	};

});

WIDGET('Chart.js Doughnut', function() {

	var self = this;
	var myChart;

	self.make = function(dimension) {

		self.html('<canvas width="{0}" height="{1}"></canvas>'.format(dimension.width - 30, dimension.height - 30));
		self.css('background-color', 'white').css('padding', '15px');

		var data = {
		    labels: [
		        "Red",
		        "Blue",
		        "Yellow"
		    ],
		    datasets: [
		        {
		            data: [300, 50, 100],
		            backgroundColor: [
		                "#FF6384",
		                "#36A2EB",
		                "#FFCE56"
		            ],
		            hoverBackgroundColor: [
		                "#FF6384",
		                "#36A2EB",
		                "#FFCE56"
		            ]
		        }]
		};

		var ctx = self.find('canvas').get(0).getContext('2d');
		myChart = new Chart(ctx,{
		    type: 'doughnut',
		    data: data,
		});
	};

	self.destroy = function() {
		myChart.destroy();
	};

});