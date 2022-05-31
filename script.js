let loadingBox = document.getElementById("loading-box");
let loadingMessage = document.getElementById("loading-message");
    
let gameBox = document.getElementById("game-box");
let grid = document.getElementById("grid");
let shotCounter = document.getElementById("shotCounter");
let winMessage = document.getElementById("win-message");

const assets = ["btn_airstrike","btn_radar","btn_salvo","btn_shell","hit","miss","ship_down_hit","ship_down","ship_horizontal_hit","ship_horizontal","ship_left_hit","ship_left","ship_right_hit","ship_right","ship_up_hit","ship_up","ship_vertical_hit","ship_vertical","water"];
const images = {};
let loadedAssets = 0;
let totalAssets = assets.length;


const boardWidth = 15;
const boardHeight = 15;
const tileSize = 32;

const shipCount = 5;
const shotCount = 90;

function random(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

// ship
// ship is given its x, y, length, and rotation.
// when asked for it can tell if a shell or ship is hitting it.
class Ship {
    constructor(x, y, length, vertical) {
        this.x = x;
        this.y = y;
        this.length = length;
        this.vertical = vertical;

        this.sections = [];
        for(let i = 0; i < this.length; i++) {
            this.sections.push(false);
        }
    }

    // does a shell at x, y hit the ship?
    hits(x, y) {
        let hit = false;
        let index;
        if(this.vertical) {
            if(this.x != x) return false;
            if(y >= this.y && y < (this.y + this.length)) {
                hit = true;
                
                index = y - this.y;
            }
        }

        if(!this.vertical) {
            if(this.y != y) return false;
            if(x >= this.x && x < (this.x + this.length)) {
                hit = true;

                index = x - this.x;
            };
        }

        if(hit) this.sections[index] = true;
        
        return hit;
    }

    // does the ship passed collide with this ship?
    collides(ship) {
        let a = {
            x: this.x,
            y: this.y,
            width: this.vertical ? 1 : this.length,
            height: this.vertical ? this.length : 1
        };
        let b = {
            x: ship.x,
            y: ship.y,
            width: ship.vertical ? 1 : this.length,
            height: ship.vertical ? this.length : 1
        };
        
        return !(
            ((a.y + a.height) < (b.y)) ||
            (a.y > (b.y + b.height)) ||
            ((a.x + a.width) < b.x) ||
            (a.x > (b.x + b.width))
        );
    }

    // has this ship been destroyed?
    destroyed() {
        let destroyed = true;
        for(let i = 0; i < this.sections.length; i++) {
            if(this.sections[i] === false) destroyed = false;
        }

        return destroyed;
    }

    // get the appropriate asset for each cell
    getAsset(x, y, hit) {
        let index = this.vertical ? y : x;
        index -= this.vertical ? this.y : this.x;

        if(index > 0 && index < this.length - 1) {
            return `ship_${this.vertical ? "vertical" : "horizontal"}${hit ? "_hit" : ""}`;
        } else if(index == 0) {
            return `ship_${this.vertical ? "up" : "left"}${hit ? "_hit" : ""}`;
        } else {
            return `ship_${this.vertical ? "down" : "right"}${hit ? "_hit" : ""}`;
        }
    }
}

// this class holds the image element
class TileElement {
    constructor(parent, x, y) {
        let img = document.createElement("img");
        img.width = tileSize;
        img.height = tileSize;
        img.draggable = "false";

        this.img = img;
        parent.appendChild(img);
    }

    // display new image
    display(asset) {
        this.img.src = images[asset];
    }
}

// main game class, this is separate so that multiple games can be played
class Battleships {
    constructor(parentElem) {
        this.parentElem = parentElem;
        this.parentElem.innerHTML = "";

        this.tileElements = [];

        this.winInterval = null;

        this.running = true;
        this.ships = [];
        this.shots = shotCount;
        this.previousShells = [];

        shotCounter.innerHTML = `Shots left: ${this.shots}`;
        winMessage.classList.add("hidden");

        // gen ships
        // keep on generating ships until one that doesn't collide with the others is found
        for(let i = 0; i < shipCount; i++) {
            let ship;
            do {
                let slen = random(3, 7);
                ship = new Ship(
                    random(0, boardWidth - slen),
                    random(0, boardHeight - slen),
                    slen,
                    (random(0, 1) == 1) ? true : false
                );
            } while(this.fullCollideShip(ship).collides);
            this.ships.push(ship);
        }

        // create images, setup event listeners
        for(let y = 0; y < boardHeight; y++) {
            this.tileElements.push([]);
            let line = document.createElement("div");
            for(let x = 0; x < boardWidth; x++) {
                let tileElem = new TileElement(line, x, y);
                tileElem.img.addEventListener("click", e => {
                    if(!this.running) return;
                    if(this.previousShellsFullCollide(x, y)) return;
            
                    let collides = this.fullCollideShell(x, y);
                    if(collides.collides) {
                        tileElem.display("hit");
                    } else tileElem.display("miss");

                    this.previousShells.push([x, y]);

                    this.shots--;
                    shotCounter.innerHTML = `Shots left: ${this.shots}`;

                    if(this.shots == 0 || this.checkWin()) {
                        this.running = false;
                        this.gameEnd(this.checkWin());
                    }
                });
                
                tileElem.display("water");
                this.tileElements[y].push(tileElem);
            }
            parentElem.appendChild(line);
        }
    }

    // checks all ships to see if shell collides
    // if it does collide it returns the id of the ship
    fullCollideShell(x, y) {
        for(let i = 0; i < this.ships.length; i++) {
            if(this.ships[i].hits(x, y)) return {
                collides: true,
                ship: i
            };
        }

        return {
            collides: false
        }
    }

    previousShellsFullCollide(x, y) {
        for(let i = 0; i < this.previousShells.length; i++) {
            let pshell = this.previousShells[i];
            if(pshell[0] == x && pshell[1] == y) return true;
        }

        return false;
    }

    // same as above, but ships are checked instead of shells
    fullCollideShip(ship) {
        for(let i = 0; i < this.ships.length; i++) {
            if(this.ships[i].collides(ship)) return {
                collides: true,
                ship: i
            };
        }

        return {
        collides: false
        };
    }

    // has the game been won?
    checkWin() {
        let win = true;
        for(let i = 0; i < this.ships.length; i++) {
            if(!this.ships[i].destroyed()) win = false;
        }

        return win;
    }

    // this is run on the end of the game
    gameEnd(win) {
        // show ships that were not hit
        for(let y = 0; y < this.tileElements.length; y++) {
            for(let x = 0; x < this.tileElements[y].length; x++) {
                let tile = this.tileElements[y][x];

                let collision = this.fullCollideShell(x, y);
                if(collision.collides) tile.display(this.ships[collision.ship].getAsset(x, y, false));
                else tile.display("water");
            }
        }

        // show ships that were hit
        for(let i in this.previousShells) {
            let [x, y] = this.previousShells[i];
            let tile = this.tileElements[y][x];

            let collision = this.fullCollideShell(x, y);
            if(collision.collides) {
                tile.display(this.ships[collision.ship].getAsset(x, y, true));
                
            } else tile.display("miss");
        }

        // display win/lose message
        winMessage.classList.remove("hidden");
        winMessage.innerHTML = win ? "You win!!!" : "You lose";
        if(win) {
            this.winInterval = setInterval(() => {
                winMessage.style.color = `rgba(${Math.floor(Math.random() * 255)}, ${Math.floor(Math.random() * 255)}, ${Math.floor(Math.random() * 255)})`;
            }, 500);
        }
    }
}

// download asset as image, convert it to base64
// adds it to the images object, and displays an updated loading counter
function downloadAsset(name) {
    return new Promise(resolve => {
        let src = `assets/${name}.png`;
        let img = new Image();
        img.src = src;
        img.addEventListener("load", e => {
            let canvas = document.createElement("canvas");
            let ctx = canvas.getContext("2d");
            canvas.width = img.naturalWidth;
            canvas.height = img.naturalHeight;
            ctx.imageSmoothingEnabled = false;
            ctx.drawImage(img, 0, 0);
            let data = canvas.toDataURL("image/png");
            images[name] = data;

            loadedAssets++;
            loadingMessage.innerHTML = `${Math.floor((loadedAssets/totalAssets) * 100)}%`;

            resolve();
        });
    });
}

// download assets, start game
Promise.all(assets.map(a => downloadAsset(a))).then(() => {
    loadingBox.classList.add("hidden");
    gameBox.classList.remove("hidden");

    let battleships = new Battleships(grid);
    winMessage.addEventListener("click", (e) => {
        clearInterval(battleships.winInterval);
        battleships = new Battleships(grid);
    });
});