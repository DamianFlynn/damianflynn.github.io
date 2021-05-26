!(function (n) {
  var i = {};
  function o(e) {
    if (i[e]) return i[e].exports;
    var t = (i[e] = { i: e, l: !1, exports: {} });
    return n[e].call(t.exports, t, t.exports, o), (t.l = !0), t.exports;
  }
  (o.m = n),
    (o.c = i),
    (o.d = function (e, t, n) {
      o.o(e, t) || Object.defineProperty(e, t, { enumerable: !0, get: n });
    }),
    (o.r = function (e) {
      "undefined" != typeof Symbol && Symbol.toStringTag && Object.defineProperty(e, Symbol.toStringTag, { value: "Module" }), Object.defineProperty(e, "__esModule", { value: !0 });
    }),
    (o.t = function (t, e) {
      if ((1 & e && (t = o(t)), 8 & e)) return t;
      if (4 & e && "object" == typeof t && t && t.__esModule) return t;
      var n = Object.create(null);
      if ((o.r(n), Object.defineProperty(n, "default", { enumerable: !0, value: t }), 2 & e && "string" != typeof t))
        for (var i in t)
          o.d(
            n,
            i,
            function (e) {
              return t[e];
            }.bind(null, i)
          );
      return n;
    }),
    (o.n = function (e) {
      var t =
        e && e.__esModule
          ? function () {
              return e.default;
            }
          : function () {
              return e;
            };
      return o.d(t, "a", t), t;
    }),
    (o.o = function (e, t) {
      return Object.prototype.hasOwnProperty.call(e, t);
    }),
    (o.p = ""),
    o((o.s = 11));
})([
  ,
  ,
  ,
  ,
  ,
  ,
  ,
  ,
  ,
  ,
  ,
  function (e, t, n) {
    e.exports = n(29);
  },
  function (e, t, n) {},
  function (e, t, n) {
    var i, o;
    (i = "undefined" != typeof window ? window : {}),
      (o = (function (c, F, d) {
        "use strict";
        var O, B;
        if (
          ((function () {
            var e,
              t = {
                lazyClass: "lazyload",
                loadedClass: "lazyloaded",
                loadingClass: "lazyloading",
                preloadClass: "lazypreload",
                errorClass: "lazyerror",
                autosizesClass: "lazyautosizes",
                srcAttr: "data-src",
                srcsetAttr: "data-srcset",
                sizesAttr: "data-sizes",
                minSize: 40,
                customMedia: {},
                init: !0,
                expFactor: 1.5,
                hFac: 0.8,
                loadMode: 2,
                loadHidden: !0,
                ricTimeout: 0,
                throttleDelay: 125,
              };
            B = c.lazySizesConfig || c.lazysizesConfig || {};
            for (e in t) e in B || (B[e] = t[e]);
          })(),
          !F || !F.getElementsByClassName)
        )
          return { init: function () {}, cfg: B, noSupport: !0 };
        var D = F.documentElement,
          i = c.HTMLPictureElement,
          P = "addEventListener",
          R = "getAttribute",
          I = c[P].bind(c),
          j = c.setTimeout,
          U = c.requestAnimationFrame || j,
          a = c.requestIdleCallback,
          Y = /^picture$/i,
          o = ["load", "error", "lazyincluded", "_lazyloaded"],
          n = {},
          $ = Array.prototype.forEach,
          Q = function (e, t) {
            return n[t] || (n[t] = new RegExp("(\\s|^)" + t + "(\\s|$)")), n[t].test(e[R]("class") || "") && n[t];
          },
          G = function (e, t) {
            Q(e, t) || e.setAttribute("class", (e[R]("class") || "").trim() + " " + t);
          },
          J = function (e, t) {
            var n;
            (n = Q(e, t)) && e.setAttribute("class", (e[R]("class") || "").replace(n, " "));
          },
          K = function (t, n, e) {
            var i = e ? P : "removeEventListener";
            e && K(t, n),
              o.forEach(function (e) {
                t[i](e, n);
              });
          },
          V = function (e, t, n, i, o) {
            var s = F.createEvent("Event");
            return n || (n = {}), (n.instance = O), s.initEvent(t, !i, !o), (s.detail = n), e.dispatchEvent(s), s;
          },
          X = function (e, t) {
            var n;
            !i && (n = c.picturefill || B.pf) ? (t && t.src && !e[R]("srcset") && e.setAttribute("srcset", t.src), n({ reevaluate: !0, elements: [e] })) : t && t.src && (e.src = t.src);
          },
          Z = function (e, t) {
            return (getComputedStyle(e, null) || {})[t];
          },
          r = function (e, t, n) {
            for (n = n || e.offsetWidth; n < B.minSize && t && !e._lazysizesWidth; ) (n = t.offsetWidth), (t = t.parentNode);
            return n;
          },
          ee = (function () {
            var n,
              i,
              t = [],
              o = [],
              s = t,
              r = function () {
                var e = s;
                for (s = t.length ? o : t, n = !0, i = !1; e.length; ) e.shift()();
                n = !1;
              },
              e = function (e, t) {
                n && !t ? e.apply(this, arguments) : (s.push(e), i || ((i = !0), (F.hidden ? j : U)(r)));
              };
            return (e._lsFlush = r), e;
          })(),
          te = function (n, e) {
            return e
              ? function () {
                  ee(n);
                }
              : function () {
                  var e = this,
                    t = arguments;
                  ee(function () {
                    n.apply(e, t);
                  });
                };
          },
          ne = function (e) {
            var n,
              i = 0,
              o = B.throttleDelay,
              s = B.ricTimeout,
              t = function () {
                (n = !1), (i = d.now()), e();
              },
              r =
                a && s > 49
                  ? function () {
                      a(t, { timeout: s }), s !== B.ricTimeout && (s = B.ricTimeout);
                    }
                  : te(function () {
                      j(t);
                    }, !0);
            return function (e) {
              var t;
              (e = !0 === e) && (s = 33), n || ((n = !0), (t = o - (d.now() - i)), t < 0 && (t = 0), e || t < 9 ? r() : j(r, t));
            };
          },
          ie = function (e) {
            var t,
              n,
              i = 99,
              o = function () {
                (t = null), e();
              },
              s = function () {
                var e = d.now() - n;
                e < i ? j(s, i - e) : (a || o)(o);
              };
            return function () {
              (n = d.now()), t || (t = j(s, i));
            };
          },
          e = (function () {
            var h,
              m,
              u,
              g,
              e,
              v,
              y,
              p,
              b,
              w,
              z,
              S,
              s = /^img$/i,
              f = /^iframe$/i,
              _ = "onscroll" in c && !/(gle|ing)bot/.test(navigator.userAgent),
              E = 0,
              L = 0,
              C = 0,
              x = -1,
              A = function (e) {
                C--, (!e || C < 0 || !e.target) && (C = 0);
              },
              H = function (e) {
                return null == S && (S = "hidden" == Z(F.body, "visibility")), S || !("hidden" == Z(e.parentNode, "visibility") && "hidden" == Z(e, "visibility"));
              },
              k = function (e, t) {
                var n,
                  i = e,
                  o = H(e);
                for (p -= t, z += t, b -= t, w += t; o && (i = i.offsetParent) && i != F.body && i != D; )
                  (o = (Z(i, "opacity") || 1) > 0) && "visible" != Z(i, "overflow") && ((n = i.getBoundingClientRect()), (o = w > n.left && b < n.right && z > n.top - 1 && p < n.bottom + 1));
                return o;
              },
              t = function () {
                var e,
                  t,
                  n,
                  i,
                  o,
                  s,
                  r,
                  a,
                  l,
                  c,
                  d,
                  u,
                  f = O.elements;
                if ((g = B.loadMode) && C < 8 && (e = f.length)) {
                  for (t = 0, x++; t < e; t++)
                    if (f[t] && !f[t]._lazyRace)
                      if (!_ || (O.prematureUnveil && O.prematureUnveil(f[t]))) N(f[t]);
                      else if (
                        (((a = f[t][R]("data-expand")) && (s = 1 * a)) || (s = L),
                        c ||
                          ((c = !B.expand || B.expand < 1 ? (D.clientHeight > 500 && D.clientWidth > 500 ? 500 : 370) : B.expand),
                          (O._defEx = c),
                          (d = c * B.expFactor),
                          (u = B.hFac),
                          (S = null),
                          L < d && C < 1 && x > 2 && g > 2 && !F.hidden ? ((L = d), (x = 0)) : (L = g > 1 && x > 1 && C < 6 ? c : E)),
                        l !== s && ((v = innerWidth + s * u), (y = innerHeight + s), (r = -1 * s), (l = s)),
                        (n = f[t].getBoundingClientRect()),
                        (z = n.bottom) >= r && (p = n.top) <= y && (w = n.right) >= r * u && (b = n.left) <= v && (z || w || b || p) && (B.loadHidden || H(f[t])) && ((m && C < 3 && !a && (g < 3 || x < 4)) || k(f[t], s)))
                      ) {
                        if ((N(f[t]), (o = !0), C > 9)) break;
                      } else !o && m && !i && C < 4 && x < 4 && g > 2 && (h[0] || B.preloadAfterLoad) && (h[0] || (!a && (z || w || b || p || "auto" != f[t][R](B.sizesAttr)))) && (i = h[0] || f[t]);
                  i && !o && N(i);
                }
              },
              n = ne(t),
              q = function (e) {
                var t = e.target;
                if (t._lazyCache) return void delete t._lazyCache;
                A(e), G(t, B.loadedClass), J(t, B.loadingClass), K(t, T), V(t, "lazyloaded");
              },
              i = te(q),
              T = function (e) {
                i({ target: e.target });
              },
              M = function (t, n) {
                try {
                  t.contentWindow.location.replace(n);
                } catch (e) {
                  t.src = n;
                }
              },
              W = function (e) {
                var t,
                  n = e[R](B.srcsetAttr);
                (t = B.customMedia[e[R]("data-media") || e[R]("media")]) && e.setAttribute("media", t), n && e.setAttribute("srcset", n);
              },
              r = te(function (t, e, n, i, o) {
                var s, r, a, l, c, d;
                (c = V(t, "lazybeforeunveil", e)).defaultPrevented ||
                  (i && (n ? G(t, B.autosizesClass) : t.setAttribute("sizes", i)),
                  (r = t[R](B.srcsetAttr)),
                  (s = t[R](B.srcAttr)),
                  o && ((a = t.parentNode), (l = a && Y.test(a.nodeName || ""))),
                  (d = e.firesLoad || ("src" in t && (r || s || l))),
                  (c = { target: t }),
                  G(t, B.loadingClass),
                  d && (clearTimeout(u), (u = j(A, 2500)), K(t, T, !0)),
                  l && $.call(a.getElementsByTagName("source"), W),
                  r ? t.setAttribute("srcset", r) : s && !l && (f.test(t.nodeName) ? M(t, s) : (t.src = s)),
                  o && (r || l) && X(t, { src: s })),
                  t._lazyRace && delete t._lazyRace,
                  J(t, B.lazyClass),
                  ee(function () {
                    var e = t.complete && t.naturalWidth > 1;
                    (d && !e) ||
                      (e && G(t, "ls-is-cached"),
                      q(c),
                      (t._lazyCache = !0),
                      j(function () {
                        "_lazyCache" in t && delete t._lazyCache;
                      }, 9)),
                      "lazy" == t.loading && C--;
                  }, !0);
              }),
              N = function (e) {
                if (!e._lazyRace) {
                  var t,
                    n = s.test(e.nodeName),
                    i = n && (e[R](B.sizesAttr) || e[R]("sizes")),
                    o = "auto" == i;
                  ((!o && m) || !n || (!e[R]("src") && !e.srcset) || e.complete || Q(e, B.errorClass) || !Q(e, B.lazyClass)) &&
                    ((t = V(e, "lazyunveilread").detail), o && oe.updateElem(e, !0, e.offsetWidth), (e._lazyRace = !0), C++, r(e, t, o, i, n));
                }
              },
              o = ie(function () {
                (B.loadMode = 3), n();
              }),
              a = function () {
                3 == B.loadMode && (B.loadMode = 2), o();
              },
              l = function () {
                if (!m) {
                  if (d.now() - e < 999) return void j(l, 999);
                  (m = !0), (B.loadMode = 3), n(), I("scroll", a, !0);
                }
              };
            return {
              _: function () {
                (e = d.now()),
                  (O.elements = F.getElementsByClassName(B.lazyClass)),
                  (h = F.getElementsByClassName(B.lazyClass + " " + B.preloadClass)),
                  I("scroll", n, !0),
                  I("resize", n, !0),
                  I("pageshow", function (e) {
                    if (e.persisted) {
                      var t = F.querySelectorAll("." + B.loadingClass);
                      t.length &&
                        t.forEach &&
                        U(function () {
                          t.forEach(function (e) {
                            e.complete && N(e);
                          });
                        });
                    }
                  }),
                  c.MutationObserver ? new MutationObserver(n).observe(D, { childList: !0, subtree: !0, attributes: !0 }) : (D[P]("DOMNodeInserted", n, !0), D[P]("DOMAttrModified", n, !0), setInterval(n, 999)),
                  I("hashchange", n, !0),
                  ["focus", "mouseover", "click", "load", "transitionend", "animationend"].forEach(function (e) {
                    F[P](e, n, !0);
                  }),
                  /d$|^c/.test(F.readyState) ? l() : (I("load", l), F[P]("DOMContentLoaded", n), j(l, 2e4)),
                  O.elements.length ? (t(), ee._lsFlush()) : n();
              },
              checkElems: n,
              unveil: N,
              _aLSL: a,
            };
          })(),
          oe = (function () {
            var n,
              s = te(function (e, t, n, i) {
                var o, s, r;
                if (((e._lazysizesWidth = i), (i += "px"), e.setAttribute("sizes", i), Y.test(t.nodeName || ""))) for (o = t.getElementsByTagName("source"), s = 0, r = o.length; s < r; s++) o[s].setAttribute("sizes", i);
                n.detail.dataAttr || X(e, n.detail);
              }),
              i = function (e, t, n) {
                var i,
                  o = e.parentNode;
                o && ((n = r(e, o, n)), (i = V(e, "lazybeforesizes", { width: n, dataAttr: !!t })), i.defaultPrevented || ((n = i.detail.width) && n !== e._lazysizesWidth && s(e, o, i, n)));
              },
              e = function () {
                var e,
                  t = n.length;
                if (t) for (e = 0; e < t; e++) i(n[e]);
              },
              t = ie(e);
            return {
              _: function () {
                (n = F.getElementsByClassName(B.autosizesClass)), I("resize", t);
              },
              checkElems: t,
              updateElem: i,
            };
          })(),
          t = function () {
            !t.i && F.getElementsByClassName && ((t.i = !0), oe._(), e._());
          };
        return (
          j(function () {
            B.init && t();
          }),
          (O = { cfg: B, autoSizer: oe, loader: e, init: t, uP: X, aC: G, rC: J, hC: Q, fire: V, gW: r, rAF: ee })
        );
      })(i, i.document, Date)),
      (i.lazySizes = o),
      e.exports && (e.exports = o);
  },
  function (e, t) {
    var n;
    (n = document.querySelector(".back_to_top")),
      window.addEventListener("scroll", function () {
        150 < window.pageYOffset && 768 < window.outerWidth ? n.classList.add("block") : n.classList.remove("block");
      }),
      n.addEventListener("click", function e() {
        0 < window.pageYOffset && (window.scrollBy(0, -80), setTimeout(e, 0));
      });
  },
  function (e, t) {
    !(function () {
      var e = document.querySelectorAll(".content_zone h2:not([id='']), .content_zone h3:not([id='']), .content_zone h4:not([id=''])");
      if (e && 0 < e.length)
        for (var t = 0; t < e.length; t++) {
          var n = e[t],
            i = document.createElement("a");
          (i.href = "#" + n.id), i.setAttribute("aria-hidden", "true"), i.setAttribute("class", "header__link ml-2 text-lightseagreen-600"), (i.innerHTML = '<img src="/images/link.svg" class="inline" />'), n.appendChild(i);
        }
    })();
  },
  function (e, t) {
    !(function (e, o) {
      try {
        var t = document.createElement("div");
        (t.id = "progress-cont"), t.setAttribute("class", "progress__cont");
        var s = document.createElement("div");
        (s.id = "progress-bar"),
          s.setAttribute("class", "progress__bar"),
          (s.style.width = "0%"),
          t.appendChild(s),
          e.append(t),
          window.addEventListener("scroll", function (e) {
            var t = window.innerHeight,
              n = document.querySelector(o).clientHeight - t,
              i = (window.pageYOffset / n) * 100;
            s.style.width = i + "%";
          });
      } catch (e) {}
    })(document.body, ".scrollable");
  },
  function (e, t) {
    function n() {}
    var i, o;
    (n.init = function () {
      this.targetElm = document.querySelector("#pseudo");
    }),
      (n.setTargetHeight = function (e) {
        if (this.targetElm && e && 768 < window.outerWidth) {
          var t = e.clientHeight + 10;
          this.crntHeight !== t &&
            ((this.targetElm.innerHTML = '\n            :target::before {\n              content: "";\n              display: block;\n              height: ' + t + "px;\n              margin: -" + t + "px 0 0;\n            }\n          "),
            (this.crntHeight = t));
        }
      }),
      (n.crntHeight = 0),
      (n.targetElm = null),
      (i = n),
      (o = document.querySelector("header")) &&
        (i.init(),
        i.setTargetHeight(o),
        window.addEventListener("scroll", function () {
          768 < window.outerWidth &&
            ((document.scrollingElement && 10 < document.scrollingElement.scrollTop) || (document.documentElement && 10 < document.documentElement.scrollTop) ? o.classList.add("shadow-md") : o.classList.remove("shadow-md"));
        }),
        (window.onresize = function () {
          return i.setTargetHeight(o);
        }));
  },
  ,
  ,
  ,
  ,
  ,
  ,
  ,
  ,
  ,
  ,
  ,
  function (e, t, n) {
    "use strict";
    n.r(t);
    function i(e, t) {
      for (; e.parentNode; ) {
        if (e === t) return !0;
        e = e.parentNode;
      }
      return !1;
    }
    function a(e, t) {
      return e.classList.contains(t) ? (e.classList.remove(t), !1) : (e.classList.add(t), !0);
    }
    n(12), n(13), n(14);
    var o = "dark";
    !(function () {
      if (localStorage) {
        var e = localStorage.getItem("theme");
        e && e === o && document.body.classList.add(o);
      }
      var t = document.querySelector("#theme-icon");
      t &&
        t.addEventListener("click", function () {
          var e = document.body.classList.contains(o);
          localStorage && localStorage.setItem("theme", e ? "light" : o), a(document.body, o), DISQUS && DISQUS.reset && DISQUS.reset({ reload: !0 });
        });
    })();
    n(15);
    !(function () {
      function e(e) {
        if ((e.preventDefault(), this)) {
          var t = this.querySelector("img");
          t &&
            t.dataset &&
            t.dataset.src &&
            (function (e) {
              var t = document.querySelector(".basicLightbox");
              if (t && e) {
                t.querySelector(".basicLightbox__placeholder img").setAttribute("src", e);
                var n = function (e) {
                  t && t.classList.remove("basicLightbox--visible");
                };
                return (
                  t.addEventListener("click", function (e) {
                    e.target === t && n();
                  }),
                  {
                    show: function (e) {
                      t && t.classList.add("basicLightbox--visible");
                    },
                    close: n,
                  }
                );
              }
            })("" + t.dataset.src).show();
        }
      }
      var t = document.querySelectorAll(".lightbox");
      if (t && 0 < t.length)
        for (var n = 0; n < t.length; n++) {
          t[n].onclick = e;
        }
    })();
    var s, r;
    n(16);
    (s = document.querySelector("#search-action")),
      (r = document.querySelector("#searchbox")),
      s &&
        r &&
        ((document.onclick = function (e) {
          if (!r.classList.contains("hidden")) {
            var t = e && e.target;
            i(t, r) || i(t, s) || r.classList.add("hidden");
          }
        }),
        (s.onclick = function (e) {
          e.preventDefault(), r.classList.contains("hidden") ? (r.classList.remove("hidden"), r.querySelector("input").focus()) : r.classList.add("hidden");
        })),
      (function () {
        var e = document.querySelector(".sidebarAction"),
          t = document.querySelector(".sidebar"),
          n = document.querySelector(".content_zone__container__content");
        e &&
          t &&
          n &&
          (e.onclick = function () {
            a(e, "expand"), a(t, "hidden"), a(n, "md:w-2/3");
          });
        var i,
          o,
          s =
            ((i = "fixed"),
            (o = "absolute"),
            {
              element: null,
              position: 0,
              headerHeight: 0,
              footerHeight: 0,
              sidebarHeight: 0,
              sidebarWidth: 0,
              addEvents: function () {
                window.addEventListener("scroll", this.onScroll.bind(this)), window.addEventListener("resize", this.onResize.bind(this));
              },
              check: function (e) {
                return !!(e && 768 < window.outerWidth && e.clientHeight < window.innerHeight) || (this.setStatic(), !1);
              },
              init: function (e) {
                (this.element = e),
                  this.check(e) &&
                    ((this.headerHeight = document.querySelector("header").clientHeight),
                    (this.footerHeight = document.querySelector("footer").clientHeight),
                    (this.sidebarWidth = e.clientWidth),
                    (this.sidebarHeight = e.clientHeight),
                    this.addEvents(),
                    (this.position = e.offsetTop),
                    this.onScroll());
              },
              aboveScroll: function () {
                return this.position < window.scrollY - this.headerHeight;
              },
              aboveFooter: function () {
                return window.innerHeight + window.scrollY < document.body.offsetHeight - this.footerHeight;
              },
              onResize: function () {
                this.check(this.element);
              },
              onScroll: function (e) {
                if (this.aboveScroll())
                  if (this.aboveFooter()) this.setFixedTop();
                  else {
                    var t = this.headerHeight + this.sidebarHeight;
                    window.innerHeight - t > this.footerHeight || this.setFixedBottom();
                  }
                else this.setStatic();
              },
              removeFixed: function () {
                this.element.classList.contains(i) && this.element.classList.remove(i);
              },
              removeAbsolute: function () {
                this.element.classList.contains(o) && this.element.classList.remove(o);
              },
              setFixedTop: function () {
                this.check(this.element) &&
                  (this.element.classList.add(i),
                  this.removeAbsolute(),
                  (this.element.style.position = "fixed"),
                  (this.element.style.top = this.headerHeight + 20 + "px"),
                  (this.element.style.bottom = "auto"),
                  (this.element.style.width = this.sidebarWidth + "px"));
              },
              setFixedBottom: function () {
                this.check(this.element) &&
                  (this.element.classList.add(o), this.removeFixed(), (this.element.style.position = "absolute"), (this.element.style.top = "auto"), (this.element.style.bottom = 0), (this.element.style.width = this.sidebarWidth + "px"));
              },
              setStatic: function () {
                this.removeAbsolute(), this.removeFixed(), (this.element.style.position = "static"), (this.element.style.top = "auto"), (this.element.style.bottom = "auto"), (this.element.style.width = "auto");
              },
            }),
          r = document.querySelector(".sidebar__content");
        s.init(r);
      })();
    n(17);
  },
]);
