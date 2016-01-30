# TODO

## Current

- Download libs localy - to work/play offline
- Only stream input events and statistics when in gamescene AND action is requested
- Server TCP connection with Unity client

## Backlog

- Lobby leader logic
- color spots logic

## Drawing board

- Input event

('inputEvent', {
	event: [SWIPE_LEFT, SWIPE_RIGHT, TILT, HOLD_START, HOLD_END, TAP]
	details: {...}
});

- Gamescene events

('gameEvent', {
	event: 'INSTRUCTION'
	details: {
		action: 'TILT',
		players: '2'
	}
})

GAME_STARTING
GAME_LOADED
GAME_END