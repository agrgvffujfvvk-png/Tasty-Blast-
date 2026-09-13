"use strict";

/* =========================================================
   TASTY BLAST
   Complete Match-3 Game
   ========================================================= */

const SIZE = 8;

const FOOD = [
  {id:"pizza", icon:"🍕"},
  {id:"burger", icon:"🍔"},
  {id:"fries", icon:"🍟"},
  {id:"donut", icon:"🍩"},
  {id:"cake", icon:"🍰"},
  {id:"strawberry", icon:"🍓"},
  {id:"watermelon", icon:"🍉"},
  {id:"icecream", icon:"🍦"}
];

/* =========================================================
   LEVEL GENERATOR
   ========================================================= */

function createLevel(number){

  const area = Math.floor((number - 1) / 25) + 1;

  const difficulty = Math.min(
    1 + Math.floor((number - 1) / 10),
    70
  );

  let target =
    450 +
    number * 120 +
    difficulty * 30;

  let moves =
    Math.max(
      16,
      32 - Math.floor(number / 12)
    );

  let foodTypes =
    Math.min(
      8,
      5 + Math.floor(number / 15)
    );

  let obstacle = null;

  if(number >= 10 && number % 5 === 0){
    obstacle = "block";
  }

  if(number >= 20 && number % 7 === 0){
    obstacle = "ice";
  }

  return {
    number,
    area,
    target,
    moves,
    foodTypes,
    obstacle
  };
}

/* =========================================================
   STATE
   ========================================================= */

let currentLevel = 1;
let board = [];

let score = 0;
let moves = 0;

let selected = null;
let busy = false;

let pointerStart = null;

let coins = 100;

let stars = {};
let unlockedLevel = 1;

let boosters = {
  hammer: 2,
  shuffle: 2,
  extra: 1
};

let soundEnabled = true;
let musicEnabled = true;
let premium = false;

let boosterMode = null;

/* =========================================================
   STORAGE
   ========================================================= */

function loadData(){

  try{

    const data =
      JSON.parse(
        localStorage.getItem("TASTY_BLAST_DATA")
      );

    if(!data) return;

    currentLevel =
      data.currentLevel || 1;

    unlockedLevel =
      data.unlockedLevel || 1;

    coins =
      data.coins ?? 100;

    stars =
      data.stars || {};

    boosters =
      data.boosters || boosters;

    soundEnabled =
      data.soundEnabled ?? true;

    musicEnabled =
      data.musicEnabled ?? true;

    premium =
      data.premium ?? false;

  }catch(error){
    console.log(error);
  }
}

function saveData(){

  localStorage.setItem(
    "TASTY_BLAST_DATA",
    JSON.stringify({
      currentLevel,
      unlockedLevel,
      coins,
      stars,
      boosters,
      soundEnabled,
      musicEnabled,
      premium
    })
  );
}

/* =========================================================
   SCREEN SYSTEM
   ========================================================= */

function showScreen(id){

  document
    .querySelectorAll(".screen")
    .forEach(screen =>
      screen.classList.remove("active")
    );

  document
    .getElementById(id)
    .classList.add("active");

  updateGlobalUI();
}

function openMap(){
  showScreen("mapScreen");
  renderMap();
}

function openShop(){
  showScreen("shopScreen");
}

function openRewards(){
  showScreen("rewardsScreen");
  updateRewardButton();
}

function openPremium(){
  showScreen("premiumScreen");
}

function openSettings(){
  showScreen("settingsScreen");
}

/* =========================================================
   GLOBAL UI
   ========================================================= */

function updateGlobalUI(){

  document.getElementById("homeCoins").textContent = coins;
  document.getElementById("mapCoins").textContent = coins;
  document.getElementById("shopCoins").textContent = coins;

  document.getElementById("hammerCount").textContent =
    boosters.hammer;

  document.getElementById("shuffleCount").textContent =
    boosters.shuffle;

  document.getElementById("extraCount").textContent =
    boosters.extra;

  document.getElementById("soundStatus").textContent =
    soundEnabled ? "تشغيل" : "إيقاف";

  document.getElementById("musicStatus").textContent =
    musicEnabled ? "تشغيل" : "إيقاف";
}

/* =========================================================
   MAP
   ========================================================= */

