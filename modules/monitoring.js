const Exec = require('child_process').exec;
const Spawn = require('child_process').spawn;
const REG_EMPTY = /\s{2,}/g;
const REG_CLEAN = /\:\-/g;

// Threads
var PROCESS_CPU;

// In-Memory stats
var RESPONSE = {};
var STATS = { hour: -1, updated: F.datetime };

// Temporary
var DATA = SINGLETON('monitoring');
var HISTORY = [];
var INTERVAL;
var WEBSOCKET;
var INDEXER = -1;

// Default values
RESPONSE.cpu = { all: 0, cores: [], avg: '', history: HISTORY };

exports.install = function() {

	// Communication
	F.websocket('/modules/monitoring/', communication, ['json', 'authorize']);
	F.route('/modules/monitoring/codelist/processes/', json_codelist_processes, ['authorize']);
	F.route('/modules/monitoring/codelist/history/', json_codelist_history, ['authorize']);
	F.route('/modules/monitoring/codelist/logs/', json_codelist_logs, ['authorize']);

	// Child processes
	PROCESS_CPU = Spawn('mpstat', ['-P', 'ALL', 10]);

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
				RESPONSE.cpu.all = sum.floor(2);
			else
				RESPONSE.cpu.cores[core] = sum.floor(2);
		});

		STATS.cpu = Math.max(STATS.cpu || 0, RESPONSE.cpu.all);
		RESPONSE.cpu.updated = F.datetime;

		if (!RESPONSE.cpu.history)
			RESPONSE.cpu.history = HISTORY;

		DATA.type = 'cpu';
		DATA.value = RESPONSE.cpu;
		WEBSOCKET && WEBSOCKET.send(DATA);
	}));

	INTERVAL = setInterval(function() {
		INDEXER++;
		getCpuAvg(function() {
			getMemory(function() {
				getNetwork(function() {
					getProcesses();
					INDEXER % 3 === 0 && getDisk();
					INDEXER % 4 === 0 && getLogs();
				});
			});
		});
	}, F.config['monitoring.interval'] || 10000);

	var db = NOSQL('monitoring');
	var backup = db.meta('current');
	if (backup)
		STATS = backup;

	db.find().sort('updated', true).take(24).callback(function(err, response) {
		response.reverse();
		response.forEach(function(item) {
			HISTORY.push(item);
		});
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

	var db = NOSQL('monitoring');

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
		db.modify(STATS, STATS).where('id', STATS.id).callback(function() {
			// reset stats
			Object.keys(STATS).forEach(function(key) {
				if (key !== 'hour')
					STATS[key] = undefined;
			});
		});
	}
}

function json_codelist_processes() {
	this.json(F.config['monitoring.processes']);
}

function json_codelist_history() {
	this.json(F.config['monitoring.history']);
}

function json_codelist_logs() {
	this.json(F.config['monitoring.logs']);
}

function communication() {
	WEBSOCKET = this;
	WEBSOCKET.autodestroy(function() {
		WEBSOCKET = null;
	});

	WEBSOCKET.on('open', function(client) {
		setTimeout(function() {
			DATA.type = 'memory';
			DATA.value = RESPONSE.memory;
			DATA.value && client.send(DATA);
		}, 100);

		setTimeout(function() {
			DATA.type = 'cpu';
			DATA.value = RESPONSE.cpu;
			DATA.value && client.send(DATA);
		}, 200);

		setTimeout(function() {
			DATA.type = 'stats';
			DATA.value = STATS;
			DATA.value && client.send(DATA);
		}, 300);

		setTimeout(function() {
			DATA.type = 'network';
			DATA.value = RESPONSE.network;
			DATA.value && client.send(DATA);
		}, 400);

		setTimeout(function() {
			DATA.type = 'disk';
			DATA.value = RESPONSE.disk;
			DATA.value && client.send(DATA);
		}, 500);

		setTimeout(function() {
			DATA.type = 'process';
			F.config['monitoring.processes'].wait(function(item, next) {
				DATA.type = 'process';
				DATA.value = RESPONSE[item];
				DATA.value && client.send(DATA);
				setTimeout(next, 100);
			});
		}, 600);

		setTimeout(function() {

			DATA.type = 'process';
			F.config['monitoring.logs'].wait(function(item, next) {
				if (!RESPONSE['logs_' + item])
					return;
				DATA.type = 'logs';
				DATA.value = RESPONSE['logs_' + item];
				DATA.value && client.send(DATA);
				setTimeout(next, 100);
			});
		}, 1000);
	});
}

function getNetwork(next) {

	var arr = [];

	if (!RESPONSE.network)
		RESPONSE.network = { ports: F.config['monitoring.network.ports'], history: HISTORY };

	arr.push(function(next) {
		var arg = [];
		F.config['monitoring.network.ports'].forEach(n => arg.push('-e :' + n));
		Exec('netstat -an | grep {0} | wc -l'.format(arg.join(' ')), function(err, response) {
			var value = response.trim().parseInt() - 1;
			RESPONSE.network.open = value;
			STATS.network = Math.max(STATS.network || 0, RESPONSE.network.open);
			next();
		});
	});

	arr.push(function(next) {
		Exec('ifconfig eth0', function(err, response) {
			var match = response.match(/RX bytes:\d+|TX bytes:\d+/g);
			if (match) {
				RESPONSE.network.download = match[0].parseInt2();
				RESPONSE.network.upload = match[1].parseInt2();
			}
			next();
		});
	});

	arr.async(function() {
		DATA.type = 'network';
		DATA.value = RESPONSE.network;
		WEBSOCKET && WEBSOCKET.send(DATA);
		next && next();
	});
}

