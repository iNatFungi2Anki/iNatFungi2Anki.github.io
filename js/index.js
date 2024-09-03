/****************************************************************************************
 * Copyright (c) 2021 Mani <infinyte01@gmail.com>                                       *
 *                                                                                      *
 *                                                                                      *
 * This program is free software; you can redistribute it and/or modify it under        *
 * the terms of the GNU General Public License as published by the Free Software        *
 * Foundation; either version 3 of the License, or (at your option) any later           *
 * version.                                                                             *
 *                                                                                      *
 * This program is distributed in the hope that it will be useful, but WITHOUT ANY      *
 * WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A      *
 * PARTICULAR PURPOSE. See the GNU General Public License for more details.             *
 *                                                                                      *
 * You should have received a copy of the GNU General Public License along with         *
 * this program.  If not, see <http://www.gnu.org/licenses/>.                           *
 *                                                                                      *
 * This file incorporates work covered by the following copyright and permission        *
 * notice:                                                                              *
 *                                                                                      *
 *      mkanki - generate decks for the Anki spaced-repetition software.                *
 *      Copyright (c) 2018  Jeremy Apthorp <nornagon@nornagon.net>                      *
 *                                                                                      *
 *      This program is free software: you can redistribute it and/or modify            *
 *      it under the terms of the GNU Affero General Public License (version 3) as      *
 *      published by the Free Software Foundation.                                      *
 *                                                                                      *
 *      This program is distributed in the hope that it will be useful,                 *
 *      but WITHOUT ANY WARRANTY; without even the implied warranty of                  *
 *      MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the                   *
 *      GNU Affero General Public License for more details.                             *
 *                                                                                      *
 *      You should have received a copy of the GNU Affero General Public License        *
 *      along with this program.  If not, see <https://www.gnu.org/licenses/>.          *
 ****************************************************************************************/

// The `initSqlJs` function is globally provided by all of the main dist files if loaded in the browser.
// We must specify this locateFile function if we are loading a wasm file from anywhere other than the current html page's folder.
const UNKNOWN = "Unknown";
const OUTPUT_FILE = "output.apkg";
const INPUT_ELEMENT_ID = "noteFront";

var SQL;
initSqlJs().then(function (sql) {
    //Create the database
    SQL = sql;
});

var mycomatch;

const m = new Model({
    name: "Basic",
    id: "2156341623643",
    flds: [
        { name: "Front" },
        { name: "Back" }
    ],
    req: [
        [0, "all", [0]],
    ],
    tmpls: [
        {
            name: "Card 1",
            qfmt: "{{Front}}",
            afmt: "{{FrontSide}}\n\n<hr id=answer>\n\n{{Back}}",
        }
    ],
})

const d = new Deck(1347617346765, "New deck")
const p = new Package()

function start() {
    const input = convertInputToList(document.getElementById(INPUT_ELEMENT_ID).value);
    const verifyInputResult = verifyInput(input);
    if (!verifyInputResult.isValid) {
        if (!verifyInputResult.isEmpty) {
            alert(`Bad input '${verifyInputResult.line}'`);
        }
        return;
    }
    disableButton();
    document.getElementById("output").innerHTML = "";
    let package = new Package(); 
    let deck = new Deck(generateRandom13DigitNumber(), "Fungi");
    getMycoMatchData()
        .then(() => createCards(package, deck, input))
        .then(async () => {
            console.log("3");
            package.addDeck(deck);
            package.writeToFile(OUTPUT_FILE);
            document.getElementById("output").innerHTML += "FINISHED";
            enableButton();
        })
        .catch((err) => {
            console.log("Error: ", err);
            alert("Error Creating Deck");
        });
}

function getMycoMatchData() {
    return new Promise((resolve) => {
        if (mycomatch == null) {
                fetch('./myocmatch.json')
                    .then((response) => response.json())
                    .then((json) => {
                        mycomatch = json;
                        resolve(mycomatch);
            });
        } else {
            resolve();
        }
    });
}

function createCards(package, deck, input) {
    return new Promise(async (resolve) => {
        //const deck = new Deck(generateRandom13DigitNumber(), "Fungi");
        //const package = new Package();
        //const iNatIDs = convertInputToList(document.getElementById(INPUT_ELEMENT_ID).value);
        const model = createModel();
        for (let [index, iNatID] of input.entries()) {
            await fetch("https://api.inaturalist.org/v1/observations/".concat(iNatID))    // make iNat API call
                .then((response) => response.json())                                      // convert response to json 
                .then((json) => getMedia(json.results[0]))                                // fetch images
                .then(({json, media}) => {                                                // add images to package and create the card
                    for (let [index, image] of media.entries()) {
                        package.addMedia(image.blob, image.imgName);
                    }
                    return createCard(json, media, model);
                })
                .then((card) => {                                                         // add card to deck
                    console.log("1");
                    deck.addNote(card);
                    document.getElementById("output").innerHTML += "DONE '" + iNatID + "'<br>"; 
                })                            
                .catch((err) => {
                    console.log(err)
                    document.getElementById("output").innerHTML += `<div style="color: red;">ERROR: Couldn't create card for '${iNatID}' because '${err.message}'</div>`;
                });
        }
        //package.addDeck(deck);
        //package.writeToFile('deck.apkg')
        console.log("2");
        resolve();
    });
}

