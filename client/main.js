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
		this.tunnel.on('error', this.onError.bind(this));
		this.tunnel.on('gameEvent', this.onEvent.bind(this));
		this.tunnel.on('errorEvent', this.onError.bind(this));
		
		if (this.debug) {
			//this._statsCounter = setInterval(this._updateStats.bind(this), 1000);
		}

		//this.onError('Test');

		// Body inits
		jC('.page').hide();

		// Binds
		jC('#splash').click(function() {
			var tag = document.getElementById('wrapper');
			var fsEvent = (tag.requestFullScreen)?"requestFullScreen":(tag.mozRequestFullScreen)?"mozRequestFullScreen":(tag.webkitRequestFullScreenWithKeys)?"webkitRequestFullScreenWithKeys":(tag.webkitRequestFullScreen)?"webkitRequestFullScreen":"FullscreenError";

			_self.changePage.call(_self, 'loading', null, null);
			_self.tunnel.emit('userEvent', {e: 'JOIN_LOBBY'});
			// Enter full screen
			tag[fsEvent]();			
		});

		jC('#ready-button').click(this.ready.bind(this));
		jC('#unready-button').click(this.unready.bind(this));
		jC('#return-button').click(this.leave.bind(this));
		jC('#start-button').click(this.requestStart.bind(this));
		jC('#leave-button').click(this.leave.bind(this));

		// Input events
		var mc = new Hammer(document.getElementById('gamescene'));
		mc.on('swipeleft swiperight tap press', function(ev) {
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
		this.notify([100], '#242');
		var inputMap = {
			shake: 'TILT',
			swipeleft: 'SWIPE_LEFT',
			swiperight: 'SWIPE_RIGHT',
			tap: 'TAP',
			press: 'HOLD'
		};

		if (this._currentPage === 'gamescene') {
			console.log('sending input ' + inputMap[i]);
			this.tunnel.emit('inputEvent', {
				e: inputMap[i]
			});
		}
	};

	App.prototype.changePage = function(id, tIn, tOut, callback) {
		var _self = this;
		if (this.debug) console.log('Switching to page ' + id);
		transitionOut(jC('#'+this._currentPage), tOut, function() {
			_self._currentPage = id;
			transitionIn(jC('#'+_self._currentPage), tIn, callback);
		});
	};

	App.prototype.notify = function(pattern, color) {
		pattern = pattern || [200,100,200];
		color = color || '#333';

		if ('vibrate' in navigator) {
			navigator.vibrate(pattern);
		}
		var elem = jC('#wrapper');
		elem.css('backgroundColor', color);
		setTimeout(function() {
			elem.css('backgroundColor', 'black');
			setTimeout(function() {
				elem.css('backgroundColor', color);
				setTimeout(function() {
					elem.css('backgroundColor', 'black');
				},100);
			},50);
		},100);
	};

	App.prototype.shake = function() {
		var elem = jC('#gamescene');
		elem.animate({
			'padding-top': '8px'
		}, 175, function() {
			elem.animate({
				'padding-top': '-4px'
			}, 175, function() {
				elem.animate({
					'padding-top': '0px'
				}, 175);
			});
		});
	};

	App.prototype.showInstruction = function(details) {
		this.notify();
		jC('#' + details.action + '-inst').show();

		jC('.slot').addClass('inactive');
		details.players.forEach(function(col) {
			jC('#slot-' + col).removeClass('inactive');
		});

		this.shake();

		this.instructionTimer = setTimeout(this.hideInstructions.bind(this), details.timer);
	};

	App.prototype.hideInstructions = function(id) {
		jC('.instruction').hide();
		jC('.slot').addClass('inactive');
		clearTimeout(this.instructionTimer);
	};

	App.prototype.onEvent = function(evt) {
		console.log(evt);
		if (evt.e === 'JOINED_LOBBY') {
			this.color = evt.details.color;
			this.changePage('lobby', null, null);
			this.notify();
			jC('#hud').addClass(this.color);
		}
		if (evt.e === 'GAME_STARTING') {
			this.changePage('countdown', null, null);
			setTimeout(function() {
				jC('#ready').hide();
				jC('#go').show();
			},1000);
		}
		if (evt.e === 'GAME_LOADED') {
			this.startGame();
			jC('#ready').show();
			jC('#go').hide();
		}
		if (evt.e === 'PLAYER_LIST_UPDATE') {
			if (this._currentPage === 'lobby') {
				jC('.lobby-mask').hide();
				jC('.lobby-mask').addClass('inactive');
				evt.details.players.forEach(function(col) {
					jC('#lobby-mask-' + col.color).show();
					if (col.ready) jC('#lobby-mask-' + col.color).removeClass('inactive');
				});
			}
		}
		if (evt.e === 'GAME_END') {
			jC('#return-button').hide();
			this.notify([1000,50,100]);
			jC('#ready-leave-set').show();
			jC('#start-unready-set').hide();
			jC('#game-result').html(evt.details.result);
			jC('#lobby-status').html('Now waiting in lobby!');
			this.shakeListener.stop();
			this.changePage('endgame', null, null);
			setTimeout(function() {
				jC('#return-button').show();
			},2500);
		}
		if (evt.e === 'INSTRUCTION') {
			this.hideInstructions();
			this.showInstruction(evt.details);
		}
	};

	App.prototype.ready = function() {
		this.tunnel.emit('userEvent', {e: 'READY'});
		jC('#lobby-status').html('Waiting for other players...');
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
		jC('#lobby-status').html('Now waiting in lobby!');
		jC('#ready-leave-set').show();
		jC('#start-unready-set').hide();
	};

	App.prototype.leave = function() {
		this.tunnel.emit('userEvent', {e: 'LOGOUT'});
		this.changePage('splash', null, null);
		jC('#hud').removeClass('red');
		jC('#hud').removeClass('green');
		jC('#hud').removeClass('yellow');
		jC('#hud').removeClass('blue');
	};

	App.prototype.requestStart = function() {
		this.tunnel.emit('userEvent', {e: 'START_GAME'});
	};

	App.prototype.startGame = function() {
		this.changePage('gamescene', null, null);
		this.shakeListener.start();
		this.hideInstructions();
	};

	App.prototype._updateStats = function() {
		console.log(JSON.stringify(_stats));
		_stats.actions = 0;
		_stats.skipped = 0;
	};

	/* Init --------------------------------------------------------------------*/

	window.App = App;
})();