(function () {

function onInject() {
  let cardImage = document.createElement('img');
  cardImage.setAttribute('id', 'hsce-card');
  document.body.appendChild(cardImage);

  let elements = document.querySelectorAll('[data-type="comment"] .usertext-body, [data-type="link"] .usertext-body, .TopicPost-bodyContent');
  for (let element of elements) {
    let watcher = scrollMonitor.create(element, 200);
    (function (element) {
      watcher.enterViewport(function () {
        detectCards(element);
        this.destroy();
        watcher = null;
      });
    })(element);
  }

  document.addEventListener('animationstart', function (e) {
    if (e.animationName === 'hsceNodeInsertEvent') {
      detectCards(e.target);
    }
  });
}

function textNodesUnder(node){
  function collect(node, acc) {
    for (node = node.firstChild; node; node = node.nextSibling){
      if (node.nodeType == 3 && node.textContent.trim() !== "") {
        acc.push(node);
      } else {
        collect(node, acc);
      }
    }
  }

  let nodes = [];
  collect(node, nodes);
  return nodes;
}

function preloadImage(imageUrl) {
  preloadImage.loaded = preloadImage.loaded || {};
  if (preloadImage.loaded[imageUrl]) {
    return;
  }

  let e = document.createElement('img');
  e.classList.add('hsce-preload');
  e.setAttribute('src', imageUrl);
  preloadImage.loaded[imageUrl] = true;
  document.body.appendChild(e);
}

function detectCards(element) {
  let textNodes = textNodesUnder(element);
  for (let textNode of textNodes) {
    (function (node) {
      let text = node.textContent;
      chrome.runtime.sendMessage({ detect: text }, function (matches) {
        let targets = [];

        for (let match of matches) {
          let [normalizedPhrase, start, end, imageUrl] = match;

          let phrase = '';
          let range = document.createRange();
          let isBracketed = false;

          let bracketPhrase = text.substring(start - 2, end + 2);
          let bracketMatch = bracketPhrase.match(/^\[\[(.*)\]\]$/);
          if (bracketMatch) {
            phrase = bracketMatch[1];
            range.setStart(node, start - 2);
            range.setEnd(node, end + 2);
            isBracketed = true;
          } else {
            phrase = text.substring(start, end);
            range.setStart(node, start);
            range.setEnd(node, end);
          }

          if (!isBracketed) {
            // Note: these are not typos. They are normalized versions
            // of words excluded from highlighting.
            let excludeList = ['blizard', 'pirate', 'dream', 'silence', 'duplicate', 'murloc', 'beast', 'charge'];
            if (excludeList.indexOf(normalizedPhrase) >= 0) {
              continue;
            }
          }

          targets.push([range, phrase, imageUrl]);
          preloadImage(imageUrl);
        }

        createTargets(targets);
      });
    })(textNode);
  }
}

function createTargets(targets) {
  for (let target of targets) {
    let [range, phrase, imageUrl] = target;
    let span = document.createElement('span');
    span.dataset.hsceImg = imageUrl;
    range.surroundContents(span);
    span.textContent = phrase;
    addTargetEvents(span);
  }
}

function addTargetEvents(target) {
  let preview = false;

  function scrollHandler() {
    window.removeEventListener('scroll', scrollHandler);
    hideCard();
  };

  function hideCard() {
    preview = false;
    let card = document.getElementById('hsce-card');
    card.classList.remove('hsce-active');
    window.removeEventListener('scroll', scrollHandler);
  }

  target.addEventListener('mouseover', function () {
    preview = true;
    let self = this;

    let card = document.getElementById('hsce-card');
    card.removeAttribute('src');
    card.setAttribute('src', this.dataset.hsceImg);

    setTimeout(function () {
      if (!preview) {
        return;
      }

      positionCard(self, card);
      card.classList.add('hsce-active');
    }, 0);

    window.addEventListener('scroll', scrollHandler);
  });

  target.addEventListener('mouseout', function (e) {
    hideCard();
  });
}

function positionCard(targetElement, cardElement) {
  let rect = targetElement.getBoundingClientRect();
  let height = cardElement.offsetHeight;
  let width = cardElement.offsetWidth;

  let space = 5;
  let leftPos = rect.right + space;
  if (leftPos + width > window.innerWidth) {
    leftPos = Math.max(rect.left - width - space, 0);
  }

  let topPos = ((rect.top + rect.bottom) / 2) - height / 2;
  let overflow = (topPos + height) - window.innerHeight;
  if (overflow > 0) {
    topPos -= overflow; 
  }

  topPos = Math.max(topPos, 0);

  cardElement.style.left = leftPos + 'px';
  cardElement.style.top = topPos + 'px';
}

onInject();

})();