function getProcesses(next) {
	F.config['monitoring.processes'].wait(function(item, next) {

		if (!RESPONSE[item])
			RESPONSE[item] = { type: item, history: HISTORY };

		Exec('ps aux | grep "{0}" | grep -v "grep" | awk {\'print $2\'}'.format(item), function(err, response) {
			if (err)
				return next();

			var arr = response.trim().split('\n');
			var pid = arr.join(',');
			if (!pid)
				return next();

			RESPONSE[item].count = arr.length;
			RESPONSE[item].cpu = 0;
			RESPONSE[item].memory = 0;

			var uptime_max = 0;
			var uptime;

			// CPU, memory, up-time
			Exec('ps -p {0} -o %cpu,rss,etime'.format(pid), function(err, response) {
				response.split('\n').forEach(function(line, index) {
					if (!index)
						return;
					line = line.trim().replace(REG_EMPTY, ' ');
					if (!line)
						return;
					line = line.split(' ');
					RESPONSE[item].cpu += line[0].parseFloat();
					RESPONSE[item].memory += line[1].parseInt() * 1024; // kB to bytes
					var tmp = uptime_max;
					uptime_max = Math.max(uptime_max || 0, +line[2].replace(REG_CLEAN));
					if (tmp !== uptime_max)
						uptime = line[2];
				});

				RESPONSE[item].cpu = RESPONSE[item].cpu.floor(1);

				// Open files
				Exec('lsof -a -p {0} | wc -l'.format(pid), function(err, response) {
					RESPONSE[item].files = response.trim().parseInt2();
					RESPONSE[item].updated = F.datetime;
					DATA.type = 'process';
					DATA.value = RESPONSE[item];
					WEBSOCKET && WEBSOCKET.send(DATA);
					RESPONSE[item].uptime = uptime;
					STATS[item + '_cpu'] = Math.max(STATS[item + '_cpu'] || 0, RESPONSE[item].cpu);
					STATS[item + '_memory'] = Math.max(STATS[item + '_memory'] || 0, RESPONSE[item].memory);
					setTimeout(next, 100);
				});
			});
		});
	}, next);
}

function getDisk(next) {

	if (!RESPONSE.disk)
		RESPONSE.disk = { history: HISTORY };

	Exec('df -hTB1 /', function(err, response) {
		response.parseTerminal(function(line) {
			RESPONSE.disk.total = line[2].parseInt();
			RESPONSE.disk.free = line[4].parseInt();
			RESPONSE.disk.used = line[3].parseInt();
			RESPONSE.disk.updated = F.datetime;
			DATA.type = 'disk';
			DATA.value = RESPONSE.disk;
			WEBSOCKET && WEBSOCKET.send(DATA);
			STATS.disk = Math.max(STATS.disk || 0, RESPONSE.disk.used);
			next && next();
		}, 1);
	});
}

function getCpuAvg(next) {
	Exec('cat /proc/loadavg', function(err, response) {
		RESPONSE.cpu.avg = response.trim().split(' ')[3];
		DATA.type = 'cpu';
		DATA.value = RESPONSE.cpu;
		WEBSOCKET && WEBSOCKET.send(DATA);
		next && next();
	});
}

function getMemory(next) {

	if (!RESPONSE.memory)
		RESPONSE.memory = { history: HISTORY };

	Exec('free -b -t', function(err, response) {
		var memory = response.split('\n')[1].match(/\d+/g);
		RESPONSE.memory.total = memory[0].parseInt();
		RESPONSE.memory.free = memory[2].parseInt() + memory[4].parseInt();
		RESPONSE.memory.used = memory[1].parseInt();
		RESPONSE.memory.updated = F.datetime;
		DATA.type = 'memory';
		DATA.value = RESPONSE.memory;
		WEBSOCKET && WEBSOCKET.send(DATA);
		STATS.memory = Math.max(STATS.memory || 0, RESPONSE.memory.used);
		next && next();
	});
}

function getProcessesConsuming(next) {
	Exec('ps aux | sort -nrk 3,3 | head -n 30', function(err, response) {
		response.parseTerminal(function(line) {
			console.log('-->', line);
		}, 1);
		next && next();
	});
}

function getLogs(next) {
	F.config['monitoring.logs'].wait(function(item, next) {
		Exec('tail -n ' + F.config['monitoring.logslines'] + ' ' + item, function(err, response) {
			var key = 'logs_' + item;

			if (!RESPONSE[key])
				RESPONSE[key] = {};

			RESPONSE[key].path = item;
			RESPONSE[key].value = response.split('\n');
			RESPONSE[key].updated = F.datetime;

			DATA.type = 'logs';
			DATA.value = RESPONSE[key];
			WEBSOCKET && WEBSOCKET.send(DATA);
			next();
		});
	}, next);
}