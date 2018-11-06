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
    return 'actor';
  }
  
  isIntersect(actor) {
    if (actor instanceof Actor === false) {
      throw new Error(`Переданное значение не является объетом типа Actor`);
    }
    if (actor === this) {
      return false;
    }
    if (((actor.left < this.left && actor.right > this.left) || (actor.left > this.left && actor.left < this.right) || (actor.left === this.left && actor.right === this.right)) && ((actor.top < this.top && actor.bottom > this.top) || (actor.top > this.top && actor.top < this.bottom) || (actor.top === this.top && actor.bottom === this.bottom))) {
      return true;
    }
    return false;
  }
}

class Level {
  constructor(grid = [], actors = []) {
    this.grid = grid;
    this.actors = actors;
    this.status = null;
    this.finishDelay = 1;
  }
  
  get player() {
    return this.actors.find(actor => actor.type === 'player');
  }

  get height() {
    return this.grid.length;
  }

  get width() {
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
    return this.actors.find(item => actor.isIntersect(item));
  }

  obstacleAt(position, size) {
    if (position instanceof Vector === false && size instanceof Vector === false) {
      throw new Error(`Переданное значение не является объетом типа Vector`);
    }
    let actor = new Actor(position, size);
    let level = new Actor(new Vector(0, 0), new Vector(this.width, this.height));
    
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

class LevelParser {
  constructor(actorsDict = {}) {
    this.actorsDict = actorsDict;
  }

  actorFromSymbol(actorSymbol) {
    return this.actorsDict[actorSymbol];
  }

  obstacleFromSymbol(obstacleSymbol) {
    if (obstacleSymbol === 'x') {
      return 'wall';
    }
    if (obstacleSymbol === '!') {
      return 'lava';
    }
  }

  createGrid(plan) {
    const self = this;
    return plan.map(function (rowPlan) {
      const row = [];
      rowPlan.split('').forEach(function (obstacleSymbol) {
        row.push(self.obstacleFromSymbol(obstacleSymbol));
      })
      return row;
    })
  }

  createActors(plan) {
    const self = this;
    const actors = [];

    plan.forEach(function (rowPlan, y) {
      rowPlan.split('').forEach(function (actorSymbol, x) {
        const actorConstructor = self.actorFromSymbol(actorSymbol);
        if (actorConstructor !== undefined && typeof actorConstructor === 'function' && new actorConstructor instanceof Actor) {
          actors.push(new actorConstructor(new Vector(x, y)));
        }
      })
    })

    return actors;
  }

  parse(plan) {
    const grid = this.createGrid(plan);
    const actors = this.createActors(plan);
    return new Level(grid, actors)
  }
}

class Fireball extends Actor {
  constructor(position, speed) {
    super(position, new Vector(1, 1), speed);
  }

  get type() {
    return 'fireball';
  }

  getNextPosition(time = 1) {
    return this.pos.plus(this.speed.times(time));
  }

  handleObstacle() {
    this.speed = new Vector(-this.speed.x, -this.speed.y);
  }

  act(time, level) {
    const nextPosition = this.getNextPosition(time);
    if (level.obstacleAt(nextPosition, this.size) === undefined) {
      this.pos = nextPosition;
    }
    if (level.obstacleAt(nextPosition, this.size) !== undefined) {
      this.handleObstacle();
    }
  }
}

class HorizontalFireball extends Fireball {
  constructor(position) {
    super(position, new Vector(2, 0));
  }
}

class VerticalFireball extends Fireball {
  constructor(position) {
    super(position, new Vector(0, 2));  
  }
}

class FireRain extends Fireball {
  constructor(position) {
    super(position, new Vector(0, 3));
    this.initialPos = position;
  }

  handleObstacle() {
    this.pos = this.initialPos;
  }
}

class Coin extends Actor {
  constructor(position) {
    super(position, new Vector(0.6, 0.6));
    this.pos = this.pos.plus(new Vector(0.2, 0.1));
    this.realPos = this.pos;    
    this.springSpeed = 8;
    this.springDist = 0.07;
    this.spring = Math.random() * (2 * Math.PI);
  }

  get type() {
    return 'coin';
  }

  updateSpring(time = 1) {
    this.spring = this.spring + this.springSpeed * time;
  }

  getSpringVector() {
    return new Vector(0, Math.sin(this.spring) * this.springDist);
  }

  getNextPosition(time = 1) {
    this.updateSpring(time);
    return this.realPos.plus(this.getSpringVector());
  }

  act(time) {
    this.pos = this.getNextPosition(time);
  }
}

class Player extends Actor {
  constructor(position) {
    super(position, new Vector(0.8, 1.5));
    this.pos = this.pos.plus(new Vector(0, -0.5));
  }

  get type() {
    return 'player';
  }
}

const actorDict = {
  '@': Player,
  'o': Coin,
  '=': HorizontalFireball,
  '|': VerticalFireball,
  'v': FireRain
}

loadLevels()
  .then(function (response) {
    try {
      const schemas = JSON.parse(response);
      const parser = new LevelParser(actorDict);
      runGame(schemas, parser, DOMDisplay)
        .then(() => alert('Вы выиграли приз!'));
    } catch(err) {
      console.log(err.name, err.message);
    }
  })
