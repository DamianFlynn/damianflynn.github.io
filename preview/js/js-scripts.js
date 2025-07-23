"use strict";
// var path_voice = anime.path(".foodtruck_voice path")
//   , foodtruck_voice = anime.timeline({
//     easing: "easeInOutQuad",
//     loop: !0,
//     autoplay: !1
// });
// foodtruck_voice.add({
//     targets: ".foodtruck_voice .truck",
//     opacity: 1,
//     delay: 500,
//     duration: 1e3
// }).add({
//     targets: ".foodtruck_voice .truck",
//     translateX: path_voice("x"),
//     translateY: path_voice("y"),
//     rotate: path_voice("angle"),
//     duration: 2e4
// }).add({
//     targets: ".foodtruck_voice .truck",
//     opacity: 0,
//     duration: 500,
//     andDelay: 1e4
// });

// var intersectionObserver = new IntersectionObserver(function (t) {
//   t[0].intersectionRatio <= 0 || foodtruck_voice.play();
// });
// var intersectionObserver = new IntersectionObserver(function (entries) {
//     if (entries[0].intersectionRatio > 0) {
//       // Element is visible, do something here
//     }
//   });
function _slicedToArray(t, e) {
  return (
    _arrayWithHoles(t) ||
    _iterableToArrayLimit(t, e) ||
    _unsupportedIterableToArray(t, e) ||
    _nonIterableRest()
  );
}
function _nonIterableRest() {
  throw new TypeError(
    "Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.",
  );
}
function _unsupportedIterableToArray(t, e) {
  if (t) {
    if ("string" == typeof t) return _arrayLikeToArray(t, e);
    var i = Object.prototype.toString.call(t).slice(8, -1);
    return (
      "Object" === i && t.constructor && (i = t.constructor.name),
      "Map" === i || "Set" === i
        ? Array.from(t)
        : "Arguments" === i ||
            /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(i)
          ? _arrayLikeToArray(t, e)
          : void 0
    );
  }
}
function _arrayLikeToArray(t, e) {
  (null == e || e > t.length) && (e = t.length);
  for (var i = 0, o = new Array(e); i < e; i++) o[i] = t[i];
  return o;
}
function _iterableToArrayLimit(t, e) {
  var i =
    null == t
      ? null
      : ("undefined" != typeof Symbol && t[Symbol.iterator]) || t["@@iterator"];
  if (null != i) {
    var o,
      r,
      n,
      s,
      a = [],
      l = !0,
      h = !1;
    try {
      if (((n = (i = i.call(t)).next), 0 === e)) {
        if (Object(i) !== i) return;
        l = !1;
      } else
        for (
          ;
          !(l = (o = n.call(i)).done) && (a.push(o.value), a.length !== e);
          l = !0
        );
    } catch (t) {
      (h = !0), (r = t);
    } finally {
      try {
        if (!l && null != i.return && ((s = i.return()), Object(s) !== s))
          return;
      } finally {
        if (h) throw r;
      }
    }
    return a;
  }
}
function _arrayWithHoles(t) {
  if (Array.isArray(t)) return t;
}
function _slicedToArray(t, e) {
  return (
    _arrayWithHoles(t) ||
    _iterableToArrayLimit(t, e) ||
    _unsupportedIterableToArray(t, e) ||
    _nonIterableRest()
  );
}
function _nonIterableRest() {
  throw new TypeError(
    "Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.",
  );
}
function _unsupportedIterableToArray(t, e) {
  if (t) {
    if ("string" == typeof t) return _arrayLikeToArray(t, e);
    var i = Object.prototype.toString.call(t).slice(8, -1);
    return (
      "Object" === i && t.constructor && (i = t.constructor.name),
      "Map" === i || "Set" === i
        ? Array.from(t)
        : "Arguments" === i ||
            /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(i)
          ? _arrayLikeToArray(t, e)
          : void 0
    );
  }
}
function _arrayLikeToArray(t, e) {
  (null == e || e > t.length) && (e = t.length);
  for (var i = 0, o = new Array(e); i < e; i++) o[i] = t[i];
  return o;
}
function _iterableToArrayLimit(t, e) {
  var i =
    null == t
      ? null
      : ("undefined" != typeof Symbol && t[Symbol.iterator]) || t["@@iterator"];
  if (null != i) {
    var o,
      r,
      n,
      s,
      a = [],
      l = !0,
      h = !1;
    try {
      if (((n = (i = i.call(t)).next), 0 === e)) {
        if (Object(i) !== i) return;
        l = !1;
      } else
        for (
          ;
          !(l = (o = n.call(i)).done) && (a.push(o.value), a.length !== e);
          l = !0
        );
    } catch (t) {
      (h = !0), (r = t);
    } finally {
      try {
        if (!l && null != i.return && ((s = i.return()), Object(s) !== s))
          return;
      } finally {
        if (h) throw r;
      }
    }
    return a;
  }
}
function _arrayWithHoles(t) {
  if (Array.isArray(t)) return t;
}
function _slicedToArray(t, e) {
  return (
    _arrayWithHoles(t) ||
    _iterableToArrayLimit(t, e) ||
    _unsupportedIterableToArray(t, e) ||
    _nonIterableRest()
  );
}
function _nonIterableRest() {
  throw new TypeError(
    "Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.",
  );
}
function _unsupportedIterableToArray(t, e) {
  if (t) {
    if ("string" == typeof t) return _arrayLikeToArray(t, e);
    var i = Object.prototype.toString.call(t).slice(8, -1);
    return (
      "Object" === i && t.constructor && (i = t.constructor.name),
      "Map" === i || "Set" === i
        ? Array.from(t)
        : "Arguments" === i ||
            /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(i)
          ? _arrayLikeToArray(t, e)
          : void 0
    );
  }
}
function _arrayLikeToArray(t, e) {
  (null == e || e > t.length) && (e = t.length);
  for (var i = 0, o = new Array(e); i < e; i++) o[i] = t[i];
  return o;
}
function _iterableToArrayLimit(t, e) {
  var i =
    null == t
      ? null
      : ("undefined" != typeof Symbol && t[Symbol.iterator]) || t["@@iterator"];
  if (null != i) {
    var o,
      r,
      n,
      s,
      a = [],
      l = !0,
      h = !1;
    try {
      if (((n = (i = i.call(t)).next), 0 === e)) {
        if (Object(i) !== i) return;
        l = !1;
      } else
        for (
          ;
          !(l = (o = n.call(i)).done) && (a.push(o.value), a.length !== e);
          l = !0
        );
    } catch (t) {
      (h = !0), (r = t);
    } finally {
      try {
        if (!l && null != i.return && ((s = i.return()), Object(s) !== s))
          return;
      } finally {
        if (h) throw r;
      }
    }
    return a;
  }
}
function _arrayWithHoles(t) {
  if (Array.isArray(t)) return t;
}
function _createForOfIteratorHelper(t, e) {
  var i =
    ("undefined" != typeof Symbol && t[Symbol.iterator]) || t["@@iterator"];
  if (!i) {
    if (
      Array.isArray(t) ||
      (i = _unsupportedIterableToArray(t)) ||
      (e && t && "number" == typeof t.length)
    ) {
      i && (t = i);
      var o = 0,
        r = function () {};
      return {
        s: r,
        n: function () {
          return o >= t.length ? { done: !0 } : { done: !1, value: t[o++] };
        },
        e: function (t) {
          throw t;
        },
        f: r,
      };
    }
    throw new TypeError(
      "Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.",
    );
  }
  var n,
    s = !0,
    a = !1;
  return {
    s: function () {
      i = i.call(t);
    },
    n: function () {
      var t = i.next();
      return (s = t.done), t;
    },
    e: function (t) {
      (a = !0), (n = t);
    },
    f: function () {
      try {
        s || null == i.return || i.return();
      } finally {
        if (a) throw n;
      }
    },
  };
}
function _slicedToArray(t, e) {
  return (
    _arrayWithHoles(t) ||
    _iterableToArrayLimit(t, e) ||
    _unsupportedIterableToArray(t, e) ||
    _nonIterableRest()
  );
}
function _nonIterableRest() {
  throw new TypeError(
    "Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.",
  );
}
function _unsupportedIterableToArray(t, e) {
  if (t) {
    if ("string" == typeof t) return _arrayLikeToArray(t, e);
    var i = Object.prototype.toString.call(t).slice(8, -1);
    return (
      "Object" === i && t.constructor && (i = t.constructor.name),
      "Map" === i || "Set" === i
        ? Array.from(t)
        : "Arguments" === i ||
            /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(i)
          ? _arrayLikeToArray(t, e)
          : void 0
    );
  }
}
function _arrayLikeToArray(t, e) {
  (null == e || e > t.length) && (e = t.length);
  for (var i = 0, o = new Array(e); i < e; i++) o[i] = t[i];
  return o;
}
function _iterableToArrayLimit(t, e) {
  var i =
    null == t
      ? null
      : ("undefined" != typeof Symbol && t[Symbol.iterator]) || t["@@iterator"];
  if (null != i) {
    var o,
      r,
      n,
      s,
      a = [],
      l = !0,
      h = !1;
    try {
      if (((n = (i = i.call(t)).next), 0 === e)) {
        if (Object(i) !== i) return;
        l = !1;
      } else
        for (
          ;
          !(l = (o = n.call(i)).done) && (a.push(o.value), a.length !== e);
          l = !0
        );
    } catch (t) {
      (h = !0), (r = t);
    } finally {
      try {
        if (!l && null != i.return && ((s = i.return()), Object(s) !== s))
          return;
      } finally {
        if (h) throw r;
      }
    }
    return a;
  }
}
function _arrayWithHoles(t) {
  if (Array.isArray(t)) return t;
}
function _slicedToArray(t, e) {
  return (
    _arrayWithHoles(t) ||
    _iterableToArrayLimit(t, e) ||
    _unsupportedIterableToArray(t, e) ||
    _nonIterableRest()
  );
}
function _nonIterableRest() {
  throw new TypeError(
    "Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.",
  );
}
function _unsupportedIterableToArray(t, e) {
  if (t) {
    if ("string" == typeof t) return _arrayLikeToArray(t, e);
    var i = Object.prototype.toString.call(t).slice(8, -1);
    return (
      "Object" === i && t.constructor && (i = t.constructor.name),
      "Map" === i || "Set" === i
        ? Array.from(t)
        : "Arguments" === i ||
            /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(i)
          ? _arrayLikeToArray(t, e)
          : void 0
    );
  }
}
function _arrayLikeToArray(t, e) {
  (null == e || e > t.length) && (e = t.length);
  for (var i = 0, o = new Array(e); i < e; i++) o[i] = t[i];
  return o;
}
function _iterableToArrayLimit(t, e) {
  var i =
    null == t
      ? null
      : ("undefined" != typeof Symbol && t[Symbol.iterator]) || t["@@iterator"];
  if (null != i) {
    var o,
      r,
      n,
      s,
      a = [],
      l = !0,
      h = !1;
    try {
      if (((n = (i = i.call(t)).next), 0 === e)) {
        if (Object(i) !== i) return;
        l = !1;
      } else
        for (
          ;
          !(l = (o = n.call(i)).done) && (a.push(o.value), a.length !== e);
          l = !0
        );
    } catch (t) {
      (h = !0), (r = t);
    } finally {
      try {
        if (!l && null != i.return && ((s = i.return()), Object(s) !== s))
          return;
      } finally {
        if (h) throw r;
      }
    }
    return a;
  }
}
function _arrayWithHoles(t) {
  if (Array.isArray(t)) return t;
}
function _typeof(t) {
  return (
    (_typeof =
      "function" == typeof Symbol && "symbol" == typeof Symbol.iterator
        ? function (t) {
            return typeof t;
          }
        : function (t) {
            return t &&
              "function" == typeof Symbol &&
              t.constructor === Symbol &&
              t !== Symbol.prototype
              ? "symbol"
              : typeof t;
          }),
    _typeof(t)
  );
}
// intersectionObserver.observe(document.querySelector("footer")),
  document.addEventListener("alpine:init", function () {
    Alpine.data("taCookieConsent", function () {
      return {
        show: !1,
        dialog: !1,
        status: !1,
        confirmed: !1,
        success: !1,
        options: {
          name: "taCookieConsent",
          store: "storage",
          expire: 30,
          timeout: 5e3,
          test: !1,
        },
        init: function () {
          for (
            var t = 0, e = Object.entries(this.$el.dataset);
            t < e.length;
            t++
          ) {
            var i = _slicedToArray(e[t], 2),
              o = i[0],
              r = i[1];
            void 0 !== this.options[o] && (this.options[o] = r);
          }
          if (
            ((this.options.expire = parseInt(this.options.expire)),
            (this.options.delay = parseInt(this.options.delay)),
            (this.options.test = "true" === this.options.test),
            "cookie" === this.options.store
              ? (this.status = this.getCookie(this.options.name))
              : (this.status = localStorage.getItem(this.options.name)),
            null === this.status)
          )
            return (this.show = !0), void (this.dialog = !0);
          if ("true" === this.status)
            return (this.confirmed = !0), void (this.status = !0);
          new Date();
          var n = localStorage.getItem(this.options.name + "Date");
          null !== n &&
            new Date(n).getTime() < Date.now() &&
            ((this.show = !0), (this.dialog = !0)),
            (this.status = !1);
        },
        accept: function () {
          var t = this;
          this.saveStatus(!0),
            (this.confirmed = !0),
            (this.dialog = !1),
            (this.success = !0),
            (this.show = !1),
            setInterval(function () {
              t.success = !1;
            }, this.options.timeout);
        },
        decline: function () {
          this.saveStatus(!1),
            (this.confirmed = !1),
            (this.dialog = !1),
            (this.show = !1);
        },
        saveStatus: function (t) {
          if (!0 !== this.options.test)
            if (((this.status = t), "cookie" !== this.options.store)) {
              var e = new Date();
              e.setTime(e.getTime() + 864e5 * this.options.expire),
                localStorage.setItem(this.options.name, t),
                localStorage.setItem(this.options.name + "Date", e);
            } else this.setCookie(this.options.name, t, this.options.expire);
          else
            console.info(
              "TA Cookie Consent is running in test mode - no data will be stored",
            );
        },
        getCookie: function (t) {
          var e = document.cookie.match("(^|;) ?" + t + "=([^;]*)(;|$)");
          return e ? e[2] : null;
        },
        setCookie: function (t, e, i) {
          var o = new Date();
          o.setTime(o.getTime() + 864e5 * i),
            (document.cookie =
              t + "=" + e + ";path=/;expires=" + o.toGMTString());
        },
      };
    });
  });
  document.addEventListener("alpine:init", function () {
    Alpine.data("taGallery", function () {
      return {
        el: {},
        previous_slide: 0,
        active_slide: 0,
        next_slide: 0,
        loaded: !1,
        modal: !1,
        timing: 0,
        interval: !1,
        autoplay: !1,
        class_names: {
          ri: "ta-gallery-anim-right-in",
          ro: "ta-gallery-anim-right-out",
          li: "ta-gallery-anim-left-in",
          lo: "ta-gallery-anim-left-out",
        },
        options: {
          item: "ta-gallery-element",
          size: "ta-gallery-size",
          active: "ta-gallery-element-active",
          lazy: "ta-gallery-image-lazy",
          minHeight: "10rem",
          start: 0,
          duration: "0.3s",
          origin: "center center",
          timing: "ease-in-out",
          autoplay: !1,
          interval: 5e3,
          pauseonhover: !0,
        },
        elements: [],
        init: function () {
          var t = this;
          this.el = this.$el;
          for (
            var e = 0, i = Object.entries(this.el.dataset);
            e < i.length;
            e++
          ) {
            var o = _slicedToArray(i[e], 2),
              r = o[0],
              n = o[1];
            void 0 !== this.options[r] && (this.options[r] = n);
          }
          (this.options.start = parseInt(this.options.start)),
            this.options.start > 0 && (this.options.start -= 1),
            (this.options.automatically =
              "true" === String(this.options.automatically).toLowerCase()),
            (this.options.pauseonhover =
              "true" === String(this.options.pauseonhover).toLowerCase()),
            (this.options.timing = parseInt(this.options.timing)),
            this.setDuration(this.options.duration),
            this.setOrigin(this.options.origin),
            this.setTiming(this.options.timing),
            this.el.classList.contains(this.options.size) &&
              "false" != this.options.minHeight &&
              this.setMinHeight(this.options.minHeight);
          var s = null,
            a = "",
            l = 0;
          if (
            (["height", "width", "size"].forEach(function (e) {
              if (void 0 !== t.$refs[e])
                return (
                  (a = e),
                  (s = t.$refs[e]),
                  void (
                    "IMG" !== t.$refs[e].nodeName &&
                    (s = t.$refs[e].querySelector("img"))
                  )
                );
            }),
            null !== s && !s.classList.contains(this.options.item))
          ) {
            var h = new Image();
            (h.src = s.src),
              (h.onload = function (e) {
                t.setSize(a, e.target);
              });
          }
          this.el
            .querySelectorAll("." + this.options.item)
            .forEach(function (e) {
              t.elements.push(e);
              var i = e.querySelector("img");
              if (null !== i) {
                var o = !1;
                i.classList.contains(t.options.lazy) &&
                  void 0 !== i.dataset.src &&
                  ((o = !0), t.setMinHeight(t.options.minHeight));
                var r = new Image();
                (r.onload = function (e) {
                  ++l >= t.elements.length && (t.loaded = !0);
                  var r = e.target.src;
                  o &&
                    setTimeout(function (e) {
                      i.classList.remove(t.options.lazy), (i.src = r);
                    }, 0),
                    null !== s && s.src === r && t.setSize(a, e.target);
                }),
                  (r.src = o ? i.dataset.src : i.src),
                  e.addEventListener("animationend", function (t) {
                    var e = t.animationName.split("-");
                    (e[2] = "anim"), t.target.classList.remove(e.join("-"));
                  });
              } else ++l >= t.elements.length && (t.loaded = !0);
            }),
            this.elements[this.options.start].classList.add(
              this.options.active,
            ),
            (this.active_slide = this.options.start),
            (this.previous_slide = this.getPrevious()),
            (this.next_slide = this.getNext()),
            this.options.autoplay && this.setAutoplay(),
            this.$watch("modal", function (e) {
              var i = "ta-gallery-modal-hide",
                o = {
                  show: !1,
                  index: t.active_slide,
                  src: t.elements[t.active_slide].src,
                };
              !0 === e && ((i = "ta-gallery-modal-show"), (o.show = !0));
              var r = new CustomEvent(i, { detail: o });
              window.dispatchEvent(r);
            });
        },
        next: function () {
          (this.previous_slide = this.active_slide),
            (this.active_slide = this.getNext()),
            (this.next_slide = this.getNext()),
            this.elements[this.active_slide].classList.remove(
              this.class_names.lo,
              this.class_names.li,
              this.class_names.ro,
            ),
            this.elements[this.active_slide].classList.toggle(
              this.options.active,
            ),
            this.elements[this.previous_slide].classList.toggle(
              this.options.active,
            ),
            this.elements[this.active_slide].classList.add(this.class_names.ri),
            this.elements[this.previous_slide].classList.add(
              this.class_names.ro,
            ),
            this.elements[this.previous_slide].classList.remove(
              this.class_names.lo,
              this.class_names.li,
              this.class_names.ri,
            ),
            (this.timing = 0);
        },
        previous: function () {
          (this.previous_slide = this.active_slide),
            (this.active_slide = this.getPrevious()),
            (this.next_slide = this.getNext()),
            this.elements[this.active_slide].classList.remove(
              this.class_names.ri,
              this.class_names.ro,
              this.class_names.lo,
            ),
            this.elements[this.active_slide].classList.toggle(
              this.options.active,
            ),
            this.elements[this.previous_slide].classList.toggle(
              this.options.active,
            ),
            this.elements[this.active_slide].classList.add(this.class_names.li),
            this.elements[this.previous_slide].classList.add(
              this.class_names.lo,
            ),
            this.elements[this.previous_slide].classList.remove(
              this.class_names.ri,
              this.class_names.ro,
              this.class_names.li,
            ),
            (this.timing = 0);
        },
        stop: function () {
          clearInterval(this.interval);
        },
        pause: function () {
          this.autoplay = !1;
        },
        resume: function () {
          this.autoplay = !0;
        },
        togglePlay: function () {
          this.autoplay = !this.autoplay;
        },
        toggleModal: function () {
          this.modal = !this.modal;
        },
        getNext: function () {
          return this.elements.length > this.active_slide + 1
            ? this.active_slide + 1
            : 0;
        },
        getPrevious: function () {
          return this.active_slide - 1 >= 0
            ? this.active_slide - 1
            : this.elements.length - 1;
        },
        focusIsChild: function () {
          return this.el.contains(document.activeElement);
        },
        setMinHeight: function (t) {
          this.el.style.setProperty("--ta-gallery-min-height", t);
        },
        setDuration: function (t) {
          this.el.style.setProperty("--ta-gallery-anim-duration", t);
        },
        setOrigin: function (t) {
          this.el.style.setProperty("--ta-gallery-anim-origin", t);
        },
        setTiming: function (t) {
          this.el.style.setProperty("--ta-gallery-anim-timing", t);
        },
        setSize: function (t, e) {
          var i = e.naturalWidth / e.naturalHeight;
          "height" === t
            ? this.el.style.setProperty("--ta-gallery-height", e.height + "px")
            : "width" === t
              ? (this.el.style.setProperty(
                  "--ta-gallery-width",
                  e.width + "px",
                ),
                this.el.style.setProperty(
                  "--ta-gallery-height",
                  Math.floor(e.width / i) + "px",
                ))
              : "size" === t &&
                (this.el.style.setProperty(
                  "--ta-gallery-width",
                  e.width + "px",
                ),
                this.el.style.setProperty(
                  "--ta-gallery-height",
                  e.height + "px",
                ));
        },
        setAutoplay: function () {
          var t = this;
          (this.autoplay = !0),
            (this.interval = setInterval(function () {
              !1 !== t.autoplay &&
                ((t.timing += 1e3),
                t.timing >= t.options.interval && ((t.timing = 0), t.next()));
            }, 1e3)),
            this.options.pauseonhover &&
              (this.el.addEventListener("mouseover", function () {
                t.autoplay = !1;
              }),
              this.el.addEventListener("mouseout", function () {
                t.focusIsChild() || (t.autoplay = !0);
              })),
            window.addEventListener("focus", function () {
              t.focusIsChild() || (t.autoplay = !0);
            }),
            window.addEventListener("blur", function () {
              t.autoplay = !1;
            });
        },
      };
    });
  });
  document.addEventListener("alpine:init", function () {
    Alpine.data("taNavigation", function () {
      return {
        modal: !1,
        scroll: !1,
        options: {
          modal_ref: "modal",
          modal_anim_name: "slide-right",
          scroll_ref: "scroll",
          scroll_initiator: "main",
          scroll_anim_name: "slide-top",
        },
        init: function () {
          for (
            var t = 0, e = Object.entries(this.$el.dataset);
            t < e.length;
            t++
          ) {
            var i = _slicedToArray(e[t], 2),
              o = i[0],
              r = i[1];
            void 0 !== this.options[o] && (this.options[o] = r);
          }
          this.initScroll(), this.initModal();
        },
        initModal: function () {
          var t = this;
          void 0 !== this.$refs[this.options.modal_ref] &&
            (this.$refs[this.options.modal_ref].addEventListener(
              "animationend",
              function (e) {
                t.modal ||
                  t.$refs[t.options.modal_ref].style.setProperty(
                    "--ta-navigation-modal-display",
                    "none",
                  );
              },
            ),
            this.$watch("modal", function (e) {
              if (e)
                return (
                  t.$refs[t.options.modal_ref].style.setProperty(
                    "--ta-navigation-modal-anim",
                    t.options.modal_anim_name + "-in",
                  ),
                  t.$refs[t.options.modal_ref].style.setProperty(
                    "--ta-navigation-modal-display",
                    "block",
                  ),
                  void document.documentElement.style.setProperty(
                    "--ta-page-scrolling",
                    "hidden",
                  )
                );
              t.$refs[t.options.modal_ref].style.setProperty(
                "--ta-navigation-modal-anim",
                t.options.modal_anim_name + "-out",
              ),
                document.documentElement.style.removeProperty(
                  "--ta-page-scrolling",
                );
            }));
        },
        initScroll: function () {
          var t = this,
            e = document.getElementById(this.options.scroll_initiator);
          if (null !== e && void 0 !== this.$refs[this.options.scroll_ref]) {
            this.$refs[this.options.scroll_ref].addEventListener(
              "animationend",
              function () {
                t.scroll ||
                  t.$refs[t.options.scroll_ref].style.setProperty(
                    "--ta-navigation-scroll-display",
                    "none",
                  );
              },
            ),
              this.$watch("scroll", function (e) {
                if (e)
                  return (
                    t.$refs[t.options.scroll_ref].style.setProperty(
                      "--ta-navigation-scroll-anim",
                      t.options.scroll_anim_name + "-in",
                    ),
                    void t.$refs[t.options.scroll_ref].style.setProperty(
                      "--ta-navigation-scroll-display",
                      "block",
                    )
                  );
                t.$refs[t.options.scroll_ref].style.setProperty(
                  "--ta-navigation-scroll-anim",
                  t.options.scroll_anim_name + "-out",
                );
              });
            var i = e.getBoundingClientRect().top + window.scrollY;
            window.addEventListener("scroll", function () {
              window.scrollY >= i ? (t.scroll = !0) : (t.scroll = !1);
            });
          }
        },
        toggleModal: function () {
          this.modal = !this.modal;
        },
        hideModal: function () {
          this.modal = !1;
        },
        showModal: function () {
          this.modal = !0;
        },
      };
    });
  });
  document.addEventListener("alpine:init", function () {
    Alpine.data("taToc", function () {
      return {
        initialized: !1,
        folded: !0,
        title: "",
        options: {
          folded: !0,
          length: 100,
          add_height: 0,
          threshold: 100,
          titleShow: "",
          titleHide: "",
        },
        init: function () {
          for (
            var t = this, e = 0, i = Object.entries(this.$el.dataset);
            e < i.length;
            e++
          ) {
            var o = _slicedToArray(i[e], 2),
              r = o[0],
              n = o[1];
            void 0 !== this.options[r] &&
              (isNaN(n)
                ? (this.options[r] = n)
                : (this.options[r] = parseInt(n)));
          }
          (this.options.add_height = parseInt(this.options.add_height)),
            (this.options.length = parseInt(this.options.length)),
            (this.options.threshold = parseInt(this.options.threshold)),
            this.options.titleShow.length > 0 &&
              ((this.title = this.options.titleShow),
              this.$watch("folded", function (e) {
                t.title = !0 !== e ? t.options.titleShow : t.options.titleHide;
              })),
            this.checkFolded(),
            this.setSmoothScrolling();
        },
        toggle: function () {
          this.folded = !this.folded;
        },
        checkFolded: function () {
          (this.folded = this.options.folded),
            this.options.length > this.options.threshold && (this.folded = !1);
        },
        setSmoothScrolling: function () {
          var t,
            e = this,
            i = _createForOfIteratorHelper(
              this.$el.querySelectorAll("a[href^='#']"),
            );
          try {
            for (i.s(); !(t = i.n()).done; ) {
              t.value.addEventListener("click", function (t) {
                t.preventDefault();
                var i = t.target.getAttribute("href");
                i = '[id="'.concat(i.substr(1), '"]');
                var o = document.body.getBoundingClientRect(),
                  r =
                    document.querySelector(i).getBoundingClientRect().top -
                    o.top +
                    e.options.add_height;
                scroll({ top: parseInt(r), behavior: "smooth" });
              });
            }
          } catch (t) {
            i.e(t);
          } finally {
            i.f();
          }
        },
      };
    });
  });
  (window.taYoutube = function () {
    return {
      active: !1,
      url: "",
      hash: "",
      options: {
        id: "",
        source: "youtube",
        remember: "true",
        autoplay: "false",
        aspect_ratio: "false",
        start_at: "",
        end_at: "",
        button: "button",
      },
      init: function () {
        var t = this,
          e =
            arguments.length > 0 && void 0 !== arguments[0] ? arguments[0] : "",
          i =
            arguments.length > 1 && void 0 !== arguments[1] ? arguments[1] : {};
        if (
          ("" !== e && (this.options.id = e),
          "object" !== _typeof(i) || i instanceof Array)
        )
          console.warn(
            "Options are in wrong type - should be object - options been used",
          );
        else
          for (var o = 0, r = Object.entries(i); o < r.length; o++) {
            var n = _slicedToArray(r[o], 2),
              s = n[0],
              a = n[1];
            this.options[s] = a;
          }
        for (
          var l = 0, h = Object.entries(this.$el.dataset);
          l < h.length;
          l++
        ) {
          var u = _slicedToArray(h[l], 2),
            c = u[0],
            d = u[1];
          void 0 !== this.options[c] && (this.options[c] = d);
        }
        "vimeo" === this.options.source
          ? (this.url = "https://player.vimeo.com/video/" + this.options.id)
          : (this.url =
              "https://www.youtube-nocookie.com/embed/" + this.options.id),
          "false" !== String(this.options.aspect_ratio).toLowerCase() &&
            this.$el.style.setProperty(
              "--ta-youtube-aspect-ratio",
              parseFloat(this.options.aspect_ratio),
            ),
          (this.hash =
            this.hashCode(window.location.href) +
            "_" +
            this.hashCode(this.url));
        var p = [];
        "true" === localStorage.getItem("youtube_" + this.hash) &&
        "true" === this.options.remember
          ? ((this.active = !0),
            "true" === this.options.autoplay && p.push("autoplay=1"))
          : p.push("autoplay=1"),
          void 0 !== this.$refs[this.options.button] &&
            (this.setButtonHeight(),
            window.addEventListener("resize", function () {
              t.setButtonHeight();
            })),
          "" !== this.options.start_at &&
            p.push("start=" + this.options.start_at),
          "" !== this.options.end_at && p.push("end=" + this.options.end_at),
          p.length > 0 && (this.url += "?" + p.join("&"));
      },
      show: function () {
        (this.active = !0),
          this.options.remember &&
            localStorage.setItem("youtube_" + this.hash, "true");
      },
      setButtonHeight: function () {
        var t = this.$refs[this.options.button].offsetHeight;
        this.$el.style.setProperty("--ta-youtube-buttonHeight", t + "px");
      },
      hashCode: function (t) {
        var e,
          i = 0;
        for (e = 0; e < t.length; e++)
          (i = (i << 5) - i + t.charCodeAt(e)), (i |= 0);
        return i;
      },
    };
  });