function renderMap(){

  const map =
    document.getElementById("map");

  map.innerHTML = "";

  const totalLevels = 1000;

  for(let i = 1; i <= totalLevels; i++){

    const node =
      document.createElement("button");

    node.className = "map-node";

    const unlocked =
      i <= unlockedLevel;

    const completed =
      stars[i] !== undefined;

    if(unlocked)
      node.classList.add("unlocked");

    if(i === unlockedLevel)
      node.classList.add("current");

    if(!unlocked)
      node.classList.add("locked");

    if(unlocked){

      node.innerHTML = `
        <span class="node-number">${i}</span>
        <span class="node-stars">
          ${getStarsHTML(stars[i] || 0)}
        </span>
      `;

      node.onclick = () =>
        startLevel(i);

    }else{

      node.innerHTML =
        `<span class="node-lock">🔒</span>
         <span class="node-number">${i}</span>`;
    }

    map.appendChild(node);
  }
}

function getStarsHTML(value){

  return "⭐".repeat(value) +
    "☆".repeat(3 - value);
}

/* =========================================================
   START LEVEL
   ========================================================= */

function startLevel(level){

  if(level > unlockedLevel)
    return;

  currentLevel = level;

  const config =
    createLevel(level);

  score = 0;
  moves = config.moves;

  selected = null;
  busy = false;
  boosterMode = null;

  document.getElementById("gameLevel").textContent =
    level;

  document.getElementById("gameTarget").textContent =
    config.target;

  document.getElementById("gameMoves").textContent =
    moves;

  document.getElementById("gameScore").textContent =
    score;

  generateBoard(config.foodTypes);

  showScreen("gameScreen");

  renderBoard();

  setGameMessage(
    "طابق 3 مأكولات أو أكثر!"
  );
}

/* =========================================================
   BOARD GENERATION
   ========================================================= */

function generateBoard(types){

  board =
    Array.from(
      {length:SIZE},
      () => Array(SIZE).fill(null)
    );

  for(let r = 0; r < SIZE; r++){

    for(let c = 0; c < SIZE; c++){

      let food;

      do{
        food =
          FOOD[
            Math.floor(
              Math.random() * types
            )
          ].id;

      }while(wouldMakeMatch(r,c,food));

      board[r][c] = {
        food,
        special: null
      };
    }
  }
}

function wouldMakeMatch(r,c,food){

  if(
    c >= 2 &&
    board[r][c-1]?.food === food &&
    board[r][c-2]?.food === food
  )
    return true;

  if(
    r >= 2 &&
    board[r-1][c]?.food === food &&
    board[r-2][c]?.food === food
  )
    return true;

  return false;
}

/* =========================================================
   RENDER BOARD
   ========================================================= */

function renderBoard(matches = new Set()){

  const boardElement =
    document.getElementById("board");

  boardElement.innerHTML = "";

  for(let r=0;r<SIZE;r++){

    for(let c=0;c<SIZE;c++){

      const tile =
        document.createElement("div");

      tile.className = "tile";

      tile.dataset.row = r;
      tile.dataset.col = c;

      const cell = board[r][c];

      if(cell){

        const food =
          FOOD.find(
            item => item.id === cell.food
          );

        const foodElement =
          document.createElement("div");

        foodElement.className =
          "food";

        if(cell.special)
          foodElement.classList.add("special");

        foodElement.textContent =
          food.icon;

        tile.appendChild(foodElement);

        if(
          cell.special === "line"
        ){
          foodElement.textContent =
            "⚡" + food.icon;
        }

        if(
          cell.special === "bomb"
        ){
          foodElement.textContent =
            "💥";
        }
      }

      if(
        selected &&
        selected.r === r &&
        selected.c === c
      ){
        tile.classList.add("selected");
      }

      if(
        matches.has(`${r},${c}`)
      ){
        tile.classList.add("matched");
      }

      boardElement.appendChild(tile);
    }
  }

  updateGlobalUI();
}

/* =========================================================
   INPUT
   ========================================================= */

const boardElement =
  document.getElementById("board");

boardElement.addEventListener(
  "pointerdown",
  event => {

    if(busy) return;

    const tile =
      event.target.closest(".tile");

    if(!tile) return;

    const r =
      Number(tile.dataset.row);

    const c =
      Number(tile.dataset.col);

    if(boosterMode){

      useBoosterOnCell(r,c);
      return;
    }

    pointerStart = {
      x:event.clientX,
      y:event.clientY,
      r,
      c
    };

    selectCell(r,c);
  }
);

boardElement.addEventListener(
  "pointerup",
  async event => {

    if(
      busy ||
      !pointerStart ||
      boosterMode
    ){
      pointerStart = null;
      return;
    }

    const start = pointerStart;

    pointerStart = null;

    const dx =
      event.clientX - start.x;

    const dy =
      event.clientY - start.y;

    const distance =
      Math.sqrt(dx*dx + dy*dy);

    if(distance < 18)
      return;

    let r = start.r;
    let c = start.c;

    if(Math.abs(dx) > Math.abs(dy)){

      c += dx > 0 ? 1 : -1;

    }else{

      r += dy > 0 ? 1 : -1;
    }

    if(!inside(r,c))
      return;

    selected = null;

    await trySwap(
      start.r,
      start.c,
      r,
      c
    );
  }
);

