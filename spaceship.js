
//STARS ARE BUILT HERE

var canvas = document.createElement('canvas'); 
var ctx = canvas.getContext("2d"); 
document.body.appendChild(canvas); 
canvas.width = window.innerWidth; 
canvas.height = window.innerHeight;



var SPEED = 40;
var STAR_NUMBER = 250;
var StarStream = Rx.Observable.range(1, STAR_NUMBER)
.map(function() { return {
      x: parseInt(Math.random() * canvas.width),
      y: parseInt(Math.random() * canvas.height),
      size: Math.random() * 3 + 1
}; })
.toArray().flatMap(function(starArray) {
    return Rx.Observable.interval(SPEED).map(function() { 
        starArray.forEach(function(star) {
            if (star.y >= canvas.height) {
                star.y = 0; // Reset star to top of the screen
            }
            star.y += 3; // Move star });
            
            
        });
        return starArray; 
    })
})
function paintStars(stars) {
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, canvas.width, canvas.height); ctx.fillStyle = '#ffffff'; stars.forEach(function(star) {
        ctx.fillRect(star.x, star.y, star.size, star.size);
      });
    }
//HERO IS BUILT HERE

var HERO_Y = canvas.height - 40;
var mouseMove = Rx.Observable.fromEvent(canvas, 'mousemove'); 
var SpaceShip = mouseMove.map(function(event) { return {
    x: event.clientX,
    y: HERO_Y };
}).startWith({
    x: canvas.width / 2,
    y: HERO_Y
});
//Startwith is used to provide the initial value to paint the spaceship otherwise until the mouse moves, the spaceship is invisible
function paintSpaceShip(x, y) { 
    
    drawTriangle(x, y, 20, '#ff0000', 'up');
}
function drawTriangle(x, y, width, color, direction) { ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x - width, y);
    ctx.lineTo(x, direction === 'up' ? y - width : y + width); ctx.lineTo(x + width, y);
    ctx.lineTo(x - width,y);
    ctx.fill();
}
//each time stars observable refreshes the screen, the spaceship of the hero goes away and only when the mouse comes it appears again. 
//To solve this issue using combinelatest operator we combine the two observables and each time either of them emits a value a combined object of stars and spaceship
//objects are returned to the observer function, in this case renderScene
function renderScene(actors) {
    paintStars(actors.stars);
    paintSpaceShip(actors.spaceship.x, actors.spaceship.y);
    paintEnemies(actors.enemies, actors.spaceship);
    paintHeroShots(actors.heroShots, actors.enemies)
    paintScore(actors.score);
}




//ENEMIES BUILT HERE
var ENEMY_FREQ = 1500;
var ENEMY_SHOOTING_FREQ = 750;
function isVisible(obj) {
    return obj.x > -40 && obj.x < canvas.width + 40 &&
        obj.y > -40 && obj.y < canvas.height + 40;
}
var Enemies = Rx.Observable.interval(ENEMY_FREQ)
.scan(function(enemyArray) { 
    var enemy = {
        x: parseInt(Math.random() * canvas.width),
        y: -30,
        shots: [],
        isDead:false
  };
  
    Rx.Observable.interval(ENEMY_SHOOTING_FREQ).subscribe(function() {
        if(!enemy.isDead){ 
            enemy.shots.push({ x: enemy.x, y: enemy.y });
        }
        enemy.shots = enemy.shots.filter(isVisible);
    });
  
   
    enemyArray.push(enemy);
    return enemyArray.filter(isVisible).filter(function(enemy) {
        return !(enemy.isDead && enemy.shots.length === 0); });
}, [])

function paintEnemies(enemies, spaceship) { enemies.forEach(function(enemy) {
    enemy.y += 5;
    enemy.x += getRandomInt(-15, 15);
    if(!enemy.isDead){
        drawTriangle(enemy.x, enemy.y, 20, '#00ff00', 'down'); 
    }
    
    enemy.shots.forEach(function(shot) {
        
            shot.y += SHOOTING_SPEED;
            drawTriangle(shot.x, shot.y, 5, '#00ffff', 'down');
        
        
        
    });
});
}
function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}




//FIRESHOTS ARE BUILT HERE

var playerFiring = Rx.Observable .merge(
    Rx.Observable.fromEvent(canvas, 'click'), 
    Rx.Observable.fromEvent(canvas, 'keydown').
    filter(function(evt) { return evt.keycode === 32; }) 
    ).sample(200).timestamp();
    
var HeroShots = Rx.Observable .combineLatest(
    playerFiring,
    SpaceShip,
    function(shotEvents, spaceShip) {
        return { x : spaceShip.x, timestamp:shotEvents.timestamp}
    }).startWith({}).distinctUntilChanged(function(shot) { return shot.timestamp; })
    .scan(function(shotArray, shot) {
            shotArray.push({x: shot.x, y: HERO_Y}); 
            return shotArray;
        }, []
    );

function collision(target1, target2) {
    return (target1.x > target2.x - 20 && target1.x < target2.x + 20) &&
                (target1.y > target2.y - 20 && target1.y < target2.y + 20);
    }
    var SHOOTING_SPEED = 15;
    function paintHeroShots(heroShots, enemies) {
    heroShots.forEach(function(shot) {
        for(var l =0; l<enemies.length;l++){
            var enemy = enemies[l];
            
            if(!enemy.isDead && collision(shot, enemy)){
                ScoreSubject.onNext(10);
                enemy.isDead = true;
                shot.x = shot.y = -100; 
                break;
            }
        }
        shot.y -= SHOOTING_SPEED;
        drawTriangle(shot.x, shot.y, 5, '#ffff00', 'up');
    }); 
}
//Checking whether spaceship is dead

function gameOver(spaceship, enemies){
    return enemies.some(function(enemy){
        if(collision(enemy,spaceship)){
            return true
        }
        return enemy.shots.some(function(shot){
            return collision(shot, spaceship)
                
            
                
        });

    });
}
//Keeping Score
var ScoreSubject = new Rx.Subject();
var score = ScoreSubject.scan(function (prev, cur) {
    console.log("scan")
    return prev + cur;
}, 0).startWith(0);

function paintScore(score) {
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 26px sans-serif'; ctx.fillText('Score: ' + score, 40, 43);
    }



var Game = Rx.Observable .combineLatest(
    StarStream, SpaceShip, Enemies,HeroShots, score, function(stars, spaceship, enemies, heroShots, score) {
    return {
    stars: stars, spaceship: spaceship, enemies: enemies, heroShots:heroShots, score:score
    }; }).sample(SPEED).takeWhile(function(actors){
        return gameOver(actors.spaceship,actors.enemies) === false
    });
Game.subscribe(renderScene, ()=>{
    console.log("error")
},
()=>{
     alert("You Lost");
     document.location.reload() 
});