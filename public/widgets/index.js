var ws_monitoring;
var currentdata = {};

ON('dashboard', function(dashboard) {
	if (dashboard && dashboard.group.toLowerCase() === 'monitoring') {
		if (ws_monitoring)
			return;
		ws_monitoring = new WebSocket((location.protocol === 'https:' ? 'wss' : 'ws') + '://' + location.hostname + (location.port ? ':' + location.port : '') + '/modules/monitoring/');
		ws_monitoring.onclose = function() {
			ws_monitoring = null;
			setTimeout2('dashboard.load', function() {
				EMIT('dashboard', window.dashboard.current);
			}, 200)
		};
		ws_monitoring.onmessage = function(e) {
			var data = JSON.parse(decodeURIComponent(e.data));
			DATA(data.type, data.value);

			if (data.type === 'process')
				currentdata[data.type + data.value.type] = data.value;
			else
				currentdata[data.type] = data.value;
		};
	} else
		ws_monitoring && ws_monitoring.close();
});