boardElement.addEventListener(
  "click",
  async event => {

    if(busy || boosterMode)
      return;

    const tile =
      event.target.closest(".tile");

    if(!tile)
      return;

    const r =
      Number(tile.dataset.row);

    const c =
      Number(tile.dataset.col);

    if(!selected){

      selectCell(r,c);
      return;
    }

    if(
      selected.r === r &&
      selected.c === c
    ){

      selected = null;
      renderBoard();
      return;
    }

    if(
      adjacent(
        selected.r,
        selected.c,
        r,
        c
      )
    ){

      const first = selected;

      selected = null;

      await trySwap(
        first.r,
        first.c,
        r,
        c
      );

    }else{

      selectCell(r,c);
    }
  }
);

function selectCell(r,c){

  selected = {r,c};

  renderBoard();
}

/* =========================================================
   SWAP
   ========================================================= */

async function trySwap(r1,c1,r2,c2){

  if(!adjacent(r1,c1,r2,c2))
    return;

  busy = true;

  swap(r1,c1,r2,c2);

  renderBoard();

  await wait(130);

  const matches =
    findMatches();

  if(matches.size === 0){

    swap(r1,c1,r2,c2);

    renderBoard();

    setGameMessage(
      "هذه الحركة لا تصنع تطابقًا!"
    );

    await wait(300);

    busy = false;

    return;
  }

  moves--;

  updateGameStats();

  await resolveMatches(matches);

  busy = false;

  checkEnd();
}

/* =========================================================
   MATCH ENGINE
   ========================================================= */

function findMatches(){

  const matches =
    new Set();

  for(let r=0;r<SIZE;r++){

    let start=0;

    while(start<SIZE){

      const food =
        board[r][start]?.food;

      if(!food){
        start++;
        continue;
      }

      let end=start+1;

      while(
        end<SIZE &&
        board[r][end]?.food === food
      ){
        end++;
      }

      if(end-start>=3){

        for(let c=start;c<end;c++)
          matches.add(`${r},${c}`);
      }

      start=end;
    }
  }

  for(let c=0;c<SIZE;c++){

    let start=0;

    while(start<SIZE){

      const food =
        board[start][c]?.food;

      if(!food){
        start++;
        continue;
      }

      let end=start+1;

      while(
        end<SIZE &&
        board[end][c]?.food === food
      ){
        end++;
      }

      if(end-start>=3){

        for(let r=start;r<end;r++)
          matches.add(`${r},${c}`);
      }

      start=end;
    }
  }

  return matches;
}

/* =========================================================
   RESOLVE
   ========================================================= */

async function resolveMatches(matches){

  let combo=1;

  while(matches.size){

    const points =
      matches.size *
      20 *
      combo;

    score += points;

    const special =
      detectSpecial(matches);

    renderBoard(matches);

    setGameMessage(
      combo > 1
        ? `🔥 كومبو ×${combo}  +${points}`
        : `🍴 تطابق! +${points}`
    );

    await wait(250);

    for(const key of matches){

      const [r,c] =
        key.split(",").map(Number);

      board[r][c] = null;
    }

    if(special){

      const {r,c,type,food} =
        special;

      if(inside(r,c)){

        board[r][c] = {
          food,
          special:type
        };
      }
    }

    renderBoard();

    await wait(100);

    collapse();

    renderBoard();

    await wait(180);

    fillBoard();

    renderBoard();

    await wait(250);

    matches =
      findMatches();

    combo++;
  }

  updateGameStats();
}

function detectSpecial(matches){

  const rows = {};
  const cols = {};

  for(const key of matches){

    const [r,c] =
      key.split(",").map(Number);

    rows[r] =
      (rows[r] || 0)+1;

    cols[c] =
      (cols[c] || 0)+1;
  }

  for(const r in rows){

    if(rows[r] >= 4){

      const c =
        Number(
          [...matches]
          .map(x=>x.split(",").map(Number))
          .find(x=>x[0]===Number(r))[1]
        );

      return {
        r:Number(r),
        c,
        type:rows[r] >= 5 ? "bomb" : "line",
        food:board[r][c]?.food || randomFood().id
      };
    }
  }

  for(const c in cols){

    if(cols[c] >= 4){

      const r =
        Number(
          [...matches]
          .map(x=>x.split(",").map(Number))
          .find(x=>x[1]===Number(c))[0]
        );

      return {
        r,
        c:Number(c),
        type:cols[c] >= 5 ? "bomb" : "line",
        food:board[r][c]?.food || randomFood().id
      };
    }
  }

  return null;
}

