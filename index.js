/**
 * Air controller Server
 * - Receives events from all the controllers and pipes them into a single 
 *   stream to the screen
 */

'use strict';

/* Requires ------------------------------------------------------------------*/

var client = require('pushstate-server');
var io = require('socket.io')

/* Local variables -----------------------------------------------------------*/

// An array of socket connections
var players = [];
// All the current connections
var connections = [];
// Limit of players
var playerLimit = 4;

/* Methods -------------------------------------------------------------------*/

function Connection(socket) {
	this.socket = socket;
	this.socket.on('userEvent', this.handleUserEvent.bind(this));
	this.socket.on('gameEvent', this.handleGameEvent.bind(this));
	this.socket.on('disconnect', this.disconnect.bind(this));
}

Connection.prototype.handleUserEvent = function() {
	if(e.event === 'JOIN_LOBBY') {
		if (players.length < playerLimit) {
			players.push(socket);
			socket.emit('gameEvent', {event: 'JOINED_LOBBY'});
		}
		else {
			socket.emit('errorEvent', {event: 'LOBBY_FULL'});
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

				if (players.length < 2) canLaunch = false;

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
					socket.emit('errorEvent', {event: 'PLAYERS_NOT_READY'});
				}
			}
			if (e.event === 'LOGOUT') {
				var i = players.indexOf(socket);

				if (i>-1) players.splice(i,1);
			}
};

function initConnection(socket) {
	connections.push(new Connection(socket));
}

/* Init ----------------------------------------------------------------------*/

// Serve the Client
client.start({ port: 3000, directory: './client' });

// Start the Socket server, Handle connections
io(3080).on('connection', initConnection);