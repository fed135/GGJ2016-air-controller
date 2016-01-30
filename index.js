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

var colors = ['red', 'green', 'yellow', 'blue'];
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

/* Methods -------------------------------------------------------------------*/

function Connection(socket) {
	this.socket = socket;
	this.ready = false;
	this.ingame = false;
	this.playerColor = null;

	this.socket.on('userEvent', this.handleUserEvent.bind(this));
	this.socket.on('gameEvent', this.handleGameEvent.bind(this));
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

		/* TODO - loading logic */
		setTimeout(function() {
			_self.broadcast(players, 'gameEvent', {e: 'GAME_LOADED'});
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
		this.emit(this, 'gameEvent', {e: 'JOINED_LOBBY'});
	}
	else {
		this.emit(this, 'errorEvent', {e: 'LOBBY_FULL'});
	}
};

Connection.prototype.emit = function(peer, evt, payload) {
	console.log('emitting ' + evt + ' to ' + peer.color);
	if (peer instanceof Connection) peer.socket.emit(evt, payload);
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