/* =========================================================
   COLLAPSE / REFILL
   ========================================================= */

function collapse(){

  for(let c=0;c<SIZE;c++){

    let write=SIZE-1;

    for(let r=SIZE-1;r>=0;r--){

      if(board[r][c]){

        board[write][c] =
          board[r][c];

        if(write!==r)
          board[r][c]=null;

        write--;
      }
    }
  }
}

function fillBoard(){

  const types =
    createLevel(currentLevel).foodTypes;

  for(let r=0;r<SIZE;r++){

    for(let c=0;c<SIZE;c++){

      if(!board[r][c]){

        board[r][c] = {
          food:
            FOOD[
              Math.floor(
                Math.random()*types
              )
            ].id,
          special:null
        };
      }
    }
  }
}

/* =========================================================
   BOOSTERS
   ========================================================= */

function useBooster(type){

  if(busy) return;

  if(!boosters[type]){
    setGameMessage("لا تملك هذه الأداة!");
    return;
  }

  boosterMode = type;

  setGameMessage(
    type === "hammer"
      ? "اختر قطعة لحذفها 🔨"
      : type === "shuffle"
        ? "اضغط أي مكان لخلط اللوحة 🔀"
        : "اختر أي قطعة لإضافة حركة ➕"
  );

  if(type === "shuffle"){
    shuffleBoard();
    boosters.shuffle--;
    boosterMode=null;
    saveData();
    renderBoard();
    setGameMessage("تم خلط اللوحة!");
  }
}

function useBoosterOnCell(r,c){

  if(!boosterMode)
    return;

  const type =
    boosterMode;

  if(type==="hammer"){

    board[r][c]=null;

    collapse();
    fillBoard();

    boosters.hammer--;

    boosterMode=null;

    renderBoard();

    setGameMessage("🔨 تم حذف القطعة!");

  }else if(type==="extra"){

    moves++;

    boosters.extra--;

    boosterMode=null;

    updateGameStats();

    setGameMessage(
      "➕ حصلت على حركة إضافية!"
    );
  }

  saveData();
}

function shuffleBoard(){

  const values=[];

  for(let r=0;r<SIZE;r++)
    for(let c=0;c<SIZE;c++)
      values.push(board[r][c]);

  for(let i=values.length-1;i>0;i--){

    const j =
      Math.floor(Math.random()*(i+1));

    [values[i],values[j]] =
      [values[j],values[i]];
  }

  let index=0;

  for(let r=0;r<SIZE;r++)
    for(let c=0;c<SIZE;c++)
      board[r][c]=values[index++];
}

/* =========================================================
   SHOP
   ========================================================= */

function buyItem(type,price){

  if(coins < price){

    alert("ليس لديك عملات كافية.");
    return;
  }

  coins -= price;
  boosters[type]++;

  saveData();
  updateGlobalUI();

  alert("تم شراء الأداة بنجاح!");
}

/* =========================================================
   RESULT
   ========================================================= */

function checkEnd(){

  const config =
    createLevel(currentLevel);

  if(score >= config.target){

    finishLevel(true);
    return;
  }

  if(moves <= 0){

    finishLevel(false);
    return;
  }

  setGameMessage(
    `تبقت ${moves} حركة`
  );
}

function finishLevel(won){

  const overlay =
    document.getElementById("resultOverlay");

  overlay.classList.remove("hidden");

  if(won){

    const levelStars =
      calculateStars();

    const old =
      stars[currentLevel] || 0;

    stars[currentLevel] =
      Math.max(old,levelStars);

    if(
      currentLevel >= unlockedLevel &&
      unlockedLevel < 1000
    ){
      unlockedLevel =
        currentLevel + 1;
    }

    coins +=
      25 +
      levelStars * 10;

    document.getElementById("resultIcon")
      .textContent="🏆";

    document.getElementById("resultTitle")
      .textContent="أحسنت!";

    document.getElementById("resultDescription")
      .textContent="لقد أكملت المرحلة بنجاح!";

    document.getElementById("resultStars")
      .textContent=getStarsHTML(levelStars);

  }else{

    document.getElementById("resultIcon")
      .textContent="😅";

    document.getElementById("resultTitle")
      .textContent="حاول مرة أخرى";

    document.getElementById("resultDescription")
      .textContent="نفدت حركاتك قبل تحقيق الهدف.";

    document.getElementById("resultStars")
      .textContent="☆☆☆";
  }

  document.getElementById("resultScore")
    .textContent=score.toLocaleString("ar-EG");

  saveData();
}

