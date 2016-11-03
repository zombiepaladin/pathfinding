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
