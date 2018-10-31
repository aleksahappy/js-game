'use strict';

class Vector {
  constructor(positionX = 0, positionY = 0) {
    this.x = positionX;
    this.y = positionY;
  }

  plus(vector) {
    if (vector instanceof Vector === false) {
      throw new Error(`Можно прибавлять к вектору только вектор типа Vector`);
    }
    return new Vector(this.x + vector.x, this.y + vector.y);  
  }

  times(factor) {
    return new Vector(this.x * factor, this.y * factor)
  }
}

class Actor {
  constructor(position = new Vector(0, 0), size = new Vector(1, 1), speed = new Vector(0, 0)) {
    if (position instanceof Vector === false || size instanceof Vector === false || speed instanceof Vector === false) {
      throw new Error('Переданное значение не является объектом типа Vector');
    }
    this.pos = position;
    this.size = size;
    this.speed = speed;
  }

  act() {}

  get left() {
    return this.pos.x;
  }

  get top() {
    return this.pos.y;
  }

  get right() {
    return this.pos.x + this.size.x;
  }

  get bottom() {
    return this.pos.y + this.size.y;
  }

  get type() {
    return 'actor'
  }
  
  isIntersect(actor) {
    if (actor instanceof Actor === false) {
      throw new Error(`Переданное значение не является объетом типа Actor`);
    }
    if (actor === this) {
      return false;
    }
    if (actor.left === this.left && actor.top === this.top && actor.right === this.right && actor.bottom === this.bottom) {
      return true;
    }
    if (actor.left < this.left && actor.right > this.left) {
      return true;
    }
    if (actor.left > this.left && actor.left < this.right) {
      return true;
    }
    if (actor.top < this.top && actor.bottom > this.top) {
      return true;
    }
    if (actor.top > this.top && actor.top < this.bottom) {
      return true;
    }
    return false;
  }
}

class Level {
  constructor(grid, actors) {
    this.grid = grid;
    this.actors = actors;
    this.status = null;
    this.finishDelay = 1;
  }
  
  get player() {
    return this.actors.find(actor => actor.type === 'player');
  }

  get height() {
    if (this.grid === undefined) {
      return 0;
    }
    return this.grid.length;
  }

  get width() {
    if (this.grid === undefined) {
      return 0;
    }
    return this.grid.reduce(function (memo, el) {
      if (memo > el.length) {
        return memo;
      }
      return memo = el.length;
    }, 0);
  }

  isFinished() {
    if (this.status !== null && this.finishDelay < 0) {
      return true;
    }
    return false;
  }

  actorAt(actor) {
    if (actor instanceof Actor === false) {
      throw new Error(`Переданное значение не является объетом типа Actor`);
    }
    if (this.actors === undefined) {
      return undefined;
    }
    return this.actors.find(item => actor.isIntersect(item));
  }

  obstacleAt(position, size) {
    if (position instanceof Vector === false && size instanceof Vector === false) {
      throw new Error(`Переданное значение не является объетом типа Vector`);
    }
    let actor = new Actor(position, size);
    let level = new Actor(undefined, new Vector(this.width, this.height));
    
    if (actor.bottom > level.bottom) {
      return 'lava';
    }
    if (actor.top < level.top || actor.left < level.left || actor.right > level.right) {
      return 'wall';
    }

    for (let y = Math.floor(actor.top); y < Math.ceil(actor.bottom); y++) {
      for (let x = Math.floor(actor.left); x < Math.ceil(actor.right); x++) {
        if (this.grid[y][x] !== undefined) return this.grid[y][x];
      }
    }
    return undefined;
  }
  
  removeActor(actor) {
    this.actors.splice(this.actors.findIndex(item => item === actor), 1);
  }
  
  noMoreActors(type) {
    if (this.actors === undefined) {
      return true;
    }
    if (this.actors.find(actor => actor.type === type)) {
      return false;
    }
    return true;
  }
  
  playerTouched(type, actor) {
    if (this.isFinished()) {
      return;
    }
    if (type === 'lava' || type === 'fireball') {
      this.status = 'lost';
    }
    if (type === 'coin' && actor.type === 'coin') {
      this.removeActor(actor);
      if (this.noMoreActors(type)) {
        this.status = 'won';
      }
    }
  }
}