function calculateStars(){

  const target =
    createLevel(currentLevel).target;

  if(score >= target*2)
    return 3;

  if(score >= target*1.4)
    return 2;

  return 1;
}

function nextLevel(){

  document
    .getElementById("resultOverlay")
    .classList.add("hidden");

  if(currentLevel < unlockedLevel){

    startLevel(currentLevel+1);

  }else{

    startLevel(currentLevel);
  }
}

function quitLevel(){

  document
    .getElementById("resultOverlay")
    .classList.add("hidden");

  selected=null;
  busy=false;

  openMap();
}

/* =========================================================
   RESTART
   ========================================================= */

function restartCurrentLevel(){

  if(busy) return;

  startLevel(currentLevel);
}

/* =========================================================
   REWARDS
   ========================================================= */

function claimDailyReward(){

  const today =
    new Date().toDateString();

  const last =
    localStorage.getItem(
      "TASTY_LAST_REWARD"
    );

  if(last === today){

    document.getElementById("rewardText")
      .textContent =
      "لقد حصلت على مكافأتك اليوم. عد غدًا!";

    return;
  }

  coins += 50;

  localStorage.setItem(
    "TASTY_LAST_REWARD",
    today
  );

  saveData();
  updateGlobalUI();
  updateRewardButton();

  document.getElementById("rewardText")
    .textContent =
    "🎉 حصلت على 50 عملة!";
}

function updateRewardButton(){

  const today =
    new Date().toDateString();

  const last =
    localStorage.getItem(
      "TASTY_LAST_REWARD"
    );

  const button =
    document.getElementById("claimReward");

  if(last === today){

    button.textContent =
      "تم الاستلام ✓";

    button.disabled=true;

  }else{

    button.textContent =
      "احصل عليها";

    button.disabled=false;
  }
}

/* =========================================================
   PREMIUM
   ========================================================= */

function subscribePremium(){

  /*
    نقطة ربط الاشتراك الحقيقي.
    عند تحويل اللعبة إلى Android
    يتم استبدال هذا الجزء بنظام
    Google Play Billing.
  */

  alert(
    "نسخة التطوير: نظام Premium مهيأ للربط باشتراك 80 جنيه شهريًا."
  );

  /*
    للاختبار المحلي فقط:
    premium = true;
    saveData();
  */
}

/* =========================================================
   SETTINGS
   ========================================================= */

function toggleSound(){

  soundEnabled =
    !soundEnabled;

  saveData();
  updateGlobalUI();
}

function toggleMusic(){

  musicEnabled =
    !musicEnabled;

  saveData();
  updateGlobalUI();
}

function resetProgress(){

  if(
    !confirm(
      "هل تريد حذف جميع تقدمك؟"
    )
  )
    return;

  localStorage.removeItem(
    "TASTY_BLAST_DATA"
  );

  currentLevel=1;
  unlockedLevel=1;
  coins=100;
  stars={};

  boosters={
    hammer:2,
    shuffle:2,
    extra:1
  };

  premium=false;

  saveData();
  updateGlobalUI();
  openMap();
}

/* =========================================================
   HELPERS
   ========================================================= */

function swap(r1,c1,r2,c2){

  [
    board[r1][c1],
    board[r2][c2]
  ]=[
    board[r2][c2],
    board[r1][c1]
  ];
}

function adjacent(r1,c1,r2,c2){

  return (
    Math.abs(r1-r2) +
    Math.abs(c1-c2)
  ) === 1;
}

function inside(r,c){

  return (
    r>=0 &&
    r<SIZE &&
    c>=0 &&
    c<SIZE
  );
}

function randomFood(){

  return FOOD[
    Math.floor(
      Math.random()*FOOD.length
    )
  ];
}

function wait(ms){

  return new Promise(
    resolve=>setTimeout(resolve,ms)
  );
}

function setGameMessage(text){

  document.getElementById(
    "gameMessage"
  ).textContent=text;
}

function updateGameStats(){

  document.getElementById(
    "gameMoves"
  ).textContent=moves;

  document.getElementById(
    "gameScore"
  ).textContent=
    score.toLocaleString("ar-EG");

  updateGlobalUI();
}

/* =========================================================
   INITIALIZE
   ========================================================= */

loadData();
updateGlobalUI();
showScreen("homeScreen");