function createCard(json, media, model) {
    console.log(media.length);
    // create HTML for taxon photos
    const taxonPhotosHtml = media.map(mediaObj => `<img src="${mediaObj.imgName}">`).join('<br>');
    const scientificName = json.taxon.name;
    let commonName = null;
    if ('preferred_common_name' in json.taxon) {
        commonName = json.taxon.preferred_common_name;
    }

    // find taxonomic ancestors
    let elementContainingAncestors = null;
    for (let [index, identification] of json.identifications.entries()) {
        if (identification.taxon.name == scientificName) {
          elementContainingAncestors = identification;
        }
    }
    let familyName = "";
    let orderName = "";
    let className = "";
    let phylumName = "";
    if (elementContainingAncestors != null) {
        for (let [index, element] of elementContainingAncestors.taxon.ancestors.entries()) {
            let name = element.name;
            switch(element.rank) {
                case 'family':
                    familyName = name;
                    break;
                  case 'order':
                    orderName = name;
                    break;
                  case 'class':
                    className = name;
                    break;
                  case 'phylum':
                    phylumName = name;
                    break;
            }
        }
    }
    let ancestors = familyName + " < " +  orderName + " < " + className + " < " + phylumName;
    
    let etymology = null;
    let spores = null;
    let odour = null;
    let edibility = null;
    let taste = null;
    let habitat = null;
    let mycoMatchFields = getFieldsFromMycoMatch(scientificName, json.taxon.rank);
    if (mycoMatchFields != null) {
        etymology = returnNullIfUnkownString(mycoMatchFields.nameOrigin);
        spores = returnNullIfUnkownString(mycoMatchFields.spores);
        odour = returnNullIfUnkownString(mycoMatchFields.odour);
        edibility = returnNullIfUnkownString(mycoMatchFields.edibility);
        taste = returnNullIfUnkownString(mycoMatchFields.taste);
        habitat = returnNullIfUnkownString(mycoMatchFields.habitat);
    }

    const card = model.note([
        taxonPhotosHtml,
        scientificName,
        commonName,
        ancestors,
        json.taxon.rank,
        etymology,
        spores,
        odour,
        edibility,
        taste,
        habitat
    ]);
    console.log(taxonPhotosHtml + "\n" + scientificName + "\n" + habitat);
    return card;
}

function createModel() {
    return new Model({
      name: "Fungi Model",
      id: generateRandom13DigitNumber(),
      flds: [
        {name: 'photos'},
        {name: 'scientificName'},
        {name: 'commonName'},
        {name: 'ancestors'},
        {name: 'rank'},
        {name: 'etymology'},
        {name: 'spores'},
        {name: 'odour'},
        {name: 'edibility'},
        {name: 'taste'},
        {name: 'habitat'}
      ],
      req: [
        [0, "all", [0]],
      ],
      tmpls: [
        {
          name: 'Taxon Card',
          qfmt: `<div align="left" style="font-size: 16px;">
          {{photos}}<br><br>
          <p style="display:inline">Rank: </p>{{rank}}<br>
          {{type:scientificName}}
          </div>`,
          afmt: `<div align="left" style="font-size: 16px;">
          {{photos}}<br><br>
          {{type:scientificName}}<br><br>
          <div style="font-size: 30px;"><i>{{scientificName}}</i></div><br>
          {{#commonName}}<br><b><p style="display:inline">Common Name: </p></b>{{commonName}}<br>{{/commonName}}
          {{#etymology}}<br><b><p style="display:inline">Etymology: </p></b>{{etymology}}<br>{{/etymology}}
          <br><i>{{ancestors}}</i><br><br>
          <hr>
          {{#spores}}<br><b><p style="display:inline">Spores: </p></b>{{spores}}<br>{{/spores}}
          {{#odour}}<br><b><p style="display:inline">Odour: </p></b>{{odour}}<br>{{/odour}}
          {{#edibility}}<br><b><p style="display:inline">Edibility: </p></b>{{edibility}}<br>{{/edibility}}
          {{#taste}}<br><b><p style="display:inline">Taste: </p></b>{{taste}}<br>{{/taste}}
          {{#habitat}}<br><b><p style="display:inline">Habitat: </p></b>{{habitat}}{{/habitat}}
          </div>`,
        },
      ]
    })
}

function getMedia(json) { 
    return new Promise(async (resolve) => {
        const observation_photos = json.observation_photos;
        const id = json.id;
        let i = 0;
        let media = [];

        for (let [index, observation_photo] of observation_photos.entries()) { 
            const squareImgUrl = observation_photo.photo.url;
            const imgUrl = squareImgUrl.replace('square', 'original');
            const imgName = `observation_${id}_${i}_${getBasename(imgUrl)}`;
            await fetch('https://corsproxy.io/?'.concat(imgUrl))
                .then(response => response.blob())  // Convert the response to a Blob
                .then(blob => {
                    media.push({
                        blob: blob,
                        imgName: imgName
                    })
                })
                .catch(error => {
                    console.error('Error downloading the image:', error);
                });
            i = i + 1;
        }

        resolve({
            json: json,
            media: media
        })
    });
}

