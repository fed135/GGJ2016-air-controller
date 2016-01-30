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
	console.log('got userEvent ' + evt.e);
	if (evt.e === 'JOIN_LOBBY') this.joinLobby();
	if (evt.e === 'READY') this.ready = true; 
	if (evt.e === 'UNREADY') this.ready = false; 
	if (evt.e === 'START_GAME') this.requestStart();
	if (evt.e === 'LOGOUT') this.disconnect(); 
};

Connection.prototype.handleGameEvent = function(evt) {
	console.log('got gameEvent ' + evt);
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
			colors = ['red', 'green', 'yellow', 'blue']
			sendInstructionEvent(true);
			setTimeout(endGame, gameTimeLimit);
		}, 700);					
	}
	else {
		this.emit(this, 'errorEvent', {e: 'PLAYERS_NOT_READY'});
	}
};

Connection.prototype.joinLobby = function() {
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
	console.log('emitting ' + evt + ' to ' + (peer.color || 'projector'));
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
	return instructionsMinDelay + Math.round(Math.random()*instructionsMaxDelay);
}

function endGame() {
	clearTimeout(instructionTimer);
	availablePlayerStore = colors.concat();
	players[0].broadcast(players, 'gameEvent', {e: 'GAME_END'});
	players[0].emit(projector, 'gameEvent', {e: 'GAME_END'});
}

function sendInstructionEvent(noMove) {
	//Queue next instruction event
	instructionTimer = setTimeout(sendInstructionEvent, _instructionNewTime());

	if (noMove) return;

	var _actionId = Math.floor(Math.random()*instructions.length);
	var _playerId = Math.floor(Math.random()*players.length);
	var _numPlayersNeeded = 1 + Math.floor(Math.random()*(players.length -1));
	var _isAnonymous = Math.floor(Math.random()*2);
	var _targetPlayers = [];

	var _targetId;

	// If anon or not
	if (_isAnonymous === 0) {
		for (var i = 0; i<_numPlayersNeeded; i++) {
			if (availablePlayerStore.length > 0) {
				_targetId = Math.floor(Math.random()*availablePlayerStore.length);
				_targetPlayers.push(availablePlayerStore.splice(_playerId,1));
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
	var _payload = {
		e: 'INSTRUCTION',
		details: {
			action: instructions[_actionId],
			players: _targetPlayers,
			timer: instructionTimeLimit
		}
	};

	_player.emit(_player, 'gameEvent', _payload);
	_player.emit(projector, 'gameEvent', _payload);
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