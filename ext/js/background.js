let Cards = new CardSet();

function tryUpdateDictionary() {
  const dictionaryVersion = 1;
  const dictionaryUrl = 'https://gist.githubusercontent.com/schmich/42fd24ab7347de93a38ea113e35cfe9b/raw/' + dictionaryVersion;

  let options = { cache: true };
  qwest.get(dictionaryUrl, null, options).then(function (xhr, resp) {
    // If cached (304, etc.), do not update index.
    if (xhr.status !== 200) {
      return;
    }
    let dict = JSON.parse(resp);
    let entry = { dict: dict };
    chrome.storage.local.set(entry);
    Cards.update(dict);
  }).catch(function (e, xhr, resp) {
    console.err(e);
  });
}

chrome.storage.local.get('dict', function (entry) {
  let dict = entry['dict'];
  if (dict) {
    console.log('Using cached dictionary.');
    Cards.update(dict)
  } else {
    tryUpdateDictionary();
  }
});

setInterval(tryUpdateDictionary, 15 * 60 * 1000);

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
