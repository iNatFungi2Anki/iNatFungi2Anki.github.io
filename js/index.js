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
    if (mycomatch == null) {
        fetch('./myocmatch.json')
            .then((response) => response.json())
            .then((json) => {
                mycomatch = json
                addNote();
            });
    } else {
        addNote();
    }
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