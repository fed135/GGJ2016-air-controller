var client = require('pushstate-server');
client.start({ port: 3000, directory: './client' });

var players = [];

var io = require('socket.io')(3080);

io.on('connection', function(socket) {
	socket.on('userEvent', function(e) {
		if (e.event) {
			if(e.event === 'JOIN_LOBBY') {
				if (players.length < 4) {
					players.push(socket);
					socket.emit('gameEvent', {event: 'JOINED_LOBBY'});
				}
				else {
					socket.emit('gameEvent', {event: 'LOBBY_FULL'});
				}
			}
			if (e.userEvent === 'LOGOUT') {
				var i = players.indexOf(socket);

				if (i>-1) players.splice(i,1);
			}
		}
		else if (e.inputEvent) {
			//TODO
		}
	});

	socket.on('disconnect', function() {
		var i = players.indexOf(socket);

		if (i>-1) players.splice(i,1);
	});
});