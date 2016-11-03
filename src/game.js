var Tilemap = require('./tilemap.js');
var Pathfinder = require('./pathfinder.js');
var tilemapData = require('../tilemaps/example_tilemap.json');
var tilemap;
var pathfinder;

// Wait for the window to load completely
window.onload = function() {
  var state = 'pick start';

  // Set up the screen canvas
  var screen = document.createElement("canvas");
  screen.width = 640;
  screen.height = 640;
  screenCtx = screen.getContext("2d");
  document.getElementById("game-screen-container").appendChild(screen);

  // Load the tilemap
  tilemap = new Tilemap(
    tilemapData, {
      onload: function() {
        tilemap.render(screenCtx);
        //tilemap.findPath({x:1,y:1},{x:2,y:6},'a-star',screenCtx);
      }
    }
  );
  window.tilemap = tilemap;

  // Create the pathfinder
  pathfinder = new Pathfinder(tilemap);

  // Set up our controls
  document.getElementById('search-method').onblur = function(){
    pathfinder.setAlgorithm(this.value);
  }
  document.getElementById('step').onclick = function(){
    if(state == 'pathfinding') {
      var result = pathfinder.step( screenCtx );
      // If we get a result, then we have found a path
      // or exhausted all posibilities
      if(result) {
        var message = document.getElementById('message');
        message.innerHTML = 'Click to restart';
        state = 'done pathfinding';
      }
    }
  }
  screen.onclick = function(event){
    var message = document.getElementById('message');
    switch(state) {
      case 'pick start':
        var node = {
          x: parseInt(event.offsetX / 64),
          y: parseInt(event.offsetY / 64)
        }
        pathfinder.setStartNode(node, screenCtx);
        message.innerHTML = 'Click to place <b>goal</b> node';
        state = 'pick goal';
        break;

      case 'pick goal':
        var node = {
          x: parseInt(event.offsetX / 64),
          y: parseInt(event.offsetY / 64)
        }
        pathfinder.setGoalNode(node, screenCtx);
        message.innerHTML = 'Click <b>Step</b> to advance the algorithm';
        state = 'pathfinding';
        break;

      case 'done pathfinding':
        tilemap.render(screenCtx);
        message.innerHTML = 'Click to place <b>start</b> node';
        state = 'pick start';
        break;
    }
  }

};
