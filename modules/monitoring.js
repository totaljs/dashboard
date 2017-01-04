const Exec = require('child_process').exec;
const Spawn = require('child_process').spawn;

var PROCESS_CPU;
var RESPONSE_CPU = { all: 0, cores: [], history: [], updated: F.datetime };
var RESPONSE_MEMORY = { free: 0, total: 0, used: 0, history: [], updated: F.datetime };
var STATS = { hour: -1, memory: 0, cpu: 0, updated: F.datetime };
var HISTORY = [];
var INTERVAL;
var WEBSOCKET;
var DATA = SINGLETON('monitoring');

exports.install = function() {

	// Communication
	F.websocket('/modules/monitoring/', communication, ['json', 'authorize']);

	// Child processes
	PROCESS_CPU = Spawn('mpstat', ['-P', 'ALL', 10]);

	/*
	PROCESS_CPU.stderr.on('data', function(chunk) {
		console.log('--> err', chunk.toString('utf8'));
	});
	*/

	PROCESS_CPU.stdout.on('data', U.streamer('\n\n', function(chunk) {
		chunk.toString('utf8').parseTerminal(function(values, index, count) {

			var id = values[2];
			var core = +id;
			if (id !== 'all' && isNaN(core))
				return;

			var sum = 0;
			for (var i = 3, length = values.length - 1; i < length; i++)
				sum += +values[i];

			if (isNaN(core))
				RESPONSE_CPU.all = sum.floor(2);
			else
				RESPONSE_CPU.cores[core] = sum.floor(2);
		});

		STATS.cpu = Math.max(STATS.cpu, RESPONSE_CPU.all);
		RESPONSE_CPU.updated = F.datetime;

		DATA.type = 'cpu';
		DATA.value = RESPONSE_CPU;
		WEBSOCKET && WEBSOCKET.send(DATA);
	}));

	INTERVAL = setInterval(function() {
		getMemory();
	}, 10000);

	var db = NOSQL('server');
	var backup = db.meta('current');
	if (backup)
		STATS = backup;

	db.find().sort('updated', true).take(24).callback(function(err, response) {
		HISTORY = response;
		RESPONSE_CPU.history = HISTORY;
		RESPONSE_MEMORY.history = HISTORY;
	});

	F.on('service', save);
};

exports.uninstall = function() {
	PROCESS_CPU.kill(9);
	PROCESS_CPU = null;
	clearInterval(INTERVAL);
	save();
	F.removeListener('service', save);
};

function save(interval) {
	if (interval % 5 !== 0)
		return;

	var db = NOSQL('server');

	db.meta('current', STATS);

	DATA.type = 'stats';
	DATA.value = STATS;
	WEBSOCKET && WEBSOCKET.send(DATA);

	var hour = F.datetime.getHours();
	if (hour !== STATS.hour) {
		STATS.year = F.datetime.getFullYear();
		STATS.month = F.datetime.getMonth() + 1;
		STATS.day = F.datetime.getDay();
		STATS.id = F.datetime.format('yyMMddHH').parseInt();
		STATS.hour = hour;
		STATS.updated = F.datetime;
		HISTORY.push(U.clone(STATS));
		HISTORY.length > 24 && HISTORY.shift();
		db.modify(STATS, STATS).where('id', STATS.id);
	}
}

function communication() {
	WEBSOCKET = this;
	WEBSOCKET.autodestroy(function() {
		WEBSOCKET = null;
	});

	WEBSOCKET.on('open', function(client) {
		setTimeout(function() {
			DATA.type = 'memory';
			DATA.value = RESPONSE_MEMORY;
			WEBSOCKET && WEBSOCKET.send(DATA);
		}, 100);

		setTimeout(function() {
			DATA.type = 'cpu';
			DATA.value = RESPONSE_CPU;
			WEBSOCKET && WEBSOCKET.send(DATA);
		}, 200);

		setTimeout(function() {
			DATA.type = 'stats';
			DATA.value = STATS;
			WEBSOCKET && WEBSOCKET.send(DATA);
		}, 300);
	});
}

function getMemory(next) {
	Exec('free -b -t', function(err, response) {
		var memory = response.split('\n')[1].match(/\d+/g);
		RESPONSE_MEMORY.total = memory[0].parseInt();
		RESPONSE_MEMORY.free = memory[2].parseInt() + memory[4].parseInt();
		RESPONSE_MEMORY.used = memory[1].parseInt();
		RESPONSE_MEMORY.updated = F.datetime;
		DATA.type = 'memory';
		DATA.value = RESPONSE_MEMORY;
		WEBSOCKET && WEBSOCKET.send(DATA);
		STATS.memory = Math.max(STATS.memory, RESPONSE_MEMORY.used);
		next && next();
	});
}