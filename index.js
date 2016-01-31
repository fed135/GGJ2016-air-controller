/**
 * Air controller Server
 * - Receives events from all the controllers and pipes them into a single 
 *   stream to the screen
 */

'use strict';

/* Requires ------------------------------------------------------------------*/

var client = require('pushstate-server');
var io = require('socket.io');
var net = require('net');

/* Local variables -----------------------------------------------------------*/

// Available colors
var colors = ['red', 'green', 'yellow', 'blue'];
// Available instructions
var instructions = ['SWIPE_LEFT', 'SWIPE_RIGHT', 'TILT', 'HOLD', 'TAP'];
// Action store
var availablePlayerStore = colors.concat();
// An array of socket connections
var players = [];
// All the current connections
var connections = [];
// Limit of players
var playerLimit = 4;
// Minimum players required to start
var playerMin = 1;
// Screen connection
var projector = null;
// Projector port
var projectorPort = 11000;
// Client port
var clientPort = 3000;
// Socket server port
var serverPort = 3080;
// Instruction timer
var instructionTimer = null;
// Time to complete an instruction
var instructionTimeLimit = 1000*3;
// Min time between instructions
var instructionsMinDelay = 1000;
// Max time between instructions
var instructionsMaxDelay = 1000*2;
// Length of a match
var gameTimeLimit = 1000 * 20;
// Re-insert player timer
var regenPlayerTimer = 1000 * 2;
// Is a game in progress
var gameRunning = false;
// Totem score
var totemScore = 0;
// Totem timer
var totemTimer = null;
// Totem step rate
var totemStep = 1000/2;
// Score goal
var scoreGoal = 1000;
// Game timer
var gameTimer = null;
// Point map
var points = [2,2,5,3,1];
// Expect map
var expectMap = {
	red: [],
	green: [],
	blue: [],
	yellow: [],
	white: []
};

/* Methods -------------------------------------------------------------------*/

function Connection(socket) {
	this.socket = socket;
	this.ready = false;
	this.ingame = false;
	this.playerColor = null;

	this.socket.on('userEvent', this.handleUserEvent.bind(this));
	this.socket.on('gameEvent', this.handleGameEvent.bind(this));
	this.socket.on('inputEvent', this.handleInputEvent.bind(this));
	this.socket.on('disconnect', this.disconnect.bind(this));
}

Connection.prototype.handleUserEvent = function(evt) {
	console.log('got userEvent ' + evt.e + ' from ' + this.color);

	if (evt.e === 'JOIN_LOBBY') this.joinLobby();

	if (this.color) {
		if (evt.e === 'READY') this.ready = true; 
		if (evt.e === 'UNREADY') this.ready = false; 
		if (evt.e === 'START_GAME') this.requestStart();
		if (evt.e === 'LOGOUT') this.disconnect();
	}
};

Connection.prototype.stepTotem = function() {
	if (totemScore >= scoreGoal) {
		return endGame();
	}

	totemScore--;

	console.log('New score:' + totemScore);

	this.emit(projector,'gameEvent', {
		e: 'TOTEM_SCORE',
		details: {
			score: totemScore
		}
	});
};

Connection.prototype.handleGameEvent = function(evt) {
	console.log('got gameEvent ' + evt.e + ' from ' + this.color);
};

Connection.prototype.handleInputEvent = function(evt) {
	console.log('got inputEvent ' + evt.e + ' from ' + this.color);

	evt.player = this.color;

	if (expectMap[this.color].indexOf(evt.e) > -1 || expectMap['white'].indexOf(evt.e) > -1) {
		totemScore+=points[instructions.indexOf(evt.e)];
	}

	Connection.prototype.emit.call(this, projector, 'inputEvent', evt);
};

Connection.prototype.handleInputEvent = function(evt) {
	evt.player = this.color;
	players[0].emit(projector, 'inputEvent', evt);
};

Connection.prototype.requestStart = function() {
	var _self = this;
	var canLaunch = players.every(function(p) {
		return p.ready;
	});

	if (gameRunning) return;

	if (players.length < playerMin) {
		return this.emit(this, 'errorEvent', {e: 'NOT_ENOUGH_PLAYERS'});
	}

	if (canLaunch) {
		players.forEach(function(p){
			p.ready = false;
			p.ingame = true
		});

		this.broadcast(players, 'gameEvent', {e: 'GAME_STARTING'});
		this.emit(projector, 'gameEvent', {e: 'GAME_STARTING'});

		/* TODO - loading logic */
		setTimeout(function() {
			_self.broadcast(players, 'gameEvent', {e: 'GAME_LOADED'});
			_self.emit(projector, 'gameEvent', {e: 'GAME_LOADED'});
			// Start sending events
			availablePlayerStore = availablePlayerStore.splice(0, players.length);
			gameRunning = true;
			colors = ['red', 'green', 'yellow', 'blue'];
			totemScore = 0;
			totemTimer = setInterval(_self.stepTotem.bind(_self), totemStep);
			sendInstructionEvent(true);
			gameTimer = setTimeout(endGame, gameTimeLimit);
		}, 2000);					
	}
	else {
		this.emit(this, 'errorEvent', {e: 'PLAYERS_NOT_READY'});
	}
};

