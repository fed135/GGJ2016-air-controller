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

		this.tunnel.on('data', this.onEvent.bind(this));
		
		if (this.debug) {
			this._statsCounter = setInterval(this._updateStats.bind(this), 1000);
		}

		// Binds
		jC('#splash').click(function() {
			//TODO: check with server
			_self.changePage.call(_self, 'loading', null, null);
			_self.tunnel.write({userEvent: 'JOIN_LOBBY'});
		});

		jC('#ready-button').click(function() {
			_self.tunnel.write({userEvent: 'READY'});
		});
		jC('#start-button').click(function() {
			_self.changePage.call(_self, 'loading', null, null);
			_self.tunnel.write({userEvent: 'START_GAME'});
		});
		jC('#leave-button').click(function() {
			_self.changePage.call(_self, 'splash', null, null);
			_self.tunnel.write({userEvent: 'LOGOUT'});
		});
	}

	App.prototype.changePage = function(id, transitionIn, transitionOut, callback) {
		var _self = this;
		transitionOut(jC('#'+this._currentPage), transitionOut, function() {
			_self._currentPage = id;
			transitionIn(jC('#'+_self._currentPage), transitionIn, callback);
		});
	};

	App.prototype.onEvent = function() {

	}

	App.prototype.ready = function() {

	};

	App.prototype.leave = function() {

	};

	App.prototype.startGame = function() {

	};

	App.prototype.endGame = function() {

	};

	App.prototype._updateStats = function() {
		console.log(JSON.stringify(_stats));
		_stats.actions = 0;
		_stats.skipped = 0;
	};

	/* Init --------------------------------------------------------------------*/

	window.app = new App();
	window.app.changePage('splash');
})();