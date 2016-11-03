(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
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

},{"../tilemaps/example_tilemap.json":4,"./pathfinder.js":2,"./tilemap.js":3}],2:[function(require,module,exports){
/**
 * @module A pathfinding module providing
 * a visualizaiton of common tree-search
 * algorithms  used in conjunction with
 * a tilemap.
 */
module.exports = exports = Pathfinder;

/**
 * @constructor Pathfinder
 * Constructs a new Pathfinder for the
 * supplied tilemap.  By default it uses
 * breadth-first.
 * @param {Tilemap} tilemap - the tilemap to
 * use in finding paths.
 */
function Pathfinder(tilemap) {
  this.tilemap = tilemap;
  this.algorithm = 'breadth-first';
}

/**
 * Set a starting node for the pathfinding algorithm
 * @param {Object} node has an x and y property corresponding
 * to a tile in our tilemap.
 * @param {Canvas2DContext} ctx the context to render the start node on
 */
Pathfinder.prototype.setStartNode = function(node, ctx) {
  // Set the starting node
  this.start = {
    x: node.x,
    y: node.y,
    cost: 0
  }
  // Add the start node to the frontier and explored lists
  this.frontier = [[this.start]];
  this.explored = [this.start];
  // Render the start node in our visualization
  var worldCoords = this.tilemap.toWorldCoordinates(node);
  ctx.save();
  ctx.fillStyle = 'blue';
  ctx.beginPath();
  ctx.arc(worldCoords.x, worldCoords.y, 25, 0, 2*Math.PI);
  ctx.fill();
  ctx.restore();
}

/**
 * Set a goal node for the pathfinding algorithm
 * @param {Object} node has an x and y property corresponding
 * to a tile in our tilemap.
 * @param {Canvas2DContext} ctx the context to render the goal node on
 */
Pathfinder.prototype.setGoalNode = function(node, ctx) {
  this.goal = {
    x: node.x,
    y: node.y
  }
  // Render the goal node in our visualization
  var worldCoords = this.tilemap.toWorldCoordinates(node);
  ctx.save();
  ctx.fillStyle = 'green';
  ctx.beginPath();
  ctx.arc(worldCoords.x, worldCoords.y, 30, 0, 2*Math.PI);
  ctx.fill();
  ctx.restore();
}

/**
 * Sets the algorithm to use in finding a path.
 * @param {string} algorithm - the algorithm to use
 * Supported values are:
 * - 'depth-first'
 * - 'best-first'
 * - 'greedy'
 * - 'a-star' (default)
 */
Pathfinder.prototype.setAlgorithm = function(algorithm) {
  this.algorithm = algorithm;
}

/**
 * @function isExplored
 * A helper function to determine if a node has
 * already been explored.
 * @param {Object} node - an object with an x and y
 * property corresponding to a tile position.
 * @returns true if explored, false if not.
 */
Pathfinder.prototype.isExplored = function(node) {
  return this.explored.findIndex(function(n){
    return n.x == node.x && n.y == node.y;
  }) != -1;
}

/**
 * @function isImpassible
 * A helper function to determine if a node is
 * impassible - either becuase it is impossible to
 * move through, or it does not exist.
 * @param {Object} node - an object with an x and y
 * property corresponding to a tile position.
 * @returns true if impassible, false if not.
 */
Pathfinder.prototype.isImpassible = function(node) {
  var tile = this.tilemap.tileAt(node.x, node.y, 0);
  return !(tile && tile.movement != -1);
}

/**
 * @function expand
 * Helper function to identify neighboring unexplored nodes
 * and add them to the explored list.  It also calculates
 * the path cost to reach these nodes and thier distance
 * from the goal.
 * @param {Object} node - an object with an x and y
 * property corresponding to a tile position that
 * we want to find unexplored tiles adjacent to.
 * Expanded nodes are rendered into the provided context.
 * @param {RenderingContext2D} ctx - the rendering
 * context in which to display our visualizaiton of
 * expanded nodes.
 * @returns An array of expaned nodes.
 */
Pathfinder.prototype.expand = function(node, ctx) {
  var actions = [];
  for(var x = -1; x < 2; x++){
    for(var y = -1; y < 2; y++){
      var newNode = {
        x: node.x - x,
        y: node.y - y
      }
      if((x != 0 || y != 0) &&
        !this.isExplored(newNode) &&
        !this.isImpassible(newNode))
      {
        // Add the path distance to reach this node
        var movement = this.tilemap.tileAt(node.x, node.y, 0).movement;
        newNode.cost = movement + node.cost;

        // Add the estimated distance to the goal
        // We'll use straight-line distance
        newNode.distance = Math.sqrt(
          Math.pow(newNode.x - this.goal.x, 2) +
          Math.pow(newNode.y - this.goal.y, 2)
        );

        // render the new node
        ctx.beginPath();
        ctx.fillStyle = 'Yellow';
        ctx.arc(64*newNode.x + 32, 64*newNode.y + 32, 25, 0, 2*Math.PI);
        ctx.fill();
        ctx.fillStyle = 'orange';
        ctx.fillText(newNode.cost, 64*newNode.x+20, 64*newNode.y+20);
        ctx.fillStyle = 'red';
        var distStr = parseInt(newNode.distance * 100)/100;
        ctx.fillText(distStr, 64*newNode.x+20, 64*newNode.y+35);
        var heuristic = parseInt((newNode.cost + newNode.distance)*100)/100;
        ctx.fillStyle = 'black';
        ctx.fillText(heuristic, 64*newNode.x+20, 64*newNode.y+50);

        // push the new node to action and explored lists
        actions.push(newNode);
        this.explored.push(newNode);
      }
    }
  }
  return actions;
}

/**
 * @function step
 * Advances the current pathfinding algorithm by one step,
 * displaying the result on-screen.  Used to animate the
 * process; normally this would happen within a loop
 * (see findPath() below)
 * @param {RenderingContext2D} ctx - the context to render into
 * @returns a path to the goal as an array of nodes, an empty
 * array if no such path exists, or undefined if there are still
 * possible paths to explore.
 */
Pathfinder.prototype.step = function(ctx) {
  // Clear any on-screen messages
  document.getElementById('message').text = "";

  // If there are no paths left in the frontier,
  // we cannot reach our goal
  if(this.frontier.length == 0) {
    document.getElementById('message').text = "No Path Found";
    return [];
  }

  // Select a path from the frontier to explore
  // The method of selection is what defines our
  // algorithm
  var path;
  switch(this.algorithm) {
    case 'breadth-first':
      // In breadth-first, we process the paths
      // in the order they were added to the frontier
      path = this.frontier.shift();
      break;
    case 'best-first':
      // In best-first, we process the paths in order
      // using a heuristic that helps us pick the
      // "best" option.  We often use straight-line
      // distance between the last node in the path
      // and the goal node.
      this.frontier.sort(function(pathA, pathB){
        var a = pathA[pathA.length-1].distance;
        var b = pathB[pathB.length-1].distance;
        return a - b;
      });
      path = this.frontier.shift();
      break;
    case 'greedy':
      // In greedy search, we pick the path that has
      // the lowest cost to reach
      this.frontier.sort(function(pathA, pathB){
        var a = pathA[pathA.length-1].cost;
        var b = pathB[pathB.length-1].cost;
        return a - b;
      });
      path = this.frontier.shift();
      break;
    case 'a-star':
      // In A*, we pick the path with the lowest combined
      // path cost and distance heurisitic
      this.frontier.sort(function(pathA, pathB){
        var a = pathA[pathA.length-1].cost + pathA[pathA.length-1].distance;
        var b = pathB[pathB.length-1].cost + pathB[pathB.length-1].distance;
        return a - b;
      });
      path = this.frontier.shift();
      break;
  }

  // Render the selected path as an orange line
  ctx.beginPath();
  ctx.strokeStyle = 'orange';
  ctx.strokeWidth = 5;
  ctx.moveTo(64*path[0].x+32, 64*path[0].y+32);
  path.forEach(function(node){
    ctx.lineTo(64*node.x+32, 64*node.y+32);
  });
  ctx.stroke();

  // If the path we chose leads to the goal,
  // we found a solution; return it.
  var lastNode = path[path.length-1];
  if(lastNode.x == this.goal.x && lastNode.y == this.goal.y)
    return path;

  // Otherwise, add any new nodes not already explored
  // that we can reach from the last node in the current path
  var frontier = this.frontier;
  this.expand(lastNode, ctx).forEach(function(node){
    var newPath = path.slice()
    newPath.push(node)
    frontier.push(newPath);
  });

  function nodeToString(node) {
    return '(' + node.x + ',' + node.y + ')';
  }

  function pathToString(path) {
    return path.map(nodeToString).join('->');
  }

  // Print the current path, frontier, and explored
  // territory to the DOM
  document.getElementById('path').innerHTML =
    pathToString(path);
  document.getElementById('frontier').innerHTML =
    this.frontier.map(pathToString).join('<br>');
  document.getElementById('explored').innerHTML =
    this.explored.map(nodeToString).join(', ');

  // If we reach this point, we have not yet found a path
  return undefined;
}

},{}],3:[function(require,module,exports){
/**
 * @module
 * Tilemap engine defined using the Module pattern
 */
module.exports = exports = Tilemap;

/**
 * @constructor Tilemap
 * Creates a tilemap from JSON data conforming to
 * the Tiled JSON format using CSV data storage
 * @param {Object} mapData - JSON map data
 * @param {Ojbect} options - options for the tilemap.
 * Valid options are:
 *  onload - a callback triggered after all images are loaded
 */
function Tilemap(mapData, options) {
  var loading = 0;

  // Map properties
  this.tileWidth = mapData.tilewidth;
  this.tileHeight = mapData.tileheight;
  this.mapWidth = mapData.width;
  this.mapHeight = mapData.height;

  // Bootstrap access to private variables
  var tiles = [];
  var tilesets = [];
  var layers = [];

  // Load the tileset(s)
  loading = mapData.tilesets.length;
  mapData.tilesets.forEach( function(tilesetmapData, index) {
    // Load the tileset image
    var tileset = new Image();
    tileset.onload = function() {
      loading--;
      if(loading == 0 && options.onload) options.onload();
    }
    tileset.src = tilesetmapData.image;
    tilesets.push(tileset);

    // Create the tileset's tiles
    var colCount = Math.floor(tilesetmapData.imagewidth / mapData.tilewidth),
        rowCount = Math.floor(tilesetmapData.imageheight / mapData.tileheight),
        tileCount = colCount * rowCount;

    for(i = 0; i < tileCount; i++) {
      var tile = {
        // Reference to the image, shared amongst all tiles in the tileset
        image: tileset,
        // Source x position.  i % colCount == col number (as we remove full rows)
        sx: (i % colCount) * mapData.tilewidth,
        // Source y position. i / colWidth (integer division) == row number
        sy: Math.floor(i / colCount) * mapData.tileheight,
        // Indicates a solid tile (i.e. solid property is true).  As properties
        // can be left blank, we need to make sure the property exists.
        // We'll assume any tiles missing the solid property are *not* solid
        solid: (tilesetmapData.tileproperties[i] && tilesetmapData.tileproperties[i].solid == "true") ? true : false,
        movement: tilesetmapData.tileproperties[i].movement
      }
      tiles.push(tile);
    }
  });

  // Parse the layers in the map
  mapData.layers.forEach( function(layerData) {

    // Tile layers need to be stored in the engine for later
    // rendering
    if(layerData.type == "tilelayer") {
      // Create a layer object to represent this tile layer
      var layer = {
        name: layerData.name,
        width: layerData.width,
        height: layerData.height,
        visible: layerData.visible
      }

      // Set up the layer's data array.  We'll try to optimize
      // by keeping the index data type as small as possible
      if(tiles.length < Math.pow(2,8))
        layer.data = new Uint8Array(layerData.data);
      else if (tiles.length < Math.Pow(2, 16))
        layer.data = new Uint16Array(layerData.data);
      else
        layer.data = new Uint32Array(layerData.data);

      // save the tile layer
      layers.push(layer);
    }
  });

  this.tiles = tiles;
  this.tilesets = tilesets;
  this.layers = layers;
}


/**
 * @function render()
 * Renders the tilemap using the provide context
 * @param {Canvas2DContext} ctx - the rendering context
 */
Tilemap.prototype.render = function(ctx) {
  var tileWidth = this.tileWidth;
      tileHeight = this.tileHeight;
      tiles = this.tiles;

  // Render tilemap layers - note this assumes
  // layers are sorted back-to-front so foreground
  // layers obscure background ones.
  // see http://en.wikipedia.org/wiki/Painter%27s_algorithm
  this.layers.forEach(function(layer){

    // Only draw layers that are currently visible
    if(layer.visible) {
      for(y = 0; y < layer.height; y++) {
        for(x = 0; x < layer.width; x++) {
          var tileId = layer.data[x + layer.width * y];

          // tiles with an id of 0 don't exist
          if(tileId != 0) {
            var tile = tiles[tileId - 1];
            if(tile.image) { // Make sure the image has loaded
              ctx.drawImage(
                tile.image,     // The image to draw
                tile.sx, tile.sy, tileWidth, tileHeight, // The portion of image to draw
                x*tileWidth, y*tileHeight, tileWidth, tileHeight // Where to draw the image on-screen
              );
            }
          }

        }
      }
    }

  });
}

/**
 * @function tileAt()
 * returns the tile at the specified location and layer,
 * or undefined if no such tile exists.
 * @param {Integer} x - the x coordinate of the tile
 * @param {Integer} y - the y coordinate of the tile
 * @param {Integer} layer - the layer of the tile
 * @return The tile object, or undefined if no tile exists.
 */
Tilemap.prototype.tileAt = function(x, y, layer) {
  // sanity check
  if(layer < 0 || x < 0 || y < 0 ||
     layer >= this.layers.length ||
     x > this.mapWidth ||
     y > this.mapHeight
  ) return undefined;
  return this.tiles[this.layers[layer].data[x + y * this.mapWidth] - 1];
}

/**
 * @function toWorldCoordinates
 * Converts a coordinate pair from tile coordinates to
 * world coordinates.
 * @param {Object} coords - an object with an x and y
 * property corresponding to a tile location in the map.
 * @return a simple object with x and y properties of the
 * location in pixel-based world coordinates.
 */
Tilemap.prototype.toWorldCoordinates = function(coords) {
  return {
    x: this.tileWidth * coords.x + this.tileWidth/2,
    y: this.tileHeight * coords.y + this.tileHeight/2
  }
}

/**
 * @function toMapCoordinates()
 * Converts pixel-based world coordinates to tile-based
 * map coordinates.
 * @param {Object} coords - an object with an x and y
 * property consisting of world coordinates.
 * @returns a simple object with an x and y property of
 * the corresponding tile coordinates.
 */
Tilemap.prototype.toMapCoordinates = function(coords) {
  return {
    x: parseInt(coords.x / this.tileWidth),
    y: parseInt(coords.y / this.tileHeight)
  }
}

/**
 * @function findPath
 * A tree-search algorithm implementation that finds a
 * path from the supplied start tile position to goal
 * tile position using the specified method.
 * @param {Object} start - an object with x and y coordinates
 * corresponding to a tile position in the map.
 * @param {Object} goal - an object with x and y coordinates
 * corresponding to a tile position within the map.
 * @method {String} method - one of the following tree-search
 * approaches: 'breadth-first', 'greedy', 'best-first', and
 * 'a-star'.
 * @return a path as an array of coordinate objects corresponding
 * to tile positions, or an empty array if no path exists.
 */
Tilemap.prototype.findPath = function(start, goal, method) {
  var tilemap = this;
  start.cost = 0;
  var frontier = [[start]];
  var explored = [start];

  // Helper function to find nodes in the explored region
  function isExplored(node) {
    return explored.findIndex(function(n){
      return n.x == node.x && n.y == node.y;
    }) != -1;
  }

  // Helper function to determine if a node is impassible
  // (either by being solid or by being off the map)
  function isImpassible(node) {
    var tile = tilemap.tileAt(node.x, node.y, 0);
    return !(tile && tile.movement != -1);
  }

  // Helper function to return neighboring unexplored nodes
  function expand(node) {
    var actions = [];
    for(var x = -1; x < 2; x++){
      for(var y = -1; y < 2; y++){
        var newNode = {
          x: node.x - x,
          y: node.y - y
        }
        if((x != 0 || y != 0) &&
          !isExplored(newNode) &&
          !isImpassible(newNode))
        {
          // Add the path distance to reach this node
          var movement = tilemap.tileAt(node.x, node.y, 0).movement;
          newNode.cost = movement + node.cost;

          // Add the estimated distance to the goal
          // We'll use straight-line distance
          newNode.distance = Math.sqrt(
            Math.pow(newNode.x - goal.x, 2) +
            Math.pow(newNode.y - goal.y, 2)
          );

          // push the new node to action and explored lists
          actions.push(newNode);
          explored.push(newNode);
        }
      }
    }
    return actions;
  }

  // Tree search
  while(true) {
    // If there is no paths left in the frontier,
    // we cannot reach our goal
    if(frontier.length == 0) return [];

    // Select a path from the frontier to explore
    // The method of selection is very important
    var path;
    switch(method) {
      case 'breadth-first':
        // In breadth-first, we process the paths
        // in the order they were added to the frontier
        path = frontier.shift();
        break;
      case 'best-first':
        frontier.sort(function(pathA, pathB){
          var a = distanceToGoal(pathA[pathA.length-1]);
          var b = distanceToGoal(pathB[pathB.length-1]);
          return a - b;
        });
        path = frontier.shift();
        break;
      case 'greedy':
        frontier.sort(function(pathA, pathB){
          var a = pathA[pathA.length-1].cost;
          var b = pathB[pathB.length-1].cost;
          return a - b;
        });
        path = frontier.shift();
        break;
      case 'a-star':
        frontier.sort(function(pathA, pathB){
          var a = pathA[pathA.length-1].cost + pathA[pathA.length-1].distance;
          var b = pathB[pathB.length-1].cost + pathB[pathB.length-1].distance;
          return a - b;
        });
        path = frontier.shift();
        break;
    }

    // If the path we chose leads to the goal,
    // we found a solution; return it.
    var lastNode = path[path.length-1];
    if(lastNode.x == goal.x && lastNode.y == goal.y) {
      return path;
    }

    // Otherwise, add any new nodes not already explored
    // to the frontier
    expand(lastNode, lastNode).forEach(function(node){
      var newPath = path.slice()
      newPath.push(node)
      frontier.push(newPath);
    });
  }

  // If we get to this point, there is no workable path
  return [];
}

},{}],4:[function(require,module,exports){
module.exports={ "height":10,
 "layers":[
        {
         "data":[3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 4, 4, 4, 2, 2, 2, 2, 2, 2, 3, 3, 2, 4, 4, 1, 4, 2, 2, 2, 3, 3, 2, 2, 2, 2, 4, 4, 4, 2, 3, 3, 2, 2, 2, 2, 2, 2, 1, 2, 3, 3, 3, 3, 3, 2, 2, 2, 4, 4, 3, 3, 2, 2, 3, 2, 3, 2, 2, 4, 4, 3, 2, 2, 1, 2, 3, 2, 2, 2, 3, 3, 3, 3, 3, 3, 3, 2, 2, 2, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3],
         "height":10,
         "name":"Tile Layer 1",
         "opacity":1,
         "type":"tilelayer",
         "visible":true,
         "width":10,
         "x":0,
         "y":0
        }],
 "nextobjectid":1,
 "orientation":"orthogonal",
 "renderorder":"right-down",
 "tileheight":64,
 "tilesets":[
        {
         "columns":2,
         "firstgid":1,
         "image":".\/tilesets\/example.png",
         "imageheight":130,
         "imagewidth":128,
         "margin":0,
         "name":"example",
         "spacing":0,
         "tilecount":4,
         "tileheight":64,
         "tileproperties":
            {
             "0":
                {
                 "movement":1
                },
             "1":
                {
                 "movement":1
                },
             "2":
                {
                 "movement":-1,
                 "solid":"true"
                },
             "3":
                {
                 "movement":2
                }
            },
         "tilepropertytypes":
            {
             "0":
                {
                 "movement":"int"
                },
             "1":
                {
                 "movement":"int"
                },
             "2":
                {
                 "movement":"int",
                 "solid":"string"
                },
             "3":
                {
                 "movement":"int"
                }
            },
         "tilewidth":64
        }],
 "tilewidth":64,
 "version":1,
 "width":10
}

},{}]},{},[1]);
