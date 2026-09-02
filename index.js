"use strict";
(function(global) {
    function State(changes) {
        changes = Array.prototype.slice.call(changes, 0);
        var index = -1;
        var length = changes.length;

        return {
            index: function() {
                return index + 1;
            },
            size: function() {
                return length;
            },
            current: function() {
                return changes[index];
            },
            previous: function() {
                var wrapped = false;
                do {
                    index--;
                    if (index < 0) {
                        index = length-1;
                        if (wrapped) {
                            break;
                        }
                        wrapped = true;
                    }
                } while (!isRendered(changes[index]));
                return changes[index];
            },
            next: function() {
                var wrapped = false;
                do {
                    index++;
                    if (index >= length) {
                        index = 0;
                        if (wrapped) {
                            break;
                        }
                        wrapped = true;
                    }
                } while (!isRendered(changes[index]));
                return changes[index];
            },
            none: function() {
                index = -1;
            }
        }
    }

    function createCheckbox(label, fn, key, defaultChecked) {
        var rv = document.createElement("label");
        var input = document.createElement("input");
        input.type = "checkbox";
        input.onchange = function(event) {
          fn(input);
          localStorage[key] = String(input.checked);
        }
        input.defaultChecked = getStorage(key, defaultChecked);
        rv.appendChild(input);
        rv.appendChild(document.createTextNode(" " + label));
        if (input.defaultChecked !== defaultChecked) {
          fn(input);
        }
        return rv;
    }

    function toggleHideOld(checkbox) {
      document.documentElement.classList.toggle('hide-diff-old', !(checkbox.checked));
    }

    function toggleHideMarkers(checkbox) {
      document.documentElement.classList.toggle('hide-diff-markers', !(checkbox.checked));
    }

    function getStorage(key, defaultValue) {
      if (key in localStorage) {
        return localStorage[key] === "true";
      }
      return defaultValue;
    }

    function isRendered(el) {
        return el.offsetWidth || el.offsetHeight || el.getClientRects().length;
    }

    function init() {
        var BUTTON_CSS_TEXT = "appearance: none; float: left; padding: 5px 15px; border: none; border-left: 1px solid #999; font: inherit; background-color: transparent; color: inherit;";
        var LABEL_CSS_TEXT = "float: left; padding: 5px; border: none; border-left: 1px solid #999;";
        var CHECKBOX_CSS_TEXT = "vertical-align: middle; margin: 0 1px; width: 13px; height: 13px;";
        var CSS_BORDER = "border-bottom: 2px solid #00F; border-bottom-color: light-dark(#00F, #DDD)";
        var container = document.createElement("div");
        var display = document.createElement("div");
        var old = createCheckbox("old", toggleHideOld, "htmldiffOldChecked", true);
        var markers = createCheckbox("markers", toggleHideMarkers, "htmldiffMarkersChecked", true);
        var previous = document.createElement("button");
        var next = document.createElement("button");
        var position = document.createElement("span");
        var warning = document.querySelector(".annoying-warning");
        display.appendChild(position);
        container.appendChild(display);
        container.appendChild(old);
        container.appendChild(markers);
        container.appendChild(previous);
        container.appendChild(next);
        document.body.appendChild(container);
        container.className = "w3c-htmldiff-nav";
        container.style.cssText = "background-image: linear-gradient(transparent,rgba(0,0,0,.05) 40%,rgba(0,0,0,.1)); font: 12px sans-serif; color: #666; border-top: 1px solid #999; border-right: 1px solid #999; border-left: 1px solid #999; position: fixed; bottom: 0; right: 25px; border-radius: 3px 3px 0 0; background-color: #eee; z-index: 2147483647;"
        old.style.cssText = LABEL_CSS_TEXT;
        old.firstChild.style.cssText = CHECKBOX_CSS_TEXT;
        markers.style.cssText = LABEL_CSS_TEXT;
        markers.firstChild.style.cssText = CHECKBOX_CSS_TEXT;
        next.style.cssText = BUTTON_CSS_TEXT;
        previous.style.cssText = BUTTON_CSS_TEXT;
        display.style.cssText = "float: left; padding: 5px 5px;"
        position.style.cssText = "background-color: #fff; border: 1px solid #999; padding: 1px 5px; box-shadow: inset 0 1px 3px #ddd; border-radius: 2px"
        next.textContent = "next ›";
        next.title = "Keyboard nav: use \"j\" to jump to next change."
        previous.textContent = "‹ previous";
        previous.title = "Keyboard nav: use \"k\" to jump to previous change.";

        function update(state) {
            position.textContent = state.index() + " of " + state.size();
        }

        function scrollIntoView(fwd) {
            var bCR = current.getBoundingClientRect();
            var height = window.innerHeight || document. documentElement.clientHeight;
            if (bCR.top < 0 ||       // we've scrolled past element
                bCR.bottom > height) {// element is below the fold
                current.scrollIntoView(fwd);
                window.scrollBy(0, (fwd ? -1 : 1) * 50);
            }
        }

        function onnext(e) {
            if (warning && warning.open) {
                warning.open = false;
            }
            if (current) {
                current.style.cssText = "";
            }
            current = state.next();
            current.style.cssText = CSS_BORDER;
            scrollIntoView(true);
            update(state);
        }

        function onprevious(e) {
            if (warning && warning.open) {
                warning.open = false;
            }
            if (current) {
                current.style.cssText = "";
            }
            current = state.previous();
            current.style.cssText = CSS_BORDER;
            scrollIntoView(false);
            update(state);
        }

        function onstop(e) {
            if (current) {
                current.style.cssText = "";
            }
            state.none();
            current = null;
            update(state);
        }

        var selector = document.querySelector("script[data-navigable-selector]")? document.querySelector("script[data-navigable-selector]").dataset["navigableSelector"] : "del.diff-old, ins.diff-chg, ins.diff-new";
        var diffs = document.querySelectorAll(selector);
        var current = null;
        var state = new State(diffs);
        next.onclick = onnext;
        previous.onclick = onprevious;
        document.addEventListener("keydown", function (e) {
            if (!e.metaKey && e.keyCode == 74) {
                onnext(e)
            } else if (!e.metaKey && e.keyCode == 75) {
                onprevious(e)
            } else if (!e.metaKey && e.keyCode == 27) {
                onstop(e)
            }
        }, false);
        update(state);
    }
    var interval = setInterval(function() {
        if(document.readyState === "complete") {
            clearInterval(interval);
            init();
        }
    }, 100);
})(window);
