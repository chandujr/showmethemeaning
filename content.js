let popup = null;

document.addEventListener('dblclick', async function(e) {
    const selection = window.getSelection().toString().trim();
    if (selection.length > 0) {
        if (popup) {
            document.body.removeChild(popup);
        }
        
        const { definitions, phonetic } = await getDefinitionsAndPhonetic(selection);
        
        popup = document.createElement('div');
        popup.style.position = 'absolute';
        popup.style.left = `${e.pageX}px`;
        popup.style.top = `${e.pageY}px`;
        popup.style.backgroundColor = 'white';
        popup.style.border = '1px solid black';
        popup.style.borderRadius = '5px';
        popup.style.padding = '10px';
        popup.style.zIndex = '1000';
        popup.style.maxWidth = '350px';
        popup.style.maxHeight = '400px';
        popup.style.overflowY = 'auto';
        popup.style.boxShadow = '0 2px 5px rgba(0,0,0,0.2)';
        
        let content = `<h3 style="margin-top: 0; margin-bottom: 5px;">${selection}</h3>`;
        if (phonetic) {
            content += `<p style="margin-top: 0; margin-bottom: 10px; font-size: 0.8em; color: #666;">${phonetic}</p>`;
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
                    content += `<p class="more-definitions" data-part="${partOfSpeech}" style="cursor: pointer; color: blue; margin-top: 0;">Show more</p>`;
                }
            }
        }
        popup.innerHTML = content || "No definitions found.";
        
        document.body.appendChild(popup);

        // Add event listeners for "Show more" links
        popup.querySelectorAll('.more-definitions').forEach(element => {
            element.addEventListener('click', function() {
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
    }
});

document.addEventListener('click', function(e) {
    if (popup && !popup.contains(e.target)) {
        document.body.removeChild(popup);
        popup = null;
    }
});

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