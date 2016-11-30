function CardSet() {
  let self = this;

  function split(phrase) {
    phrase = phrase.toLowerCase();
    let starts = [];
    let ends = [];
    let parts = [];

    let part = null;
    let start = 0;
    for (let i = 0; i <= phrase.length; ++i) {
      let charCode = phrase.charCodeAt(i);
      if ((charCode >= 97 && charCode <= 122) || (charCode >= 48 && charCode <= 57)) {
        if (part === null) {
          part = '';
          start = i;
        }
        part += phrase[i];
      } else if (part !== null) {
        if (['the', 'a', 'an', 'in', 'on', 'of', 'to'].indexOf(part) < 0) {
          let end = i - 1;
          let newPart = '';
          if ((newPart = part.replace(/^\dx/, '')) && (newPart !== part)) {
            part = newPart;
            start += 2;
          } else if ((newPart = part.replace(/x\d$/, '')) && (newPart !== part)) {
            part = newPart;
            end -= 2;
          }
          starts.push(start);
          ends.push(end);
          parts.push(part);
        }
        part = null;
      }
    }

    return [starts, ends, parts];
  }

  function absoluteImageUrl(imageUrl) {
    if (imageUrl.match(/^https?:/)) {
      return imageUrl;
    } else {
      return 'https://cdn.rawgit.com/schmich/hearthstone-card-images/' + imageUrl;
    }
  }

  this.detect = function (phrase) {
    let detected = [];

    let [starts, ends, parts] = split(phrase);

    for (let start = 0; start < parts.length; ++start) {
      for (let end = Math.min(parts.length, start + self.maxWordCount); end > start; --end) {
        let fuzzyName = normalize(parts.slice(start, end).join(' '));
        let imageUrl = self.images[fuzzyName];
        if (imageUrl) {
          let startIndex = starts[start];
          let endIndex = ends[end - 1] + 1;
          let url = absoluteImageUrl(imageUrl);
          detected.push([fuzzyName, startIndex, endIndex, url]);
          start = end - 1;
          break;
        }
      }
    }

    return detected;
  };

  this.update = function () {
    let cardsUrl = 'https://gist.githubusercontent.com/schmich/390515ea1fb19d6b1cd419b2deb28324/raw';

    // TODO: Figure out caching.
    //let options = { cache: false, headers: {} };
    //options.headers['If-None-Match'] = '"587f5b488c3b38a961b34dab5cde06eba1c36987"';
    let options = { cache: false };

    qwest.get(cardsUrl, null, options).then(function (xhr, resp) {
      console.log(xhr.getResponseHeader('etag'));
      let repo = JSON.parse(resp);
      let entry = { repo: repo };
      chrome.storage.local.set(entry);
      buildCardSet(repo);
    }).catch(function (e, xhr, resp) {
      console.err(e);
    });
  };

  function buildCardSet(repo) {
    console.log('Building card set.');

    self.images = {};
    self.maxWordCount = 0;

    for (let realName in repo.cards) {
      let fuzzyName = normalize(realName);
      self.images[fuzzyName] = repo.cards[realName];
      self.maxWordCount = Math.max(self.maxWordCount, countSpaces(realName) + 1);
    }
    
    for (let alias in repo.aliases) {
      let realName = repo.aliases[alias];
      let fuzzyAlias = normalize(alias);
      self.images[fuzzyAlias] = repo.cards[realName];
      self.maxWordCount = Math.max(self.maxWordCount, countSpaces(realName) + 1);
    }

    console.log('Card set built.');
  }

  function countSpaces(s) {
    let count = 0;
    for (let c of s) {
      if (c === ' ') {
        ++count;
      }
    }

    return count;
  }

  function normalize(name) {
    return name
      .toLowerCase()
      .replace(/\b(the|a|an|in|on|of|to)\b/g, '')
      .replace(/[^a-z0-9]+/g, '')
      .replace(/(\S{2,})s\b/g, '$1')
      .replace(/(.)\1/g, '$1');
  }

  this.images = {};
  this.maxWordCount = 0;

  chrome.storage.local.get('repo', function (entry) {
    let repo = entry['repo'];
    if (repo) {
      console.log('Using cached repo.');
      buildCardSet(repo);
    } else {
      console.log('Fetching current repo.');
      self.update();
    }
  });
}

chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  setTimeout(function () {
    sendResponse(Cards.detect(request.detect));
  }, 0);

  return true;
});

chrome.runtime.onInstalled.addListener(function () {
  chrome.storage.local.clear();
  Cards.update();
});

let Cards = new CardSet();

setInterval(function () {
  Cards.update();
}, 60 * 60 * 1000);

qwest.setDefaultOptions({ cache: true });

let urls = [
  /^https?:\/\/www\.reddit\.com\/r\/(hearthstone|competitivehs|customhearthstone|hearthstonecirclejerk|thehearth|arenahs|hstournaments|hearthdecklists|hscoaching|hspulls|12winarenalog|hearthstonevods)\/comments\//i,
  /^https?:\/\/.*\.battle\.net\/forums\/[^\\]+\/hearthstone\/topic/i
];

chrome.tabs.onUpdated.addListener(function (tabId, changeInfo, tab) {
  if (changeInfo.status !== 'loading') {
    return;
  }

  if (!urls.some(url => tab.url.match(url))) {
    return;
  }

  chrome.tabs.insertCSS(tabId, { file: 'css/style.css', runAt: 'document_start' }, function () {
    chrome.tabs.executeScript(tabId, { file: 'lib/ScrollMonitor.js', runAt: 'document_end' }, function () {
      chrome.tabs.executeScript(tabId, { file: 'js/inject.js', runAt: 'document_end' }, function () {
        console.log('Injected into ' + tab.url);
      });
    });
  });
});
