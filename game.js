'use strict';

class Vector {
  constructor(positionX = 0, positionY = 0) {
    this.x = positionX;
    this.y = positionY;
  }

  plus(vector) {
    if (!(vector instanceof Vector)) {
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
    if (!(position instanceof Vector) || !(size instanceof Vector) || !(speed instanceof Vector)) {
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
    if (!(actor instanceof Actor)) {
      throw new Error(`Переданное значение не является объетом типа Actor`);
    }
    if (actor === this) {
      return false;
    }
    return actor.left < this.right &&
        actor.top < this.bottom &&
        actor.right > this.left &&
        actor.bottom > this.top;
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
    return this.grid.reduce((memo, el) => {
      if (memo > el.length) {
        return memo;
      }
      return el.length;
    }, 0);
  }

  isFinished() {
    return this.status !== null && this.finishDelay < 0;
  }

  actorAt(actor) {
    if (!(actor instanceof Actor)) {
      throw new Error(`Переданное значение не является объетом типа Actor`);
    }
    return this.actors.find(item => actor.isIntersect(item));
  }

  obstacleAt(position, size) {
    if (!(position instanceof Vector) && !(size instanceof Vector)) {
      throw new Error(`Переданное значение не является объетом типа Vector`);
    }

    if ((position.y + size.y) > this.height) {
      return 'lava';
    }
    if (position.y < 0 || position.x < 0 || (position.x + size.x) > this.width) {
      return 'wall';
    }

    const actorTop = Math.floor(position.y);
    const actorBottom = Math.ceil(position.y + size.y);
    const actorLeft = Math.floor(position.x);
    const actorRight = Math.ceil(position.x + size.x);

    for (let y = actorTop; y < actorBottom; y++) {
      for (let x = actorLeft; x < actorRight; x++) {
        const obstacle = this.grid[y][x];
        if (obstacle) {
          return obstacle;
        }
      }
    }
  }
  
  removeActor(actor) {
    const index = this.actors.indexOf(actor);
    if (index !== -1) {
      this.actors.splice(index, 1);
    }
  }
  
  noMoreActors(type) {
    return !this.actors.some(actor => actor.type === type);
  }
  
  playerTouched(type, actor) {
    if (this.status !== null) {
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
    return plan.map(rowPlan => rowPlan.split('').map(obstacleSymbol => this.obstacleFromSymbol(obstacleSymbol)));
  }

  createActors(plan) {
    const actors = [];

    plan.forEach((rowPlan, y) => {
      rowPlan.split('').forEach((actorSymbol, x) => {
        const actorConstructor = this.actorFromSymbol(actorSymbol);
        if (typeof actorConstructor === 'function') {
          const newActor = new actorConstructor(new Vector(x, y));
          if (newActor instanceof Actor) {
            actors.push(newActor);
          }
        }
      })
    })

    return actors;
  }

  parse(plan) {
    return new Level(this.createGrid(plan), this.createActors(plan));
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
    this.speed = this.speed.times(-1);
  }

  act(time, level) {
    const nextPosition = this.getNextPosition(time);

    if (level.obstacleAt(nextPosition, this.size)) {
      this.handleObstacle();
    } else {
      this.pos = nextPosition;
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
  constructor(position = new Vector(0, 0)) {
    super(position.plus(new Vector(0.2, 0.1)), new Vector(0.6, 0.6));
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
  constructor(position = new Vector(0, 0)) {
    super(position.plus(new Vector(0, -0.5)), new Vector(0.8, 1.5));
  }

  get type() {
    return 'player';
  }
}

const actorsDict = {
  '@': Player,
  'o': Coin,
  '=': HorizontalFireball,
  '|': VerticalFireball,
  'v': FireRain
};

loadLevels()
  .then(function (response) {
    try {
      const schemas = JSON.parse(response);
      const parser = new LevelParser(actorsDict);
      runGame(schemas, parser, DOMDisplay)
        .then(() => alert('Вы выиграли приз!'));
    } catch(err) {
      console.log(err.name, err.message);
    }
  })