// add note to deck
function addNote() {
    console.log(mycomatch)
    var front = document.getElementById("noteFront").value;
    var back = document.getElementById("noteBack").value;

    d.addNote(m.note([front, back]))

    document.getElementById("noteBack").value = "";
    document.getElementById("noteFront").value = "";

    const xhttpr = new XMLHttpRequest();
    xhttpr.open('GET', 'https://www.inaturalist.org/observations/taxon_stats.json?on=2008-03-19', true);
 
    xhttpr.send();
 
    xhttpr.onload = ()=> {
      if (xhttpr.status === 200) {
          const response = JSON.parse(xhttpr.response);
          console.log(response)
      } else {
          // Handle error
      }
    };

    // URL of the image to download
    const imageUrl = 'https://corsproxy.io/?https%3A%2F%2Fstatic.inaturalist.org%2Fphotos%2F414907516%2Foriginal.jpeg';

    // Fetch the image from the foreign URL
    fetch(imageUrl)
      .then(response => response.blob())  // Convert the response to a Blob
      .then(blob => {
        // Create a temporary object URL from the Blob
        const tempUrl = URL.createObjectURL(blob);
        
        // Print the temporary file location (URL)
        console.log('Temporary file location:', tempUrl);
        
        // Use the image in your web app, for example:
        const img = document.createElement('img');
        img.src = tempUrl;
        document.body.appendChild(img);
        
        // Cleanup: Revoke the object URL when it's no longer needed
        //img.onload = () => {
        //  URL.revokeObjectURL(tempUrl);  // Release memory once done with the URL
        //};
        addImage(blob);
      })
      .catch(error => {
        console.error('Error downloading the image:', error);
      });
}

function addImage(blob) {
    const m = new Model({
        name: "Basic Test",
        id: "3457826374725",
        flds: [
            { name: "Front" },
            { name: "Back" }
        ],
        req: [
            [0, "all", [0]],
        ],
        tmpls: [
            {
                name: "Card 1",
                qfmt: "{{Front}}",
                afmt: "{{FrontSide}}\n\n<hr id=answer>\n\n{{Back}}",
            }
        ],
    })
                       
    const d = new Deck(1347617346765, "hi")

    var imageFile = "test.jpg";

    d.addNote(m.note(['This is front and back side contains image.', '<img src="' + imageFile + '"></img>']))

    const p = new Package()
    p.addDeck(d)

    p.addMedia(blob, imageFile);
    p.writeToFile('deck.apkg')
}


// add deck to package and export
function exportDeck() {
    p.addDeck(d)
    p.writeToFile('deck.apkg')
}

function convertInputToList(input) {
    // Split the input by newline characters to create an array
    const list = input.split('\n').map(line => {
        line = line.trim();
        // Check if the line matches the pattern of an iNaturalist observation URL
        const match = line.match(/https:\/\/www\.inaturalist\.org\/observations\/(\d+)$/);
        if (match) {
            // If it matches, replace the line with the captured ID
            return match[1];
        }
        return line;
    }).filter(line => line.length > 0);
    
    return list;
}

function generateRandom13DigitNumber() {
    // Generate a random number between 10^12 (inclusive) and 10^13 (exclusive)
    const min = 10**12; // Smallest 13-digit number (1000000000000)
    const max = 10**13; // Largest 13-digit number + 1 (10000000000000)
    // Generate the random number within the range and round it down to ensure 13 digits
    const randomNumber = Math.floor(Math.random() * (max - min)) + min;
    return randomNumber;
}

function getBasename(filePath) {
    return filePath.split('/').pop();
}

function getFieldsFromMycoMatch(name, rank) {
    if (rank != "species" || !(name in mycomatch)) {
        return null;
    }
    return mycomatch[name];
}

function disableButton() {
    document.getElementById("startButton").disabled = true;
    document.getElementById("loader").style.display = 'block';
}

function enableButton() {
    setTimeout(function(){ // wait a bit so user is prompted to save before button is activated again
        document.getElementById("loader").style.display = 'none';
        document.getElementById("startButton").disabled = false;
    }, 4000);
}

function verifyInput(input) {
    if (input.length == 0){
        return {
            isValid: false,
            lineNum: null,
            line: null,
            isEmpty: true
        };
    }
    const regex = /^(https:\/\/www\.inaturalist\.org\/observations\/\d+|\d+)$/;
    count = 1;
    for (let line of input) {
        if (!regex.test(line)) {
            return {
                isValid: false,
                lineNum: count,
                line: line,
                isEmpty: false
            };
        }
        count += 1;
    }
    return {
        isValid: true,
    };
}

function returnNullIfUnkownString(string) {
    if (string == UNKNOWN) {
        return null;
    }
    return string;
}