Connection.prototype.joinLobby = function() {
	if (gameRunning) {
		return this.emit('errorEvent', {
			e: 'GAME_IN_PROGRESS'
		});
	}

	if (players.length < playerLimit) {
		players.push(this);
		this.color = colors.shift();
		this.emit(this, 'gameEvent', {
			e: 'JOINED_LOBBY', 
			details: { 
				color: this.color
			}
		});
	}
	else {
		this.emit(this, 'errorEvent', {e: 'LOBBY_FULL'});
	}
};

Connection.prototype.emit = function(peer, evt, payload) {
	console.log('emitting ' + evt + ':' + payload.e + ' to ' + (peer.color || 'projector'));
	if (peer instanceof Connection) peer.socket.emit(evt, payload);
	else if (peer.write) {
		// Projector
		payload.type = evt;
		peer.write(JSON.stringify(payload) + '\n');
	}
};

Connection.prototype.broadcast = function(peers, evt, payload) {
	peers.forEach(function(p) {
		p.emit(p, evt, payload);
	});
};

Connection.prototype.disconnect = function() {
	var i = players.indexOf(this);
	
	if (this.color)	colors.unshift(this.color);

	if (i>-1) players.splice(i,1);
}

function initConnection(socket) {
	connections.push(new Connection(socket));
}

function _instructionNewTime() {
	var delay = instructionsMinDelay + Math.round(Math.random()*instructionsMaxDelay);
	console.log('Next instruction in ' + delay);
	return delay;
}

function endGame() {
	gameRunning = false;
	clearTimeout(instructionTimer);
	availablePlayerStore = colors.concat();
	clearTimeout(gameTimer);
	clearInterval(totemTimer);

	var _payload = {
		e: 'GAME_END',
		details: {
			result: (totemScore >= scoreGoal)?'success':'failure'
		}
	};

	Connection.prototype.broadcast.call(this, players, 'gameEvent', _payload);
	Connection.prototype.emit(projector, 'gameEvent', _payload);

	players.forEach(function(e) {
		e.disconnect();
	});
}

function sendInstructionEvent(noMove) {
	//Queue next instruction event
	instructionTimer = setTimeout(sendInstructionEvent, _instructionNewTime());

	if (noMove) return;
	console.log('');
	console.log('Rolling a move for ' + players.length + ' players');

	var _actionId = Math.floor(Math.random()*instructions.length);
	var _playerId = Math.floor(Math.random()*players.length);
	var _numPlayersNeeded = 1 + Math.floor(Math.random()*(players.length -1));
	var _isAnonymous = Math.floor(Math.random()*2);
	var _targetPlayers = [];

	var _targetId;
	var _targetColor;

	// If anon or not
	if (_isAnonymous === 0) {
		console.log('need to choose from ' + JSON.stringify(availablePlayerStore));
		for (var i = 0; i<_numPlayersNeeded; i++) {
			if (availablePlayerStore.length > 0) {
				_targetId = Math.floor(Math.random()*availablePlayerStore.length);
				_targetColor = availablePlayerStore.splice(_targetId,1)[0];
				_targetPlayers.push(_targetColor);
				setTimeout(function(){
					availablePlayerStore.push(_targetColor);
				}, regenPlayerTimer);
			}
			else {
				_targetPlayers.push('white');
			}
		}
	}
	else {
		_targetPlayers.push('white');
	}

	var _player = _getPlayerByColor(colors[_playerId]);

	if (_player) {
		console.log('Sending instruction ' + instructions[_actionId] + ' to ' + _player.color);
		var _payload = {
			e: 'INSTRUCTION',
			details: {
				action: instructions[_actionId],
				players: _targetPlayers,
				timer: instructionTimeLimit
			}
		};

		// Add to expect - with shift after delay
		_payload.details.players.forEach(function(clr) {
			expectMap[clr].push(_payload.details.action);
			setTimeout(function() {
				expectMap[clr].shift();
			}, instructionTimeLimit);
		});

		_player.emit(_player, 'gameEvent', _payload);
		_player.emit(projector, 'gameEvent', _payload);
	}
	else {
		console.log('NO PLAYER FOUND AT INDEX ' + _playerId);
	}
}

function _getPlayerByColor(color) {
	for (var i = 0; i<players.length; i++) {
		if (players[i].color === color) return players[i];
	}
}

/* Init ----------------------------------------------------------------------*/

// Serve the Client
client.start({ port: clientPort, directory: './client' });

// Start the Socket server, Handle connections
io(serverPort).on('connection', initConnection);

net.createServer(function(req) {
	projector = req;
}).listen(projectorPort, function() {
	projector = net.connect(projectorPort);
});