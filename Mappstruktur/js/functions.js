"use strict";

function setState() {
    const getReq = new Request("../functional_php/api.php");
    fetch(getReq)
        .then(getResp => {
            if (!getResp.ok) {
                throw Error(getResp.status);
            }
            return getResp.json();
        })
        .then(getResource => {
            // STATE = {currentUser:{}, currentPhase, coordinatesTarget};
            // STATE.key = value;
            // STATE.otherKey = othervalue;
            let user = getResource.user;
            console.table("rsrc currentUser", user);
            // let thisUser = getResource.user.find(user => user.id === currentUser);
            STATE.currentUser = user;
            STATE.currentPhase = user.storyPhase;
            STATE.coordinatesTarget = phases[STATE.currentPhase].targetLocation;
            STATE.dialogue = phases[STATE.currentPhase].dialogue;
            //Fattas lägga in dialogue i STATE, men finns empty string för att kunna köra över
            displayLocations();
            itemHandler(user.inventory)
        });
}

// Uppdatera spelarens state i databasen, borde kalla setState i slutet
// Ska kallas från dialog-funktionen och från varje spel-script
// Call setState
function patchState(key1, key2, value) {
    protecc(3.5);

    // Update the local State
    // let {key, value} = patchObj;
    STATE[key1][key2] = value;

    // Update the State on the database
    const patchReq = new Request("../functional_php/api.php", {
        method: "PATCH",
        body: JSON.stringify(STATE.currentUser),
        headers: {
            "Content-type": "application/json; charset=UTF-8"
        },
    });
    return fetch(patchReq)
        .then(patchResp => {
            if (!patchResp) {
                throw Error(patchResp.status);
            }
            return patchResp.json();
        })
        .then(patchResource => {
            console.log("API respons", patchResource);

            // This has to be set here as this has to happen after the state
            // in the database has been updated
            setState();
            displayLocations();
        })
        .catch(e => {
            console.log(e);
        });
}
/*
   Elementen kommer att vara laddade, här kommer vi göra de synliga genom att
   byta från en klass med display: none till en annan med t.ex display:flex etc.
   Vi måste också göra så att den int som indikerar vilket objekt i arrayen som
   kommer näst blir 0.
*/
function dialogueInit() {
    let dWrapper = document.getElementById("dialogueWrapper");
    let overlay = document.getElementById("overlayStandby");
    dWrapper.classList.remove("none");
    dWrapper.classList.add("flexer");
    overlay.classList.add("none");
    dWrapper.style.backgroundImage = `url("../../media/photos/${phases[STATE.currentPhase].backgroundImage}")`;
    // document.getElementById("startBtn").classList.add("none");
    dialogueBox.click();
}

// Elementen kommer att vara laddade, här kommer vi göra de synliga genom att
// byta från en klass med display: none till en annan med t.ex display:flex etc.
function gameInit(gameType) {
    if(gameType == true && STATE.currentPhase == 10) {
        endgame();
    } else {
        document.querySelector("#gameHolder").classList.add(gameType);
        classChecker(gameType);
        console.log("gameInit");
    }
}

function classChecker(gameType) {
    const gameHolder = document.querySelector("#gameHolder");
    const gameScript = document.createElement("script");

    switch (gameType) {
        case "piano":
            gameHolder.innerHTML = pianoString;
            break;
        case "matcher":
            gameHolder.innerHTML = matcherString;
            break;
        case "fairyQuest":
        case "snakeQuest":
            gameHolder.innerHTML = questString;
            break;
    }
    gameScript.setAttribute("src", `../../js/gameScripts/${gameType}Script.js`);
    gameHolder.appendChild(gameScript);
}

// Ska gömma eller visa olika föremål i spelarens inventory. Bildelementen är
// alltid där, vi måste byta mellan display: none och display: block/inline/whatever
function itemHandler(itemObj) {
    console.log("itemHandler", itemObj);

    Object.entries(itemObj).forEach((entry, index) => {
        const [key, value] = entry;
        if(key !== "gems"){
            if(value){
                let itemDiv = document.querySelector(`#itemDiv${index}`);
    
                itemDiv.innerHTML = `<img src="../../media/illustrations/items/item${index}.png"></img>`;
            }else{
                let itemDiv = document.querySelector(`#itemDiv${index}`);

                itemDiv.innerHTML = "";
            }
        }else{            
            entry[1].forEach(((gem, gemIndex) => {
        
                if(gem) {
                    let gemDiv = document.querySelector(`#gem${gemIndex}`);

                    gemDiv.innerHTML = `<img src="../../media/illustrations/items/sten${gemIndex}.png"></img>`;
                }else{
                    let gemDiv = document.querySelector(`#gem${gemIndex}`);
                    gemDiv.innerHTML = "";
                }
            }));
        }
    });


    //! kolla igenom detta också så allt funkar med phaseChanger
    // patchState("currentUser", "inventory", itemObj);
}

