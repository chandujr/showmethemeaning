let popup = null;
let popupTimeout = null;
let lastMouseUpTime = 0;

document.addEventListener('mousedown', function (e) {
    if (popupTimeout) {
        clearTimeout(popupTimeout);
        popupTimeout = null;
    }

    // Close all popups if clicking outside
    if (!e.target.closest('.dictionary-popup')) {
        closeAllPopups();
    }
});

document.addEventListener('mouseup', function (e) {
    lastMouseUpTime = Date.now();
});

document.addEventListener('dblclick', function (e) {
    if (popupTimeout) {
        clearTimeout(popupTimeout);
    }

    popupTimeout = setTimeout(function () {
        const selection = window.getSelection().toString().trim();
        if (selection.length > 0 && selection.split(/\s+/).length === 1) {
            if (Date.now() - lastMouseUpTime >= 250) {
                closeAllPopups(); // Close any existing popups
                showPopup(selection, e.pageX, e.pageY);
            }
        }
    }, 250);
});

document.addEventListener('selectionchange', function () {
    if (popupTimeout) {
        clearTimeout(popupTimeout);
        popupTimeout = null;
    }
});

function closeAllPopups() {
    document.querySelectorAll('.dictionary-popup').forEach(popup => {
        document.body.removeChild(popup);
    });
    popup = null;
}

async function showPopup(word, x, y) {
    const { definitions, phonetic } = await getDefinitionsAndPhonetic(word);

    popup = document.createElement('div');
    popup.className = 'dictionary-popup'; // Add a class for easy selection
    popup.style.position = 'absolute';
    popup.style.left = `${x}px`;
    popup.style.top = `${y}px`;
    popup.style.backgroundColor = 'var(--popup-bg-color, white)';
    popup.style.color = 'var(--popup-text-color, black)';
    popup.style.border = '1px solid var(--popup-border-color, black)';
    popup.style.borderRadius = '5px';
    popup.style.padding = '10px';
    popup.style.zIndex = '1000';
    popup.style.maxWidth = '350px';
    popup.style.maxHeight = '400px';
    popup.style.overflowY = 'auto';
    popup.style.boxShadow = '0 2px 5px rgba(0,0,0,0.2)';

    // Add CSS variables for color scheme
    const style = document.createElement('style');
    style.textContent = `
        :root {
            --popup-bg-color: white;
            --popup-text-color: black;
            --popup-border-color: black;
            --popup-link-color: blue;
        }
        @media (prefers-color-scheme: dark) {
            :root {
                --popup-bg-color: #333;
                --popup-text-color: #fff;
                --popup-border-color: #666;
                --popup-link-color: #4da6ff;
            }
        }
    `;
    document.head.appendChild(style);

    let content = `<h3 style="margin-top: 0; margin-bottom: 5px;">${word}</h3>`;
    if (phonetic) {
        content += `<p style="margin-top: 0; margin-bottom: 10px; font-size: 0.8em; color: var(--popup-text-color, #666);">${phonetic}</p>`;
    }
    for (const [partOfSpeech, definitionList] of Object.entries(definitions)) {
        if (definitionList && definitionList.length > 0) {
            content += `<p><strong>${partOfSpeech}:</strong></p>`;
            content += `<ol style="margin-top: 5px; padding-left: 20px;">`;
            definitionList.slice(0, 2).forEach(def => {
                content += `<li>${def}</li>`;
            });
            content += `</ol>`;
            if (definitionList.length > 2) {
                content += `<p class="more-definitions" data-part="${partOfSpeech}" style="cursor: pointer; color: var(--popup-link-color, blue); margin-top: 0;">Show more</p>`;
            }
        }
    }
    popup.innerHTML = content || "No definitions found.";

    document.body.appendChild(popup);

    // Add event listeners for "Show more" links
    popup.querySelectorAll('.more-definitions').forEach(element => {
        element.addEventListener('click', function (e) {
            e.stopPropagation(); // Prevent the click from bubbling up
            const partOfSpeech = this.getAttribute('data-part');
            const allDefinitions = definitions[partOfSpeech];
            let additionalContent = `<ol start="3" style="margin-top: 5px; padding-left: 20px;">`;
            allDefinitions.slice(2).forEach(def => {
                additionalContent += `<li>${def}</li>`;
            });
            additionalContent += `</ol>`;
            this.insertAdjacentHTML('beforebegin', additionalContent);
            this.style.display = 'none';
        });
    });

    // Prevent clicks inside the popup from closing it
    popup.addEventListener('click', function (e) {
        e.stopPropagation();
    });
}

async function getDefinitionsAndPhonetic(word) {
    try {
        const response = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${word}`);
        const data = await response.json();
        
        const definitions = {
            noun: [],
            verb: [],
            adjective: [],
            adverb: []
        };
        
        let phonetic = null;

        if (data[0].phonetic) {
            phonetic = data[0].phonetic;
        } else if (data[0].phonetics && data[0].phonetics.length > 0) {
            phonetic = data[0].phonetics[0].text;
        }
        
        data[0].meanings.forEach(meaning => {
            const partOfSpeech = meaning.partOfSpeech;
            if (partOfSpeech in definitions) {
                definitions[partOfSpeech] = meaning.definitions.map(def => def.definition);
            }
        });
        
        return { definitions, phonetic };
    } catch (error) {
        console.error("Error fetching definition:", error);
        return { definitions: {}, phonetic: null };
    }
}