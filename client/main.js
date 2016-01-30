;(function() {

	/**
	 * Companion main script
	 */

	'use strict';

	/* Local variables ---------------------------------------------------------*/

	var _jCache = {};
	var _actionQueue = null;
	var _stats = {
		actions: 0,
		skipped: 0
	};
	var _statsCounter = null;
	var _transmitionRate = 1000/30;	// 30 FPS
	var _actionCounter = null;


	/* Methods -----------------------------------------------------------------*/

	function transitionOut(elem, transition, callback) {
		if (!transition) {
			if (elem) elem.hide();
			if (callback) callback();
		}
	}

	function transitionIn(elem, transition, callback) {
		if (!transition) {
			if (elem) elem.show();
			if (callback) callback();
		}
	}

	function jC(qs) {
		if (qs in _jCache) return _jCache[qs];
		else _jCache[qs] = $(qs);
		return _jCache[qs];
	}

	function pipeAction(action, priority) {
		if (!_actionQueue || _actionQueue.priority <= priority) {

		}
	}

	/* App ---------------------------------------------------------------------*/

	function App () {
		var _self = this;

		this.debug = true;
		this.tunnel = io.connect('http://localhost:3080');
		this._currentPage = null;

		this.tunnel.on('connect', function(){
			console.log('connected!');
		});
		this.tunnel.on('gameEvent', this.onEvent.bind(this));
		
		if (this.debug) {
			this._statsCounter = setInterval(this._updateStats.bind(this), 1000);
		}

		// Body inits
		jC('.page').hide();

		// Binds
		jC('#splash').click(function() {
			//TODO: check with server
			_self.changePage.call(_self, 'loading', null, null);
			_self.tunnel.emit('userEvent', {event: 'JOIN_LOBBY'});
		});

		jC('#ready-button').click(this.ready.bind(this));
		jC('#unready-button').click(this.unready.bind(this));
		jC('#start-button').click(this.requestStart.bind(this));
		jC('#leave-button').click(this.leave.bind(this));
	}

	App.prototype.changePage = function(id, tIn, tOut, callback) {
		var _self = this;
		if (this.debug) console.log('Switching to page ' + id);
		transitionOut(jC('#'+this._currentPage), tOut, function() {
			_self._currentPage = id;
			transitionIn(jC('#'+_self._currentPage), tIn, callback);
		});
	};

	App.prototype.notify = function() {
		if (vibrate in navigator) {
			navigator.vibrate([200,100,200]);
		}
	};

	App.prototype.showInstruction = function(id) {
		this.notify();
		jC('#' + id + '-inst').show();
		// Listen for input
	};

	App.prototype.hideInstructions = function(id) {
		jC('.instruction').hide();
		// Remove input listeners
	};

	App.prototype.onEvent = function(e) {
		console.log(e);
		if (e.event === 'JOINED_LOBBY') {
			this.changePage('lobby', null, null);
		}
		if (e.event === 'GAME_STARTING') {
			this.changePage('loading', null, null);
		}
		if (e.event === 'GAME_LOADED') {
			this.startGame();
		}
		if (e.event === 'PLAYERS_NOT_READY') {}
		if (e.event === 'LOBBY_FULL') {}
	};

	App.prototype.ready = function() {
		this.tunnel.emit('userEvent', {event: 'READY'});
		jC('#ready-leave-set').hide();
		jC('#start-unready-set').show();
	};

	App.prototype.unready = function() {
		this.tunnel.emit('userEvent', {event: 'UNREADY'});
		jC('#ready-leave-set').show();
		jC('#start-unready-set').hide();
	};

	App.prototype.leave = function() {
		this.tunnel.emit('userEvent', {event: 'LOGOUT'});
		this.changePage('splash', null, null);
	};

	App.prototype.requestStart = function() {
		this.tunnel.emit('userEvent', {event: 'START_GAME'});
	}

	App.prototype.startGame = function() {
		this.changePage('gamescene', null, null);
		this.hideInstructions();
	};

	App.prototype.endGame = function() {
		this.hideInstructions();
		this.changePage('lobby', null, null);
	};

	App.prototype._updateStats = function() {
		console.log(JSON.stringify(_stats));
		_stats.actions = 0;
		_stats.skipped = 0;
	};

	/* Init --------------------------------------------------------------------*/

	window.App = App;
})();