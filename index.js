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
			if (e.event === 'READY') {
				socket.__ready = true;
			}
			if (e.event === 'UNREADY') {
				socket.__ready = false;
			}
			if (e.event === 'START_GAME') {
				var canLaunch = players.every(function(p) {
					return p.__ready;
				});

				if (canLaunch) {
					players.forEach(function(p){
						p.__ready = false;
						p.__ingame = true
					});
					socket.broadcast.emit('gameEvent', {event: 'GAME_STARTING'});
					socket.emit('gameEvent', {event: 'GAME_STARTING'});

					/* TODO - loading logic */
					setTimeout(function() {
						socket.broadcast.emit('gameEvent', {event: 'GAME_LOADED'});
						socket.emit('gameEvent', {event: 'GAME_LOADED'});
					}, 700);					
				}
				else {
					socket.broadcast.emit('gameEvent', {event: 'PLAYERS_NOT_READY'});
					socket.emit('gameEvent', {event: 'PLAYERS_NOT_READY'});
				}
			}
			if (e.event === 'LOGOUT') {
				var i = players.indexOf(socket);

				if (i>-1) players.splice(i,1);
			}
		}
	});

	socket.on('disconnect', function() {
		var i = players.indexOf(socket);

		if (i>-1) players.splice(i,1);
	});
});