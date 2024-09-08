const UNKNOWN = "Unknown";
const OUTPUT_FILE = "output.apkg";
const INPUT_ELEMENT_ID = "noteFront";

var SQL; // used for genanki-js
initSqlJs().then(function (sql) {
    SQL = sql;
});

var mycomatch; // data pulled from mycomatch

function start() {
    let input;
    try{
        input = convertInputToList(document.getElementById(INPUT_ELEMENT_ID).value);
    } catch (err) {
        alert(`Bad input '${err.message}'`);
        return;
    }
    disableButton();
    document.getElementById("output").innerHTML = "STARTING... <br>"; 
    let package = new Package(); 
    let deck = new Deck(generateRandom13DigitNumber(), "Fungi");
    getMycoMatchData()
        .then(() => createCards(package, deck, input))
        .then(async (numberOfCards) => {
            if (numberOfCards > 0) {
                package.addDeck(deck);
                package.writeToFile(OUTPUT_FILE);
                enableButton(true);
            } else {
                enableButton(false);
            }
            document.getElementById("output").innerHTML += "FINISHED";
        })
        .catch((err) => {
            console.log("Error: ", err);
            alert(`Error Creating Deck: ${err.message}`);
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
        const model = createModel();
        var cardCounter = 0;
        for (let [index, iNatID] of input.entries()) {
            await fetch("https://api.inaturalist.org/v1/observations/".concat(iNatID))    // make iNat API call
                .then((response) => response.json())                                      // convert response to json 
                .then((json) => getMedia(json.results[0]))                                // fetch images
                .then(({json, media, errMsg}) => {                                        // add images to package and create the card
                    if (errMsg != null) {
                        throw new Error(errMsg);
                    }
                    for (let [index, image] of media.entries()) {
                        package.addMedia(image.blob, image.imgName);
                    }
                    return createCard(json, media, model);
                })
                .then((card) => {                                                         // add card to deck
                    deck.addNote(card);
                    cardCounter += 1;
                    document.getElementById("output").innerHTML += "DONE '" + iNatID + "'<br>"; 
                })                            
                .catch((err) => {
                    console.log(err)
                    document.getElementById("output").innerHTML += `<div style="color: red;">ERROR: Couldn't create card for '${iNatID}' because '${err.message}'</div>`;
                });
        }
        resolve(cardCounter);
    });
}

function createCard(json, media, model) {
    const taxonPhotosHtml = media.map(mediaObj => `<img src="${mediaObj.imgName}">`).join('<br>'); // create HTML for taxon photos
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
        var errMsg = null;

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
                    console.error('Error downloading image:', error);
                    errMsg = error.message;
                });
            i = i + 1;
            if (errMsg != null) {
                break;
            }
        }
        resolve({
            json: json,
            media: media,
            errMsg: errMsg
        })
    });
}

function convertInputToList(input) {
    // Split the input by newline characters to create an array
    const list = input.split('\n').map(line => {
        line = line.trim();
        const match = line.match(/(?:inaturalist.*observations\/)?(\d+)$/);
        if (match) {
            // If it matches, replace the line with the captured ID
            return match[1];
        } else {
            if (line == "") {
                return line;
            } else {
                throw new Error(line);
            }
        }
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
    if ('synonymOf' in mycomatch[name]) {
        return mycomatch[mycomatch[name].synonymOf];
    }
    return mycomatch[name];
}

function disableButton() {
    document.getElementById("startButton").disabled = true;
    document.getElementById("loader").style.display = 'block';
}

function enableButton(addDelay) {
    if (addDelay) {
        setTimeout(function(){ // wait a bit so user is prompted to save before button is activated again
            enableButtonUtil();
        }, 4000);
    } else {
        enableButtonUtil();
    }
}

function enableButtonUtil() {
    document.getElementById("loader").style.display = 'none';
    document.getElementById("startButton").disabled = false;
}

// TODO: Delete this method
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