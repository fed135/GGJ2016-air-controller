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
		this.tunnel = io.connect('//' + window.location.hostname + ':3080');
		this._currentPage = null;
		this._connected = false;

		this.tunnel.on('connect', function(){
			_self._connected = true;
		});
		this.tunnel.on('gameEvent', this.onEvent.bind(this));
		this.tunnel.on('errorEvent', this.onError.bind(this));
		
		if (this.debug) {
			this._statsCounter = setInterval(this._updateStats.bind(this), 1000);
		}

		// Body inits
		jC('.page').hide();

		// Binds
		jC('#splash').click(function() {
			//TODO: check with server
			_self.changePage.call(_self, 'loading', null, null);
			_self.tunnel.emit('userEvent', {e: 'JOIN_LOBBY'});
		});

		jC('#ready-button').click(this.ready.bind(this));
		jC('#unready-button').click(this.unready.bind(this));
		jC('#start-button').click(this.requestStart.bind(this));
		jC('#leave-button').click(this.leave.bind(this));

		// Input events
		var mc = new Hammer(document.getElementById('gamescene'));
		mc.on('panLeft panRight tap press', function(ev) {
			_self.registerInput.call(_self, ev.type);
		});

		this.shakeListener = new Shake({
			threshold: 15,
			timeout: 700
		});
		
		window.addEventListener('shake', function() {
			_self.registerInput.call(_self, 'shake');
		}, false);

		setTimeout(function() {
			if (!_self._connected) {
				_self.onError({e: 'NO_CONNECTION'});
			}
		},2000);
	}

	App.prototype.registerInput = function(i) {
		var inputMap = {
			shake: 'TILT',
			panLeft: 'SWIPE_LEFT',
			panRight: 'SWIPE_RIGHT',
			tap: 'TAP',
			press: 'HOLD'
		};

		console.log('sending input ' + inputMap[i]);
		this.tunnel.emit('inputEvent', {
			e: inputMap[i]
		});
	};

	App.prototype.changePage = function(id, tIn, tOut, callback) {
		var _self = this;
		if (this.debug) console.log('Switching to page ' + id);
		transitionOut(jC('#'+this._currentPage), tOut, function() {
			_self._currentPage = id;
			transitionIn(jC('#'+_self._currentPage), tIn, callback);
		});
	};

	App.prototype.notify = function() {
		if ('vibrate' in navigator) {
			navigator.vibrate([200,100,200]);
		}
	};

	App.prototype.showInstruction = function(details) {
		this.notify();
		jC('#' + details.action + '-inst').show();
		var slots = jC('.slot').each(function(i) {
			// Manual, ugh
			$(this).removeClass('red');
			$(this).removeClass('green');
			$(this).removeClass('yellow');
			$(this).removeClass('blue');
			$(this).removeClass('white');

			if (!details.players[i]) return;

			$(this).addClass(details.players[i]);
			console.log('show');
			$(this).show();
		});

		this.instructionTimer = setTimeout(this.hideInstructions.bind(this), details.timer);
	};

	App.prototype.hideInstructions = function(id) {
		console.log('hiding all');
		jC('.instruction').hide();
		jC('.slot').hide();
		clearTimeout(this.instructionTimer);
	};

	App.prototype.onEvent = function(evt) {
		console.log(evt);
		if (evt.e === 'JOINED_LOBBY') {
			this.changePage('lobby', null, null);
		}
		if (evt.e === 'GAME_STARTING') {
			this.changePage('loading', null, null);
		}
		if (evt.e === 'GAME_LOADED') {
			this.startGame();
		}
		if (evt.e === 'GAME_END') {
			jC('#ready-leave-set').show();
			jC('#start-unready-set').hide();
			this.changePage('lobby', null, null);
		}
		if (evt.e === 'INSTRUCTION') {
			this.hideInstructions();
			this.showInstruction(evt.details);
		}
	};

	App.prototype.ready = function() {
		this.tunnel.emit('userEvent', {e: 'READY'});
		jC('#ready-leave-set').hide();
		jC('#start-unready-set').show();
	};

	App.prototype.onError = function(e) {
		jC('#error-message-body').html(e.e);
		jC('.error-messages').animate({
			bottom:'0px'
		},300, function() {
			setTimeout(function(){
				jC('.error-messages').animate({
					bottom: '-50px'
				},300);
			},700);
		});
	};

	App.prototype.unready = function() {
		this.tunnel.emit('userEvent', {e: 'UNREADY'});
		jC('#ready-leave-set').show();
		jC('#start-unready-set').hide();
	};

	App.prototype.leave = function() {
		this.tunnel.emit('userEvent', {e: 'LOGOUT'});
		this.changePage('splash', null, null);
	};

	App.prototype.requestStart = function() {
		this.tunnel.emit('userEvent', {e: 'START_GAME'});
	};

	App.prototype.startGame = function() {
		this.changePage('gamescene', null, null);
		this.shakeListener.start();
		this.hideInstructions();
	};

	App.prototype.endGame = function() {
		this.hideInstructions();
		this.shakeListener.stop();
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