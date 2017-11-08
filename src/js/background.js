let Cards = new CardSet();

async function readExtensionFile(file) {
  return new Promise((resolve, reject) => {
    let xhr = new XMLHttpRequest();
    xhr.onreadystatechange = () => {
      if (xhr.readyState === 4) {
        resolve(xhr.responseText);
      }
    };

    xhr.onerror = error => reject(error);

    const url = chrome.runtime.getURL(file);
    xhr.open('GET', url, true);
    xhr.send(null);
  });
}

async function loadDictionary() {
  let contents = await readExtensionFile('dictionary.json');
  Cards.update(JSON.parse(contents));
  console.log('dictionary.json loaded.');
}

chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  sendResponse(Cards.detect(request.detect));
});

chrome.runtime.onInstalled.addListener(function () {
  chrome.storage.local.clear();
  chrome.tabs.query({}, function (tabs) {
    for (let tab of tabs) {
      tryInject(tab);
    }
  });
});

function tryInject(tab) {
  let urls = [
    /^https?:\/\/www\.reddit\.com\/r\/(hearthstone|competitivehs|customhearthstone|hearthstonecirclejerk|thehearth|arenahs|hstournaments|hearthdecklists|hscoaching|hspulls|12winarenalog|hearthstonevods|wildhearthstone|pauperhs)\/comments\//i,
    /^https?:\/\/.*\.battle\.net\/forums\/[^\\]+\/hearthstone\/topic/i,
    /^https?:\/\/www\.twitch\.tv\/.+/i
  ];

  if (!urls.some(url => tab.url.match(url))) {
    return;
  }

  if (tab.hsceInjected) {
    return;
  }

  tab.hsceInjected = true;

  chrome.tabs.insertCSS(tab.id, { file: 'css/style.css', runAt: 'document_start' }, function () {
    chrome.tabs.executeScript(tab.id, { file: 'js/inject.js', runAt: 'document_end' }, function () {
      // Injected.
    });
  });
}

chrome.tabs.onUpdated.addListener(function (tabId, changeInfo, tab) {
  if (changeInfo.status !== 'loading') {
    return;
  }

  tryInject(tab);
});

console.log('Extension loaded.');
loadDictionary();
