var body = document.querySelector('body');
var cardImage = document.createElement('img');
cardImage.setAttribute('id', 'hsce-card');
body.appendChild(cardImage);

function textNodesUnderAcc(node, acc) {
  for (var node = node.firstChild; node; node = node.nextSibling){
    if (node.nodeType == 3 && node.textContent.trim() !== "") {
      acc.push(node);
    } else {
      textNodesUnderAcc(node, acc);
    }
  }
}

function textNodesUnder(node){
  var nodes = [];
  textNodesUnderAcc(node, nodes);
  return nodes;
}

let elements = document.querySelectorAll('[data-type="comment"] .usertext-body, [data-type="link"] .usertext-body, .TopicPost-bodyContent');
for (var i = 0; i < elements.length; ++i) {
  var watcher = scrollMonitor.create(elements[i], 200);
  (function (element) {
    watcher.enterViewport(function () {
      processElement(element);
      this.destroy();
      watcher = null;
    });
  })(elements[i]);
}

var preloadedImages = {};
function preloadImage(imageUrl) {
  if (preloadedImages[imageUrl]) {
    return;
  }

  var e = document.createElement('img');
  e.classList.add('hsce-preload');
  e.setAttribute('src', imageUrl);
  preloadedImages[imageUrl] = true;
  body.appendChild(e);
}

function processElement(element) {
  var textNodes = textNodesUnder(element);
  for (var i = 0; i < textNodes.length; ++i) {
    (function (node) {
      var text = node.textContent;
      chrome.runtime.sendMessage({ detect: text }, function (matches) {
        let targets = [];

        for (let match of matches) {
          let [normalizedPhrase, start, end, imageUrl] = match;

          var phrase = '';
          var range = document.createRange();
          var isBracketed = false;

          var bracketPhrase = text.substring(start - 2, end + 2);
          var bracketMatch = bracketPhrase.match(/^\[\[(.*)\]\]$/);
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

          preloadImage(imageUrl);
          targets.push([range, phrase, imageUrl]);
        }

        updateTargets(targets);
      });
    })(textNodes[i]);
  }
}

function updateTargets(targets) {
  for (let target of targets) {
    let [range, phrase, imageUrl] = target;
    var span = document.createElement('span');
    span.dataset.hsceImg = imageUrl;
    range.surroundContents(span);
    span.textContent = phrase;
    addEvents(span);
  }
}

function addEvents(ref) {
  var preview = false;

  function scrollHandler() {
    window.removeEventListener('scroll', scrollHandler);
    hideCard();
  };

  function hideCard() {
    preview = false;
    var card = document.getElementById('hsce-card');
    card.classList.remove('hsce-active');
    window.removeEventListener('scroll', scrollHandler);
  }

  ref.addEventListener('mouseover', function (refElement) {
    preview = true;
    var refElement = this;

    var card = document.getElementById('hsce-card');
    card.removeAttribute('src');
    card.setAttribute('src', this.dataset.hsceImg);

    setTimeout(function () {
      if (!preview) {
        return;
      }

      positionCard(refElement, card);
      card.classList.add('hsce-active');
    }, 0);

    window.addEventListener('scroll', scrollHandler);
  });

  ref.addEventListener('mouseout', function (e) {
    hideCard();
  });
}

function positionCard(refElement, cardElement) {
  var rect = refElement.getBoundingClientRect();
  var height = cardElement.offsetHeight;
  var width = cardElement.offsetWidth;

  var space = 5;
  var leftPos = rect.right + space;
  if (leftPos + width > window.innerWidth) {
    leftPos = Math.max(rect.left - width - space, 0);
  }

  var topPos = ((rect.top + rect.bottom) / 2) - height / 2;
  var overflow = (topPos + height) - window.innerHeight;
  if (overflow > 0) {
    topPos -= overflow; 
  }

  topPos = Math.max(topPos, 0);

  cardElement.style.left = leftPos + 'px';
  cardElement.style.top = topPos + 'px';
}

document.addEventListener('animationstart', function (e) {
  if (e.animationName === 'hsceNodeInsertEvent') {
    processElement(e.target);
  }
});