function protecc(seconds) {
    let loadScr = document.querySelector('#loadingScreen');
    let overlayTxt = document.querySelector('#overlayStandby .textlayer');
    loadScr.classList.remove('none');
    loadScr.classList.add('flex');
    overlayTxt.classList.add('none');

    setTimeout(() => {
        loadScr.classList.add('none');
        loadScr.classList.remove('flex');
        overlayTxt.classList.remove('none');
    }, seconds * 1000);
}

function phaseChanger() {
    // 1 Uppdateta phase-nummer via patchState
    if (STATE.currentUser.introDialogue && STATE.currentUser.completedGame && STATE.currentUser.outroDialogue) {//! && STATE.currentUser.completedGame

        STATE.currentUser.introDialogue = false;
        STATE.currentUser.completedGame = false;
        STATE.currentUser.outroDialogue = false;
    }
    let phaseIndex = STATE.currentPhase;

    // Empty the dialogue-history
    const textfield = document.querySelector(".histTextfield");
    textfield.innerHTML = "";

    // Delete all game-elements
    const gameHolder = document.getElementById("gameHolder");
    gameHolder.innerHTML = "";

    patchState("currentUser", "storyPhase", phaseIndex + 1);
    // 1.1, kontrollera spel stadierna intro, completedGame och outro
    // 2 Få koordinaterna från phase-objektet, lägg i state
    // 3 Uppdatera script-taggar och php-includes
    setTimeout(() => {
        activateGeolocation();
    }, 5000);
}

function importantBtn(theButton) {
    theButton.classlist.add("important");

    setTimeout(function () {
        theButton.classlist.remove("important");
    }, 5000);
}

function displayLocations() {
    let locationArray = document.querySelectorAll(".locationPoint");
    locationArray.forEach(location => {
        let idNumber = location.id.substring(location.id.length - 1, location.id.length);

        if (location.id.length > 9) {
            idNumber = location.id.substring(location.id.length - 2, location.id.length);
        }

        if (idNumber > STATE.currentPhase) {
            location.classList.add("none");
        } else {
            location.classList.remove("none");
        }

        location.addEventListener("click", function () {
            let prevSelected = document.querySelector(".markedLocation");

            if (prevSelected) {
                prevSelected.classList.remove("markedLocation");
            }

            // const sumHeader = document.getElementById("infoTag");
            const sumText = document.querySelector(".infoTextWrapper > p");

            console.log(this.id)

            this.classList.toggle("markedLocation");

            sumText.innerHTML = summaries[idNumber - 1];
        });
    });
}

function replaceTextLayer(text) {
    const el = document.querySelector('#standbyInfo');
    el.innerHTML = text;
}

document.querySelector(".histBtn").addEventListener("click", function() {
    const overlay = document.getElementById("overlayHistorik");
    overlay.classList.toggle("none");
});

document.querySelector(".closeBtn").addEventListener("click", function() {
    const overlay = document.getElementById("overlayHistorik");
    overlay.classList.add("none");
});

document.getElementById("itemDiv0").addEventListener("click", function() {
    toggleDialogue();
});

document.getElementById("inventoryBtn").addEventListener("click", function() {
    toggleDialogue();
});

document.getElementById("invBackBtn").addEventListener("click", function() {
    toggleDialogue();
});

function toggleDialogue(){
    const dialogueWindow = document.getElementById("dialogue");
    dialogueWindow.classList.toggle("none");
}

function resetState(){
    STATE.currentUser.storyPhase = 0;
    STATE.currentUser.introDialogue = false;
    STATE.currentUser.completedGame = false;
    STATE.currentUser.inventory = {
        mapItem: false,
        letterItem: false,
        photo: false,
        oldLetterItem: false,
        gems:[false, false, false, false, false]
    }
    patchState("currentUser", "outroDialogue", false);
}