# Making a real air-controller tech - backlog

- Multi-lobby (named lobbies + optionnal passwords)
- Optimized socket flow (inputs)
- Definable events and state-machines
- Can create input zones and add event-listeners
- Clean front-end
- Clean back end
- Dynamic elements
- Preload assets
- Loading screens
- App manifest
- MSGPACK/json options
- Benchmark
- Can send events from server to websocket/tcp/udp
- Support x number of players
- Kick idle connections
- No lobby leader logic
- Handle player disconnections
- Requirejs structure
- Full accelerometer support
- Debug: (npm debug) + logrunner 

----
 
- index.js
- /client
- /server
- config.js
- manifest.json
- package.json

[ config holds eventTypes + their list of events ]

{
  inputEvents: {
    'TAP': 'tapController,
    'BEGIN_HOLD': 'beginHoldController,
    'END_HOLD': 'endHoldController,
    ...
  }
}
