function CardSet() {
  let self = this;

  function tokenize(phrase) {
    phrase = phrase.toLowerCase();
    let starts = [];
    let ends = [];
    let parts = [];

    let part = null;
    let start = 0;
    for (let i = 0; i <= phrase.length; ++i) {
      let code = phrase.charCodeAt(i);
      if ((code >= 97 && code <= 122) || (code >= 48 && code <= 57) || code == 91 || code == 93) {
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

  function findImage(text) {
    let image, name = null;
    for (name of fuzzyNames(text)) {
      image = self.images[name];
      if (image) {
        break;
      }
    }

    if (self.exclude.has(name)) {
      let isBracketed = (text[0] === '[' && text[1] === '[');
      if (!isBracketed) {
        return false;
      }
    }

    return image || false;
  }

  this.debug = function (phrase) {
    function replace(s, left, right, text) {
      return s.substr(0, left) + text + s.substr(right);
    }

    function replaceMatches(phrase, matches, fn) {
      let result = phrase;
      let offset = 0;

      for (let i = 0; i < matches.length; ++i) {
        let match = matches[i];
        let oldLen = result.length;
        let [newText, left, right, url] = match;

        result = replace(result, left + offset, right + offset, fn(i, match));
        offset += result.length - oldLen;
      }

      return result;
    }

    let matches = this.detect(phrase);
    console.debug(matches);

    if (!matches.length) {
      console.log('ø No matches.');
      return;
    }

    let resultPhrase = replaceMatches(phrase, matches, (i, match) => match[0]);
    let debugPhrase = replaceMatches(phrase, matches, (i, match) => `%c${match[0]}%c`);

    let args = [];
    for (let match of matches) {
      args.push('color:#00f');
      args.push('color:#000');
    }

    console.log(`-> ${debugPhrase}`, ...args);

    for (let match of matches) {
      console.log(`%c${match[0]}%c:${match[3]}`, 'color:#00f', 'color:#000');
    }

    console.log(`-> ${resultPhrase}`);
  }

  this.detect = function (phrase) {
    let matches = [];

    let [starts, ends, parts] = tokenize(phrase);

    for (let start = 0; start < parts.length; ++start) {
      for (let end = Math.min(parts.length, start + self.maxWordCount); end > start; --end) {
        let text = parts.slice(start, end).join(' ');
        var imageUrl = findImage(text);
        if (!imageUrl) {
          continue;
        }

        let startIndex = starts[start];
        let endIndex = ends[end - 1] + 1;
        let url = absoluteImageUrl(imageUrl);
        let newText = removeBrackets(phrase.substring(startIndex, endIndex)).trim();
        matches.push([newText, startIndex, endIndex, url]);

        start = end - 1;
        break;
      }
    }

    return matches;
  };

  this.update = function () {
    let repoUrl = 'https://gist.githubusercontent.com/schmich/390515ea1fb19d6b1cd419b2deb28324/raw';
    let options = { cache: true };
    qwest.get(repoUrl, null, options).then(function (xhr, resp) {
      // If cached (304, etc.), do not update index.
      if (xhr.status !== 200) {
        return;
      }
      let repo = JSON.parse(resp);
      let entry = { repo: repo };
      chrome.storage.local.set(entry);
      buildCardSet(repo);
    }).catch(function (e, xhr, resp) {
      console.err(e);
    });
  };

  function buildCardSet(repo) {
    self.images = {};
    self.exclude = new Set(repo.exclude.map(e => normalize(e)));
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

  function normalize(s) {
    return s.toLowerCase()
      .replace(/\b(the|a|an|in|on|of|to)\b/g, '')
      .replace(/[^a-z0-9]+/g, '')
      .replace(/(.)\1/g, '$1');
  }

  function* fuzzyNames(name) {
    let norm = normalize(name);
    yield norm;
    for (let stem of stems(norm)) {
      yield stem;
    }
  }
  
  function* stems(s) {
    if (s.length >= 6 && s.endsWith('ing')) {
      yield s.slice(0, -3);
    }

    if (s.length >= 4 && s.endsWith('s')) {
      yield s.slice(0, -1);
    }

    if (s.length >= 5 && s.endsWith('es')) {
      yield s.slice(0, -2);
    }

    if (s.length >= 5 && s.endsWith('ed')) {
      yield s.slice(0, -2);
    }
  }

  function absoluteImageUrl(imageUrl) {
    if (imageUrl.startsWith('https:') || imageUrl.startsWith('http:')) {
      return imageUrl;
    } else {
      return 'https://cdn.rawgit.com/schmich/hearthstone-card-images/' + imageUrl;
    }
  }

  function removeBrackets(text) {
    return text.replace(/(\[\[)|(\]\])/g, '');
  }

  this.images = {};
  this.exclude = new Set();
  this.maxWordCount = 0;

  chrome.storage.local.get('repo', function (entry) {
    let repo = entry['repo'];
    if (repo) {
      console.log('Using cached repo.');
      buildCardSet(repo);
    } else {
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

  chrome.tabs.query({}, function (tabs) {
    for (let tab of tabs) {
      tryInject(tab);
    }
  });
});

let Cards = new CardSet();

setInterval(function () {
  Cards.update();
}, 15 * 60 * 1000);

function tryInject(tab) {
  let urls = [
    /^https?:\/\/www\.reddit\.com\/r\/(hearthstone|competitivehs|customhearthstone|hearthstonecirclejerk|thehearth|arenahs|hstournaments|hearthdecklists|hscoaching|hspulls|12winarenalog|hearthstonevods)\/comments\//i,
    /^https?:\/\/.*\.battle\.net\/forums\/[^\\]+\/hearthstone\/topic/i
  ];

  if (!urls.some(url => tab.url.match(url))) {
    return;
  }

  if (tab.hsceInjected) {
    return;
  }

  tab.hsceInjected = true;

  chrome.tabs.insertCSS(tab.id, { file: 'css/style.css', runAt: 'document_start' }, function () {
    chrome.tabs.executeScript(tab.id, { file: 'lib/ScrollMonitor.js', runAt: 'document_end' }, function () {
      chrome.tabs.executeScript(tab.id, { file: 'js/inject.js', runAt: 'document_end' }, function () {
        // Injected.
      });
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
