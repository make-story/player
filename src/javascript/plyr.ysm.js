// ==========================================================================
// Plyr
// plyr.js v2.0.11
// https://github.com/selz/plyr
// License: The MIT License (MIT)
// ==========================================================================
// Credits: http://paypal.github.io/accessible-html5-video-player/
// ==========================================================================
//
// 이벤트, 메소드, 프로퍼티 등의 정보:
//https://developer.mozilla.org/en-US/docs/Web/API/HTMLMediaElement
//https://developer.mozilla.org/ko/docs/Web/HTML/Element/Video

// TEST


/*
- jQuery, api.dom 에 종속되도록 변경 (필요없는 유틸 함수 제거)
- 여러가지 오버레이 어떻게 대응할 것인지 고민

- html5 video 스팩 기본제공 함수
load();
play();
pause();


// video 속성값
crossOrigin="anonymous" 또는 crossOrigin="use-credentials"
autoplay
buffered
controls
loop
muted
played
preload
스펙에서는 기본값으로 metadata를 권장하지만 설정하지 않았다면 각 브라우저가 정한 기본값을 설정하게 됩니다.
비디오를 자동으로 재생하려 한다면 브라우저가 이를 다운로드 해야 하기 때문에 autoplay이 이 속성보다 우선시 됩니다.


// error state
  readonly attribute MediaError error;

// network state
           attribute DOMString src;
  readonly attribute DOMString currentSrc;
  const unsigned short NETWORK_EMPTY = 0;
  const unsigned short NETWORK_IDLE = 1;
  const unsigned short NETWORK_LOADING = 2;
  const unsigned short NETWORK_NO_SOURCE = 3;
  readonly attribute unsigned short networkState;
           attribute DOMString preload;
  readonly attribute TimeRanges buffered;
  void load();
  DOMString canPlayType(in DOMString type);

// ready state
  const unsigned short HAVE_NOTHING = 0;
  const unsigned short HAVE_METADATA = 1;
  const unsigned short HAVE_CURRENT_DATA = 2;
  const unsigned short HAVE_FUTURE_DATA = 3;
  const unsigned short HAVE_ENOUGH_DATA = 4;
  readonly attribute unsigned short readyState;
  readonly attribute boolean seeking;

// playback state
           attribute double currentTime;
  readonly attribute double initialTime;
  readonly attribute double duration;
  readonly attribute Date startOffsetTime;
  readonly attribute boolean paused;
           attribute double defaultPlaybackRate;
           attribute double playbackRate;
  readonly attribute TimeRanges played;
  readonly attribute TimeRanges seekable;
  readonly attribute boolean ended;
           attribute boolean autoplay;
           attribute boolean loop;

// controls
           attribute boolean controls;
           attribute double volume;
           attribute boolean muted;




// Determine if HTML5 textTracks is supported
plyr.media.textTracks

plyr.media.volume
plyr.media.muted
plyr.media.currentTime
plyr.media.buffered
plyr.media.paused
plyr.media.seeking
plyr.media.duration
plyr.media.currentSrc
plyr.media.ended



// plyr element 구조
plyr.container element -> plyr.videoContainer(wrapper) element -> plyr.media

// setup 함수를 최우선 실행됨
*/

;(function(root, factory) {
	'use strict';
	/*global define,module*/

	if (typeof module === 'object' && typeof module.exports === 'object') {
		// Node, CommonJS-like
		module.exports = factory(root, document);
	} else if (typeof define === 'function' && define.amd) {
		// AMD
		define([], function () { return factory(root, document); });
	} else {
		// Browser globals (root is window)
		root.plyr = factory(root, document);
	}
}(typeof window !== 'undefined' ? window : this, function(window, document) {
	'use strict';

	// 전역변수
	var fullscreen;
	var scroll = {  // 스크롤 위치 기억
		x: 0,
		y: 0
	};

	// 기본정보 - 사용자 옵션에 의해 덮어쓰기 가능
	var defaults = {
		enabled:                true, // Plyr 활성화/비활성화 여부
		debug:                  false, // Plyr이 수행하는 작업에 대한 디버깅 정보를 표시합니다.
		autoplay:               false, // 로드시 미디어 자동 재생
		loop:                   false, // loop="" 속성은 미디어가 종료되는 시점에 처음으로 돌아가게 합니다.
		seekTime:               10, // 빨리 감기 또는 되감기를 할 때 시간
		volume:                 10, // 초기 볼륨 (1~10)
		volumeMin:              0, // 불륨 최소 제한
		volumeMax:              10, // 볼륨 최대 제한
		volumeStep:             1, // 불륨 조절 간격
		duration:               null, // 사용자 지정 (지속)시간
		displayDuration:        true, // 현재 시간 표시의 "metadataloaded"이벤트 (시작시)에 미디어 지속 시간을 표시합니다. 이것은`preload` 속성이`none`으로 설정되지 않았거나, 전혀 설정되지 않았고, 지속 시간을 표시하지 않기로 선택한 경우에만 작동합니다

		loadSprite:             true,
		iconPrefix:             'plyr',
		iconUrl:                'https://cdn.plyr.io/2.0.11/plyr.svg',

		clickToPlay:            true, // 비디오 컨테이너를 클릭 (또는 탭)하면 일시 정지 / 재생이 전환됩니다.
		hideControls:           true, // 비디오 컨트롤을 자동으로 숨 깁니다.
		showPosterOnEnd:        false,
		disableContextMenu:     true, // 비디오의 오른쪽 클릭 메뉴를 비활성화 하여 컨텐츠의 다운로드를 방지하기위한 매우 원시적 인 난독 화를 돕습니다 .

		keyboardShorcuts:       { // 키보드 단축키
			focused:            true,
			global:             false
		},
		tooltips: {
			controls:           false, // 각 버튼의 설명 말풍선 (예: 재생버튼에 마우스를 올리면, play라는 말풍선을 보여줌)
			seek:               true
		},
		captions: {
			defaultActive:      false
		},
		fullscreen: {
			enabled:            true,
			fallback:           true,
			allowAudio:         false
		},
		storage: {
			enabled:            true,
			key:                'plyr'
		},
		/*
		-
		컨트롤 버튼 기능 사용/미사용 구분 배열
		play-large: 플레이어 중앙 재생버튼
		play: 컨트롤러 부분의 재생버튼
		progress: 컨트롤러 부분의 progress 바
		current-time: 컨트롤러 부분의 재생시간
		mute: 컨트롤러 부분의 음소거 토글 버튼
		volume: 컨트롤러 부분의 소리 조절바
		captions: 컨트롤러 부분의 자막 토글 버튼
		fullscreen: 컨트롤러 부분의 전체화면 토글 버튼
		*/
		//controls:               ['play-large', 'play', 'progress', 'current-time', 'mute', 'volume', 'captions', 'fullscreen'],
		controls:               ['play-large', 'restart', 'rewind', 'play', 'fast-forward', 'progress', 'current-time', 'duration', 'mute', 'volume', 'captions', 'fullscreen'],

		// Custom control listeners
		// 사용자 콜백
		listeners: {
			seek:               null,
			play:               null,
			pause:              null,
			restart:            null,
			rewind:             null,
			forward:            null,
			mute:               null,
			volume:             null,
			captions:           null,
			fullscreen:         null
		},

		selectors: {
			html5:              'video, audio', // target, 비디오/오디오기능을 적용할 것
			embed:              '[data-type]',
			editable:           'input, textarea, select, [contenteditable]',
			container:          '.plyr',
			controls: {
				container:      null,
				wrapper:        '.plyr__controls'
			},
			labels:             '[data-plyr]',
			buttons: {
				seek:           '[data-plyr="seek"]',
				play:           '[data-plyr="play"]',
				pause:          '[data-plyr="pause"]',
				restart:        '[data-plyr="restart"]',
				rewind:         '[data-plyr="rewind"]',
				forward:        '[data-plyr="fast-forward"]',
				mute:           '[data-plyr="mute"]',
				captions:       '[data-plyr="captions"]',
				fullscreen:     '[data-plyr="fullscreen"]'
			},
			volume: {
				input:          '[data-plyr="volume"]',
				display:        '.plyr__volume--display'
			},
			progress: {
				container:      '.plyr__progress',
				buffer:         '.plyr__progress--buffer',
				played:         '.plyr__progress--played'
			},
			captions:           '.plyr__captions',
			currentTime:        '.plyr__time--current',
			duration:           '.plyr__time--duration'
		},

		classes: {
			setup:              'plyr--setup',
			ready:              'plyr--ready',
			videoWrapper:       'plyr__video-wrapper',
			embedWrapper:       'plyr__video-embed',
			type:               'plyr--{0}',
			stopped:            'plyr--stopped',
			playing:            'plyr--playing',
			muted:              'plyr--muted',
			loading:            'plyr--loading',
			hover:              'plyr--hover',
			tooltip:            'plyr__tooltip',
			hidden:             'plyr__sr-only',
			hideControls:       'plyr--hide-controls',
			isIos:              'plyr--is-ios',
			isTouch:            'plyr--is-touch',
			captions: {
				enabled:        'plyr--captions-enabled',
				active:         'plyr--captions-active'
			},
			fullscreen: {
				enabled:        'plyr--fullscreen-enabled',
				active:         'plyr--fullscreen-active'
			},
			tabFocus:           'tab-focus'
		},

		i18n: {
			restart:            'Restart',
			rewind:             'Rewind {seektime} secs',
			play:               'Play',
			pause:              'Pause',
			forward:            'Forward {seektime} secs',
			played:             'played',
			buffered:           'buffered',
			currentTime:        'Current time',
			duration:           'Duration',
			volume:             'Volume',
			toggleMute:         'Toggle Mute',
			toggleCaptions:     'Toggle Captions',
			toggleFullscreen:   'Toggle Fullscreen',
			frameTitle:         'Player for {title}'
		},
		types: {
			embed:              ['youtube', 'vimeo', 'soundcloud'],
			html5:              ['video', 'audio']
		},
		// URLs
		urls: {
			vimeo: {
				api:            'https://player.vimeo.com/api/player.js',
			},
			youtube: {
				api:            'https://www.youtube.com/iframe_api'
			},
			soundcloud: {
				api:            'https://w.soundcloud.com/player/api.js'
			}
		},
		// 미디어 이벤트 (플레이어에 사용되는 이벤트 리스트)
		// Events to watch on HTML5 media elements
		events:                 ['ready', 'ended', 'progress', 'stalled', 'playing', 'waiting', 'canplay', 'canplaythrough', 'loadstart', 'loadeddata', 'loadedmetadata', 'timeupdate', 'volumechange', 'play', 'pause', 'error', 'seeking', 'seeked', 'emptied'],
		// Logging
		logPrefix:              '[Plyr]'
	};









	// 유틸부분 시작 ---------- ---------- ---------- ---------- ---------- ---------- ---------- ---------- ----------

	// Check variable types
	var _is = {
		object: function(input) {
			return input !== null && typeof(input) === 'object';
		},
		array: function(input) {
			return input !== null && (typeof(input) === 'object' && input.constructor === Array);
		},
		number: function(input) {
			return input !== null && (typeof(input) === 'number' && !isNaN(input - 0) || (typeof input === 'object' && input.constructor === Number));
		},
		string: function(input) {
			return input !== null && (typeof input === 'string' || (typeof input === 'object' && input.constructor === String));
		},
		boolean: function(input) {
			return input !== null && typeof input === 'boolean';
		},
		nodeList: function(input) {
			return input !== null && input instanceof NodeList;
		},
		htmlElement: function(input) {
			return input !== null && input instanceof HTMLElement;
		},
		function: function(input) {
			return input !== null && typeof input === 'function';
		},
		undefined: function(input) {
			return input !== null && typeof input === 'undefined';
		}
	};

	// Local storage
	var _storage = {
		// 로컬 스토리지 지원여부
		supported: (function() {
			if (!('localStorage' in window)) {
				return false;
			}

			// Try to use it (it might be disabled, e.g. user is in private/porn mode)
			// see: https://github.com/Selz/plyr/issues/131
			try {
				// Add test item
				window.localStorage.setItem('___test', 'OK');

				// Get the test item
				var result = window.localStorage.getItem('___test');

				// Clean up
				window.localStorage.removeItem('___test');

				// Check if value matches
				return (result === 'OK');
			}catch (e) {
				return false;
			}

			return false;
		})()
	};

	// 브라우저 정보 반환
	// Credits: http://paypal.github.io/accessible-html5-video-player/
	function _browserSniff() {
		var ua = navigator.userAgent,
			name = navigator.appName,
			fullVersion = '' + parseFloat(navigator.appVersion),
			majorVersion = parseInt(navigator.appVersion, 10),
			nameOffset,
			verOffset,
			ix,
			isIE = false,
			isFirefox = false,
			isChrome = false,
			isSafari = false;

		if ((navigator.appVersion.indexOf('Windows NT') !== -1) && (navigator.appVersion.indexOf('rv:11') !== -1)) {
			// MSIE 11
			isIE = true;
			name = 'IE';
			fullVersion = '11';
		} else if ((verOffset = ua.indexOf('MSIE')) !== -1) {
			// MSIE
			isIE = true;
			name = 'IE';
			fullVersion = ua.substring(verOffset + 5);
		} else if ((verOffset = ua.indexOf('Chrome')) !== -1) {
			// Chrome
			isChrome = true;
			name = 'Chrome';
			fullVersion = ua.substring(verOffset + 7);
		} else if ((verOffset = ua.indexOf('Safari')) !== -1) {
			// Safari
			isSafari = true;
			name = 'Safari';
			fullVersion = ua.substring(verOffset + 7);
			if ((verOffset = ua.indexOf('Version')) !== -1) {
				fullVersion = ua.substring(verOffset + 8);
			}
		} else if ((verOffset = ua.indexOf('Firefox')) !== -1) {
			// Firefox
			isFirefox = true;
			name = 'Firefox';
			fullVersion = ua.substring(verOffset + 8);
		} else if ((nameOffset = ua.lastIndexOf(' ') + 1) < (verOffset = ua.lastIndexOf('/'))) {
			// In most other browsers, 'name/version' is at the end of userAgent
			name = ua.substring(nameOffset,verOffset);
			fullVersion = ua.substring(verOffset + 1);

			if (name.toLowerCase() === name.toUpperCase()) {
				name = navigator.appName;
			}
		}

		// Trim the fullVersion string at semicolon/space if present
		if ((ix = fullVersion.indexOf(';')) !== -1) {
			fullVersion = fullVersion.substring(0, ix);
		}
		if ((ix = fullVersion.indexOf(' ')) !== -1) {
			fullVersion = fullVersion.substring(0, ix);
		}

		// Get major version
		majorVersion = parseInt('' + fullVersion, 10);
		if (isNaN(majorVersion)) {
			fullVersion = '' + parseFloat(navigator.appVersion);
			majorVersion = parseInt(navigator.appVersion, 10);
		}

		// Return data
		return {
			name:       name,
			version:    majorVersion,
			isIE:       isIE,
			isFirefox:  isFirefox,
			isChrome:   isChrome,
			isSafari:   isSafari,
			isIos:      /(iPad|iPhone|iPod)/g.test(navigator.platform),
			isIphone:   /(iPhone|iPod)/g.test(navigator.userAgent),
			isTouch:    'ontouchstart' in document.documentElement
		};
	}

	// 현재 플레이 미디어 mimeType 지원 여부 확인
	// Check for mime type support against a player instance
	// Credits: http://diveintohtml5.info/everything.html
	// Related: http://www.leanbackplyr.com/test/h5mt.html
	function _supportMime(plyr, mimeType) {
		var media = plyr.media;

		if (plyr.type === 'video') {
			// Check type
			switch (mimeType) {
				case 'video/webm':   return !!(media.canPlayType && media.canPlayType('video/webm; codecs="vp8, vorbis"').replace(/no/, ''));
				case 'video/mp4':    return !!(media.canPlayType && media.canPlayType('video/mp4; codecs="avc1.42E01E, mp4a.40.2"').replace(/no/, ''));
				case 'video/ogg':    return !!(media.canPlayType && media.canPlayType('video/ogg; codecs="theora"').replace(/no/, ''));
			}
		} else if (plyr.type === 'audio') {
			// Check type
			switch (mimeType) {
				case 'audio/mpeg':   return !!(media.canPlayType && media.canPlayType('audio/mpeg;').replace(/no/, ''));
				case 'audio/ogg':    return !!(media.canPlayType && media.canPlayType('audio/ogg; codecs="vorbis"').replace(/no/, ''));
				case 'audio/wav':    return !!(media.canPlayType && media.canPlayType('audio/wav; codecs="1"').replace(/no/, ''));
			}
		}

		// If we got this far, we're stuffed
		return false;
	}


	// 외부 스크립트 삽입
	// Inject a script
	function _injectScript(source) {
		if (document.querySelectorAll('script[src="' + source + '"]').length) {
			return;
		}

		var tag = document.createElement('script');
		tag.src = source;
		var firstScriptTag = document.getElementsByTagName('script')[0];
		firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
		console.log('[ysm] tag', tag);
	}

	// 배열에 요소가 존재하는지 여부
	// Element exists in an array
	function _inArray(haystack, needle) {
		return Array.prototype.indexOf && (haystack.indexOf(needle) !== -1);
	}

	// 변환
	// Replace all
	function _replaceAll(string, find, replace) {
		return string.replace(new RegExp(find.replace(/([.*+?\^=!:${}()|\[\]\/\\])/g, '\\$1'), 'g'), replace);
	}

	// elements 요소들을 wrapper 요소로 감싼다.
	// Wrap an element
	function _wrap(elements, wrapper) {
		// 요소를 배열로 변환
		// Convert `elements` to an array, if necessary.
		if (!elements.length) {
			elements = [elements];
		}

		// 반복분은 1번만 돌고 return
		// Loops backwards to prevent having to clone the wrapper on the
		// first element (see `child` below).
		for (var i = elements.length - 1; i >= 0; i--) {
			var child   = (i > 0) ? wrapper.cloneNode(true) : wrapper;
			var element = elements[i];

			// 현재 부모와 형제를 캐시
			// Cache the current parent and sibling.
			var parent  = element.parentNode;
			var sibling = element.nextSibling;

			// Wrap the element (is automatically removed from its current
			// parent).
			child.appendChild(element);

			// If the element had a sibling, insert the wrapper before
			// the sibling to maintain the HTML structure; otherwise, just
			// append it to the parent.
			if (sibling) {
				parent.insertBefore(child, sibling);
			} else {
				parent.appendChild(child);
			}

			return child;
		}
	}

	// Unwrap an element
	// http://plainjs.com/javascript/manipulation/unwrap-a-dom-element-35/
	/*function _unwrap(wrapper) {
		// Get the element's parent node
		var parent = wrapper.parentNode;

		// Move all children out of the element
		while (wrapper.firstChild) {
			parent.insertBefore(wrapper.firstChild, wrapper);
		}

		// Remove the empty element
		parent.removeChild(wrapper);
	}*/

	// 해당 요소 제거
	// Remove an element
	function _remove(element) {
		if (!element) {
			return;
		}
		element.parentNode.removeChild(element);
	}

	// 요소 삽입
	// Prepend child
	function _prependChild(parent, element) {
		parent.insertBefore(element, parent.firstChild);
	}

	// 요소 속성값 설정
	// Set attributes
	function _setAttributes(element, attributes) {
		for (var key in attributes) {
			element.setAttribute(key, (_is.boolean(attributes[key]) && attributes[key]) ? '' : attributes[key]);
		}
	}

	// Insert a HTML element
	function _insertElement(type, parent, attributes) {
		// Create a new <element>
		var element = document.createElement(type);
		console.log('[ysm] _insertElement element', element);

		// Set all passed attributes
		_setAttributes(element, attributes);

		// Inject the new element
		_prependChild(parent, element);
	}

	// Get a classname from selector
	function _getClassname(selector) {
		return selector.replace('.', '');
	}

	// Toggle class on an element
	function _toggleClass(element, className, state) {
		if (element) {
			if (element.classList) { // classList 지원여부에 따른 분기처리
				element.classList[state ? 'add' : 'remove'](className);
			} else {
				var name = (' ' + element.className + ' ').replace(/\s+/g, ' ').replace(' ' + className + ' ', '');
				element.className = name + (state ? ' ' + className : '');
			}
		}
	}

	// Has class name
	function _hasClass(element, className) {
		if (element) {
			if (element.classList) {
				return element.classList.contains(className);
			} else {
				return new RegExp('(\\s|^)' + className + '(\\s|$)').test(element.className);
			}
		}
		return false;
	}

	// Element matches selector
	function _matches(element, selector) {
		var p = Element.prototype;

		var f = p.matches || p.webkitMatchesSelector || p.mozMatchesSelector || p.msMatchesSelector || function(s) {
			return [].indexOf.call(document.querySelectorAll(s), this) !== -1;
		};

		return f.call(element, selector);
	}

	// Bind along with custom handler
	function _proxyListener(element, eventName, userListener, defaultListener, useCapture) {
		_on(element, eventName, function(event) { // _on(element, events, callback, useCapture)
			// 사용자 리스너 콜백
			if (userListener) {
				userListener.apply(element, [event]);
			}
			// 기본 리스터 콜백
			defaultListener.apply(element, [event]);
		}, useCapture);
	}

	// element 에 이벤트를 설정 / 해제 (toggle) - 사용자이벤트(CustomEvent) 포함
	// Toggle event listener
	function _toggleListener(element, events, callback, toggle, useCapture) {
		var eventList = events.split(' ');

		// Whether the listener is a capturing listener or not
		// Default to false
		if (!_is.boolean(useCapture)) {
			useCapture = false;
		}

		// If a nodelist is passed, call itself on each node
		if (element instanceof NodeList) {
			for (var x = 0; x < element.length; x++) {
				if (element[x] instanceof Node) {
					_toggleListener(element[x], arguments[1], arguments[2], arguments[3]);
				}
			}
			return;
		}

		// If a single node is passed, bind the event listener
		for (var i = 0; i < eventList.length; i++) {
			element[toggle ? 'addEventListener' : 'removeEventListener'](eventList[i], callback, useCapture);
		}
	}

	// Bind event
	function _on(element, events, callback, useCapture) {
		if (element) {
			_toggleListener(element, events, callback, true, useCapture);
		}
	}

	// Unbind event
	/*function _off(element, events, callback, useCapture) {
		if (element) {
			_toggleListener(element, events, callback, false, useCapture);
		}
	}*/

	// Trigger event
	// 이벤트 실행!
	function _event(element, type, bubbles, properties) {
		// Bail if no element
		if (!element || !type) {
			return;
		}

		// Default bubbles to false
		if (!_is.boolean(bubbles)) {
			bubbles = false;
		}

		// Create and dispatch the event
		// 브라우저 기본 제공 CustomEvent
		// https://developer.mozilla.org/en-US/docs/Web/API/CustomEvent/CustomEvent
		var event = new CustomEvent(type, {
			bubbles:    bubbles,
			detail:     properties
		});

		// Dispatch the event
		element.dispatchEvent(event);
	}

	// aria-pressed 속성값 toggle
	// Toggle aria-pressed state on a toggle button
	// http://www.ssbbartgroup.com/blog/how-not-to-misuse-aria-states-properties-and-roles
	function _toggleState(target, state) {
		// Bail if no target
		if (!target) {
			return;
		}

		// Get state
		state = (_is.boolean(state) ? state : !target.getAttribute('aria-pressed'));

		// Set the attribute on target
		target.setAttribute('aria-pressed', state);

		return state;
	}

	// 백분율 (퍼센트) 계산값 반환
	// Get percentage
	function _getPercentage(current, max) {
		if (current === 0 || max === 0 || isNaN(current) || isNaN(max)) {
			return 0;
		}
		return ((current / max) * 100).toFixed(2);
	}

	// Deep extend/merge destination object with N more objects
	// http://andrewdupont.net/2009/08/28/deep-extending-objects-in-javascript/
	// Removed call to arguments.callee (used explicit function name instead)
	function _extend() {
		// Get arguments
		var objects = arguments; // 파라미터 리스트

		// Bail if nothing to merge
		if (!objects.length) {
			return;
		}

		// Return first if specified but nothing to merge
		if (objects.length === 1) {
			return objects[0];
		}

		// First object is the destination
		var destination = Array.prototype.shift.call(objects),
			length      = objects.length;

		// Loop through all objects to merge
		for (var i = 0; i < length; i++) {
			var source = objects[i];

			for (var property in source) {
				if (source[property] && source[property].constructor && source[property].constructor === Object) {
					destination[property] = destination[property] || {};
					_extend(destination[property], source[property]);
				} else {
					destination[property] = source[property];
				}
			}
		}

		return destination;
	}

	// Fullscreen API
	function _fullscreen() {
		// 1. 인터페이스
		var fullscreen = {
				supportsFullScreen: false,
				isFullScreen: function() { return false; },
				requestFullScreen: function() {},
				cancelFullScreen: function() {},
				fullScreenEventName: '',
				element: null,
				prefix: ''
			},
			browserPrefixes = 'webkit o moz ms khtml'.split(' ');

		// 2. 브라우저가 풀스크린 지원하는지 여부
		// Check for native support
		if (!_is.undefined(document.cancelFullScreen)) {
			fullscreen.supportsFullScreen = true;
		} else {
			// Check for fullscreen support by vendor prefix
			for (var i = 0, il = browserPrefixes.length; i < il; i++ ) {
				fullscreen.prefix = browserPrefixes[i];

				if (!_is.undefined(document[fullscreen.prefix + 'CancelFullScreen'])) {
					fullscreen.supportsFullScreen = true;
					break;
				} else if (!_is.undefined(document.msExitFullscreen) && document.msFullscreenEnabled) {
					// Special case for MS (when isn't it?)
					fullscreen.prefix = 'ms';
					fullscreen.supportsFullScreen = true;
					break;
				}
			}
		}

		// 3. 인터페이스에 값 설정
		// Update methods to do something useful
		if (fullscreen.supportsFullScreen) {
			// Yet again Microsoft awesomeness,
			// Sometimes the prefix is 'ms', sometimes 'MS' to keep you on your toes
			fullscreen.fullScreenEventName = (fullscreen.prefix === 'ms' ? 'MSFullscreenChange' : fullscreen.prefix + 'fullscreenchange');

			fullscreen.isFullScreen = function(element) {
				if (_is.undefined(element)) {
					element = document.body;
				}
				switch (this.prefix) {
					case '':
						return document.fullscreenElement === element;
					case 'moz':
						return document.mozFullScreenElement === element;
					default:
						return document[this.prefix + 'FullscreenElement'] === element;
				}
			};
			fullscreen.requestFullScreen = function(element) {
				if (_is.undefined(element)) {
					element = document.body;
				}
				return (this.prefix === '') ? element.requestFullScreen() : element[this.prefix + (this.prefix === 'ms' ? 'RequestFullscreen' : 'RequestFullScreen')]();
			};
			fullscreen.cancelFullScreen = function() {
				return (this.prefix === '') ? document.cancelFullScreen() : document[this.prefix + (this.prefix === 'ms' ? 'ExitFullscreen' : 'CancelFullScreen')]();
			};
			fullscreen.element = function() {
				return (this.prefix === '') ? document.fullscreenElement : document[this.prefix + 'FullscreenElement'];
			};
		}

		return fullscreen;
	}

	// Parse YouTube ID from url
	function _parseYouTubeId(url) {
		var regex = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
		return (url.match(regex)) ? RegExp.$2 : url;
	}

	// Parse Vimeo ID from url
	function _parseVimeoId(url) {
		var regex = /^.*(vimeo.com\/|video\/)(\d+).*/;
		return (url.match(regex)) ? RegExp.$2 : url;
	}

	// 유틸부분 끝 ---------- ---------- ---------- ---------- ---------- ---------- ---------- ---------- ----------



































	// ---------- ---------- ---------- ---------- ---------- ---------- ---------- ---------- ----------




	/*
	Plyr 함수, setup 함수가 핵심!!!!!!!!!!!!!!!!
	*/



	// Player instance
	// media: 비디오 타겟 element (<video>, <audio>)
	// config: _extend({}, defaults, options, data);
	function Plyr(media, config) {
		var plyr = this;
		var timers = { // setInterval, setTimeout 등 time 고유값
			buffering: null,
			playing: null,
			hover: null,
			loading: null,
			cleanUp: null
		};
		var api;


		/*
		// plyr 객체 내부에 가지고 있는 key 구조

		plyr = {
			init
			media: 비디오 등을 실행(적용)할 element 값이다. (<video>, <audio>)
			type: audio, video, soundcloud 등
			browser: {
				isIE: false
				version: 브라우저 버전 (숫자)
				isIos: false
				isTouch: false
			}
			supported: {
				full: false // IE9 이하, Iphone, !!document.createElement('video').canPlayType  등으로 지원여뷰 판단
			}

			container: null // element (_init 함수에서 설정)

			controls: null // element (controls.pressed, controls.hover 사용자 임의 프로퍼티 추가)

			buttons: {
				// button
				seek: null // element
				play: null // element
				pause: null // element
				restart: null // element
				rewind: null // element
				forward: null // element
				fullscreen: null // element
				// input
				mute: null // element
				captions: null // element
			}
			progress: {
				container: null // element
				buffer: {
					bar: null // element
					text: null // element
				}
				played: null // element
				tooltip: null // element
			}
			volume: {
				input: null // element
				display: null // element
			}
			duration: null // element
			secs: 0
			mins: 0
			hours: 0
			currentTime: null // element
			seekTime: null // element

			videoContainer
			usingTextTracks
			captionExists
			currentCaption
			captionsEnabled
			captions
			subcount
			storage: {
				captionsEnabled
				volume
			}
			isFullscreen

			embed
			embedId
		}
		*/

		// ---------- ---------- ---------- ---------- ---------- ---------- ---------- ----------

		// media element 설정
		plyr.media = media; // media 는 비디오 등을 실행(적용)할 element 값이다. (<video>, <audio>)

		// ---------- ---------- ---------- ---------- ---------- ---------- ---------- ----------



		var original = media.cloneNode(true); // 비디오 element 복사


		// Debugging
		function _console(type, args) {
			if (config.debug && window.console) {
				args = Array.prototype.slice.call(args);

				if (_is.string(config.logPrefix) && config.logPrefix.length) {
					args.unshift(config.logPrefix);
				}

				console[type].apply(console, args);
			}
		}
		var _log = function() { _console('log', arguments) },
			_warn = function() { _console('warn', arguments) };

		// Log config options
		_log('Config', config);


		// 이벤트 트리거
		// Trigger events, with plyr instance passed
		function _triggerEvent(element, type, bubbles, properties) {
			_event(element, type, bubbles, _extend({}, properties, {
				plyr: api
			}));
		}

		// Get icon URL
		function _getIconUrl() {
			return {
				url:        config.iconUrl,
				absolute:   (config.iconUrl.indexOf("http") === 0) || plyr.browser.isIE
			};
		}

		// Save scroll position
		function _saveScrollPosition() {
			scroll = {
				x: window.pageXOffset || 0,
				y: window.pageYOffset || 0
			};
		}

		// Restore scroll position
		function _restoreScrollPosition() {
			window.scrollTo(scroll.x, scroll.y);
		}

		// 기본 HTML 생성
		// Build the default HTML
		function _buildControls() {
			// Create html array
			var html        = [],
				iconUrl     = _getIconUrl(),
				iconPath    = (!iconUrl.absolute ? iconUrl.url : '') + '#' + config.iconPrefix;

			// Larger overlaid play button
			if (_inArray(config.controls, 'play-large')) {
				html.push(
					'<button type="button" data-plyr="play" class="plyr__play-large">',
						'<svg><use xlink:href="' + iconPath + '-play" /></svg>',
						'<span class="plyr__sr-only">' + config.i18n.play + '</span>',
					'</button>'
				);
			}

			html.push('<div class="plyr__controls">');

			// Restart button
			if (_inArray(config.controls, 'restart')) {
				html.push(
					'<button type="button" data-plyr="restart">',
						'<svg><use xlink:href="' + iconPath + '-restart" /></svg>',
						'<span class="plyr__sr-only">' + config.i18n.restart + '</span>',
					'</button>'
				);
			}

			// Rewind button
			if (_inArray(config.controls, 'rewind')) {
				html.push(
					'<button type="button" data-plyr="rewind">',
						'<svg><use xlink:href="' + iconPath + '-rewind" /></svg>',
						'<span class="plyr__sr-only">' + config.i18n.rewind + '</span>',
					'</button>'
				);
			}

			// Play Pause button
			// TODO: This should be a toggle button really?
			if (_inArray(config.controls, 'play')) {
				html.push(
					'<button type="button" data-plyr="play">',
						'<svg><use xlink:href="' + iconPath + '-play" /></svg>',
						'<span class="plyr__sr-only">' + config.i18n.play + '</span>',
					'</button>',
					'<button type="button" data-plyr="pause">',
						'<svg><use xlink:href="' + iconPath + '-pause" /></svg>',
						'<span class="plyr__sr-only">' + config.i18n.pause + '</span>',
					'</button>'
				);
			}

			// Fast forward button
			if (_inArray(config.controls, 'fast-forward')) {
				html.push(
					'<button type="button" data-plyr="fast-forward">',
						'<svg><use xlink:href="' + iconPath + '-fast-forward" /></svg>',
						'<span class="plyr__sr-only">' + config.i18n.forward + '</span>',
					'</button>'
				);
			}

			// Progress
			if (_inArray(config.controls, 'progress')) {
				// Create progress
				html.push('<span class="plyr__progress">',
					'<label for="seek{id}" class="plyr__sr-only">Seek</label>',
					'<input id="seek{id}" class="plyr__progress--seek" type="range" min="0" max="100" step="0.1" value="0" data-plyr="seek">',
					'<progress class="plyr__progress--played" max="100" value="0" role="presentation"></progress>',
					'<progress class="plyr__progress--buffer" max="100" value="0">',
						'<span>0</span>% ' + config.i18n.buffered,
					'</progress>');

				// Seek tooltip
				if (config.tooltips.seek) {
					html.push('<span class="plyr__tooltip">00:00</span>');
				}

				// Close
				html.push('</span>');
			}

			// Media current time display
			if (_inArray(config.controls, 'current-time')) {
				html.push(
					'<span class="plyr__time">',
						'<span class="plyr__sr-only">' + config.i18n.currentTime + '</span>',
						'<span class="plyr__time--current">00:00</span>',
					'</span>'
				);
			}

			// Media duration display
			if (_inArray(config.controls, 'duration')) {
				html.push(
					'<span class="plyr__time">',
						'<span class="plyr__sr-only">' + config.i18n.duration + '</span>',
						'<span class="plyr__time--duration">00:00</span>',
					'</span>'
				);
			}

			// Toggle mute button
			if (_inArray(config.controls, 'mute')) {
				html.push(
					'<button type="button" data-plyr="mute">',
						'<svg class="icon--muted"><use xlink:href="' + iconPath + '-muted" /></svg>',
						'<svg><use xlink:href="' + iconPath + '-volume" /></svg>',
						'<span class="plyr__sr-only">' + config.i18n.toggleMute + '</span>',
					'</button>'
				);
			}

			// Volume range control
			if (_inArray(config.controls, 'volume')) {
				html.push(
					'<span class="plyr__volume">',
						'<label for="volume{id}" class="plyr__sr-only">' + config.i18n.volume + '</label>',
						'<input id="volume{id}" class="plyr__volume--input" type="range" min="' + config.volumeMin + '" max="' + config.volumeMax + '" value="' + config.volume + '" data-plyr="volume">',
						'<progress class="plyr__volume--display" max="' + config.volumeMax + '" value="' + config.volumeMin + '" role="presentation"></progress>',
					'</span>'
				);
			}

			// Toggle captions button
			if (_inArray(config.controls, 'captions')) {
				html.push(
					'<button type="button" data-plyr="captions">',
						'<svg class="icon--captions-on"><use xlink:href="' + iconPath + '-captions-on" /></svg>',
						'<svg><use xlink:href="' + iconPath+ '-captions-off" /></svg>',
						'<span class="plyr__sr-only">' + config.i18n.toggleCaptions + '</span>',
					'</button>'
				);
			}

			// Toggle fullscreen button
			if (_inArray(config.controls, 'fullscreen')) {
				html.push(
					'<button type="button" data-plyr="fullscreen">',
						'<svg class="icon--exit-fullscreen"><use xlink:href="' + iconPath + '-exit-fullscreen" /></svg>',
						'<svg><use xlink:href="' + iconPath + '-enter-fullscreen" /></svg>',
						'<span class="plyr__sr-only">' + config.i18n.toggleFullscreen + '</span>',
					'</button>'
				);
			}

			// Close everything
			html.push('</div>');

			return html.join('');
		}

		// Find all elements
		function _getElements(selector) {
			return plyr.container.querySelectorAll(selector);
		}

		// Find a single element
		function _getElement(selector) {
			return _getElements(selector)[0];
		}

		// iframe 내에 있는지 확인
		// Determine if we're in an iframe
		function _inFrame() {
			try {
				return window.self !== window.top;
			}
			catch (e) {
				return true;
			}
		}

		// Find the UI controls and store references
		function _findElements() {
			try {
				plyr.controls                 = _getElement(config.selectors.controls.wrapper);

				// Buttons
				plyr.buttons = {};
				plyr.buttons.seek             = _getElement(config.selectors.buttons.seek);
				plyr.buttons.play             = _getElements(config.selectors.buttons.play);
				plyr.buttons.pause            = _getElement(config.selectors.buttons.pause);
				plyr.buttons.restart          = _getElement(config.selectors.buttons.restart);
				plyr.buttons.rewind           = _getElement(config.selectors.buttons.rewind);
				plyr.buttons.forward          = _getElement(config.selectors.buttons.forward);
				plyr.buttons.fullscreen       = _getElement(config.selectors.buttons.fullscreen);

				// Inputs
				plyr.buttons.mute             = _getElement(config.selectors.buttons.mute);
				plyr.buttons.captions         = _getElement(config.selectors.buttons.captions);

				// Progress
				plyr.progress = {};
				plyr.progress.container       = _getElement(config.selectors.progress.container);

				// Progress - Buffering
				plyr.progress.buffer          = {};
				plyr.progress.buffer.bar      = _getElement(config.selectors.progress.buffer);
				plyr.progress.buffer.text     = plyr.progress.buffer.bar && plyr.progress.buffer.bar.getElementsByTagName('span')[0];

				// Progress - Played
				plyr.progress.played          = _getElement(config.selectors.progress.played);

				// Seek tooltip
				plyr.progress.tooltip         = plyr.progress.container && plyr.progress.container.querySelector('.' + config.classes.tooltip);

				// Volume
				plyr.volume                   = {};
				plyr.volume.input             = _getElement(config.selectors.volume.input);
				plyr.volume.display           = _getElement(config.selectors.volume.display);

				// Timing
				plyr.duration                 = _getElement(config.selectors.duration);
				plyr.currentTime              = _getElement(config.selectors.currentTime);
				plyr.seekTime                 = _getElements(config.selectors.seekTime);

				console.log('[ysm] findElements', plyr);

				return true;
			}
			catch(e) {
				_warn('It looks like there is a problem with your controls HTML');

				// Restore native video controls
				_toggleNativeControls(true);

				return false;
			}
		}









		// Setup media
		function _setupMedia() {
			// If there's no media, bail
			if (!plyr.media) {
				_warn('No media element found!');
				return;
			}

			if (plyr.supported.full) {
				// Add type class
				_toggleClass(plyr.container, config.classes.type.replace('{0}', plyr.type), true);

				// Add video class for embeds
				// This will require changes if audio embeds are added
				if (_inArray(config.types.embed, plyr.type)) {
					_toggleClass(plyr.container, config.classes.type.replace('{0}', 'video'), true);
				}

				// If there's no autoplay attribute, assume the video is stopped and add state class
				_toggleClass(plyr.container, config.classes.stopped, config.autoplay);

				// Add iOS class
				_toggleClass(plyr.ontainer, config.classes.isIos, plyr.browser.isIos);

				// Add touch class
				_toggleClass(plyr.container, config.classes.isTouch, plyr.browser.isTouch);

				// Inject the player wrapper
				if (plyr.type === 'video') {
					// Create the wrapper div
					var wrapper = document.createElement('div');
					wrapper.setAttribute('class', config.classes.videoWrapper);

					// Wrap the video in a container
					_wrap(plyr.media, wrapper);

					// Cache the container
					plyr.videoContainer = wrapper;

					console.log('[ysm] plyr.videoContainer wrapper', wrapper);
				}
			}

			// Embeds
			if (_inArray(config.types.embed, plyr.type)) {
				_setupEmbed();
			}
		}










		// Setup localStorage
		function _setupStorage() {
			var value = null;
			plyr.storage = {};

			// Bail if we don't have localStorage support or it's disabled
			if (!_storage.supported || !config.storage.enabled) {
				return;
			}

			// Clean up old volume
			// https://github.com/Selz/plyr/issues/171
			window.localStorage.removeItem('plyr-volume');

			// load value from the current key
			value = window.localStorage.getItem(config.storage.key);

			if (!value) {
				// Key wasn't set (or had been cleared), move along
				return;
			} else if (/^\d+(\.\d+)?$/.test(value)) {
				// If value is a number, it's probably volume from an older
				// version of plyr. See: https://github.com/Selz/plyr/pull/313
				// Update the key to be JSON
				_updateStorage({volume: parseFloat(value)});
			} else {
				// Assume it's JSON from this or a later version of plyr
				plyr.storage = JSON.parse(value);
			}
		}

		// Save a value back to local storage
		function _updateStorage(value) {
			// Bail if we don't have localStorage support or it's disabled
			if (!_storage.supported || !config.storage.enabled) {
				return;
			}

			// Update the working copy of the values
			_extend(plyr.storage, value);

			// Update storage
			window.localStorage.setItem(config.storage.key, JSON.stringify(plyr.storage));
		}










		// Setup fullscreen
		function _setupFullscreen() {
			if (!plyr.supported.full) {
				return;
			}

			if ((plyr.type !== 'audio' || config.fullscreen.allowAudio) && config.fullscreen.enabled) {
				// Check for native support
				var nativeSupport = fullscreen.supportsFullScreen;

				if (nativeSupport || (config.fullscreen.fallback && !_inFrame())) {
					_log((nativeSupport ? 'Native' : 'Fallback') + ' fullscreen enabled');

					// Add styling hook
					_toggleClass(plyr.container, config.classes.fullscreen.enabled, true);
				} else {
					_log('Fullscreen not supported and fallback disabled');
				}

				// Toggle state
				if (plyr.buttons && plyr.buttons.fullscreen) {
					_toggleState(plyr.buttons.fullscreen, false);
				}

				// Setup focus trap
				_focusTrap();
			}
		}

		// Toggle fullscreen
		function _toggleFullscreen(event) {
			// Check for native support
			var nativeSupport = fullscreen.supportsFullScreen;

			if (nativeSupport) {
				// If it's a fullscreen change event, update the UI
				if (event && event.type === fullscreen.fullScreenEventName) {
					plyr.isFullscreen = fullscreen.isFullScreen(plyr.container);
				} else {
					// Else it's a user request to enter or exit
					if (!fullscreen.isFullScreen(plyr.container)) {
						// Save scroll position
						_saveScrollPosition();

						// Request full screen
						fullscreen.requestFullScreen(plyr.container);
					} else {
						// Bail from fullscreen
						fullscreen.cancelFullScreen();
					}

					// Check if we're actually full screen (it could fail)
					plyr.isFullscreen = fullscreen.isFullScreen(plyr.container);

					return;
				}
			} else {
				// Otherwise, it's a simple toggle
				plyr.isFullscreen = !plyr.isFullscreen;

				// Bind/unbind escape key
				document.body.style.overflow = plyr.isFullscreen ? 'hidden' : '';
			}

			// Set class hook
			_toggleClass(plyr.container, config.classes.fullscreen.active, plyr.isFullscreen);

			// Trap focus
			_focusTrap(plyr.isFullscreen);

			// Set button state
			if (plyr.buttons && plyr.buttons.fullscreen) {
				_toggleState(plyr.buttons.fullscreen, plyr.isFullscreen);
			}

			// Trigger an event
			_triggerEvent(plyr.container, plyr.isFullscreen ? 'enterfullscreen' : 'exitfullscreen', true);

			// Restore scroll position
			if (!plyr.isFullscreen && nativeSupport) {
				_restoreScrollPosition();
			}
		}










		// 자막 파일 내부 예제
		// https://cdn.selz.com/plyr/1.5/View_From_A_Blue_Moon_Trailer-HD.en.vtt
		/*
		WEBVTT FILE

		1
		00:00:09.500 --> 00:00:12.000
		The ocean floor rises 5 miles to the shores

		2
		00:00:12.001 --> 00:00:16.500
		of what people call, the seven mile miracle

		3
		00:00:25.500 --> 00:00:28.000
		What would it be like to be born on this island?

		4
		00:00:32.500 --> 00:00:34.500
		To grow up on these shores

		5
		00:00:37.500 --> 00:00:40.000
		To witness this water, every day

		6
		00:00:43.500 --> 00:00:46.000
		You're about to meet someone, who did

		7
		00:02:45.500 --> 00:02:49.000
		This is a film about John John Florence
		*/


		// 자막포함 태그
		/*
		<video poster="https://cdn.selz.com/plyr/1.5/View_From_A_Blue_Moon_Trailer-HD.jpg?v1" controls crossorigin>
			<!-- Video files -->
			<source src="https://cdn.selz.com/plyr/1.5/View_From_A_Blue_Moon_Trailer-HD.mp4" type="video/mp4">
			<source src="https://cdn.selz.com/plyr/1.5/View_From_A_Blue_Moon_Trailer-HD.webm" type="video/webm">

			<!-- Text track file -->
			<track kind="captions" label="English" srclang="en" src="https://cdn.selz.com/plyr/1.5/View_From_A_Blue_Moon_Trailer-HD.en.vtt" default>

			<!-- Fallback for browsers that don't support the <video> element -->
			<a href="https://cdn.selz.com/plyr/1.5/View_From_A_Blue_Moon_Trailer-HD.mp4" download>Download</a>
		</video>
		*/

		// Setup captions
		function _setupCaptions() {
			// Bail if not HTML5 video
			if (plyr.type !== 'video') {
				return;
			}

			// Inject the container
			if (!_getElement(config.selectors.captions)) {
				plyr.videoContainer.insertAdjacentHTML('afterbegin', '<div class="' + _getClassname(config.selectors.captions) + '"></div>');
				console.log('[ysm] _setupCaptions plyr.videoContainer insertAdjacentHTML', plyr.videoContainer);
			}

			// Determine if HTML5 textTracks is supported
			plyr.usingTextTracks = false;
			if (plyr.media.textTracks) {
				plyr.usingTextTracks = true;
			}

			// Get URL of caption file if exists
			var captionSrc = '',
				kind,
				children = plyr.media.childNodes;

			for (var i = 0; i < children.length; i++) {
				if (children[i].nodeName.toLowerCase() === 'track') {
					kind = children[i].kind;
					if (kind === 'captions' || kind === 'subtitles') {
						captionSrc = children[i].getAttribute('src');
					}
				}
			}

			// Record if caption file exists or not
			plyr.captionExists = true;
			if (captionSrc === '') {
				plyr.captionExists = false;
				_log('No caption track found');
			} else {
				_log('Caption track found; URI: ' + captionSrc);
			}

			// If no caption file exists, hide container for caption text
			if (!plyr.captionExists) {
				_toggleClass(plyr.container, config.classes.captions.enabled);
			} else {
				// Turn off native caption rendering to avoid double captions
				// This doesn't seem to work in Safari 7+, so the <track> elements are removed from the dom below
				var tracks = plyr.media.textTracks;
				for (var x = 0; x < tracks.length; x++) {
					tracks[x].mode = 'hidden';
				}

				// Enable UI
				_showCaptions(plyr);

				// Disable unsupported browsers than report false positive
				// Firefox bug: https://bugzilla.mozilla.org/show_bug.cgi?id=1033144
				if ((plyr.browser.isIE && plyr.browser.version >= 10) ||
					(plyr.browser.isFirefox && plyr.browser.version >= 31)) {

					// Debugging
					_log('Detected browser with known TextTrack issues - using manual fallback');

					// Set to false so skips to 'manual' captioning
					plyr.usingTextTracks = false;
				}

				// Rendering caption tracks
				// Native support required - http://caniuse.com/webvtt
				if (plyr.usingTextTracks) {
					_log('TextTracks supported');

					for (var y = 0; y < tracks.length; y++) {
						var track = tracks[y];

						if (track.kind === 'captions' || track.kind === 'subtitles') {
							_on(track, 'cuechange', function() { // _on(element, events, callback, useCapture)
								// Display a cue, if there is one
								if (this.activeCues[0] && 'text' in this.activeCues[0]) {
									_setCaption(this.activeCues[0].getCueAsHTML());
								} else {
									_setCaption();
								}
							});
						}
					}
				} else {
					// Caption tracks not natively supported
					_log('TextTracks not supported so rendering captions manually');

					// Render captions from array at appropriate time
					plyr.currentCaption = '';
					plyr.captions = [];

					if (captionSrc !== '') {
						// Create XMLHttpRequest Object
						var xhr = new XMLHttpRequest();

						xhr.onreadystatechange = function() {
							if (xhr.readyState === 4) {
								if (xhr.status === 200) {
									var captions = [],
										caption,
										req = xhr.responseText;

									//According to webvtt spec, line terminator consists of one of the following
									// CRLF (U+000D U+000A), LF (U+000A) or CR (U+000D)
									var lineSeparator = '\r\n';
									if(req.indexOf(lineSeparator+lineSeparator) === -1) {
										if(req.indexOf('\r\r') !== -1){
											lineSeparator = '\r';
										} else {
											lineSeparator = '\n';
										}
									}

									captions = req.split(lineSeparator+lineSeparator);

									for (var r = 0; r < captions.length; r++) {
										caption = captions[r];
										plyr.captions[r] = [];

										// Get the parts of the captions
										var parts = caption.split(lineSeparator),
											index = 0;

										// Incase caption numbers are added
										if (parts[index].indexOf(":") === -1) {
											index = 1;
										}

										plyr.captions[r] = [parts[index], parts[index + 1]];
									}

									// Remove first element ('VTT')
									plyr.captions.shift();

									_log('Successfully loaded the caption file via AJAX');
								} else {
									_warn(config.logPrefix + 'There was a problem loading the caption file via AJAX');
								}
							}
						};

						xhr.open('get', captionSrc, true);

						xhr.send();
					}
				}
			}
		}

		// Set the current caption
		function _setCaption(caption) {
			/* jshint unused:false */
			var container = _getElement(config.selectors.captions),
				content = document.createElement('span');

			console.log('[ysm] _setCaption content', content);

			// Empty the container
			container.innerHTML = '';

			// Default to empty
			if (_is.undefined(caption)) {
				caption = '';
			}

			// Set the span content
			if (_is.string(caption)) {
				content.innerHTML = caption.trim();
			} else {
				content.appendChild(caption);
			}

			// Set new caption text
			container.appendChild(content);

			// Force redraw (for Safari)
			var redraw = container.offsetHeight;
		}

		// 수동 캡션 시간
		// Captions functions
		// Seek the manual caption time and update UI
		function _seekManualCaptions(time) {
			// Utilities for caption time codes
			function _timecodeCommon(tc, pos) {
				var tcpair = [];
				tcpair = tc.split(' --> ');
				for(var i = 0; i < tcpair.length; i++) {
					// WebVTT allows for extra meta data after the timestamp line
					// So get rid of this if it exists
					tcpair[i] = tcpair[i].replace(/(\d+:\d+:\d+\.\d+).*/, "$1");
				}
				return _subTcSecs(tcpair[pos]);
			}
			function _timecodeMin(tc) {
				return _timecodeCommon(tc, 0);
			}
			function _timecodeMax(tc) {
				return _timecodeCommon(tc, 1);
			}
			function _subTcSecs(tc) {
				if (tc === null || tc === undefined) {
					return 0;
				} else {
					var tc1 = [],
						tc2 = [],
						seconds;
					tc1 = tc.split(',');
					tc2 = tc1[0].split(':');
					seconds = Math.floor(tc2[0]*60*60) + Math.floor(tc2[1]*60) + Math.floor(tc2[2]);
					return seconds;
				}
			}

			// If it's not video, or we're using textTracks, bail.
			if (plyr.usingTextTracks || plyr.type !== 'video' || !plyr.supported.full) {
				return;
			}

			// Reset subcount
			plyr.subcount = 0;

			// Check time is a number, if not use currentTime
			// IE has a bug where currentTime doesn't go to 0
			// https://twitter.com/Sam_Potts/status/573715746506731521
			time = _is.number(time) ? time : plyr.media.currentTime;

			// If there's no subs available, bail
			if (!plyr.captions[plyr.subcount]) {
				return;
			}

			while (_timecodeMax(plyr.captions[plyr.subcount][0]) < time.toFixed(1)) {
				plyr.subcount++;
				if (plyr.subcount > plyr.captions.length - 1) {
					plyr.subcount = plyr.captions.length - 1;
					break;
				}
			}

			// Check if the next caption is in the current time range
			if (plyr.media.currentTime.toFixed(1) >= _timecodeMin(plyr.captions[plyr.subcount][0]) &&
				plyr.media.currentTime.toFixed(1) <= _timecodeMax(plyr.captions[plyr.subcount][0])) {
					plyr.currentCaption = plyr.captions[plyr.subcount][1];

				// Render the caption
				_setCaption(plyr.currentCaption);
			} else {
				_setCaption();
			}
		}

		// Display captions container and button (for initialization)
		function _showCaptions() {
			// If there's no caption toggle, bail
			if (!plyr.buttons.captions) {
				return;
			}

			_toggleClass(plyr.container, config.classes.captions.enabled, true);

			// Try to load the value from storage
			var active = plyr.storage.captionsEnabled;

			// Otherwise fall back to the default config
			if (!_is.boolean(active)) {
				active = config.captions.defaultActive;
			}

			if (active) {
				_toggleClass(plyr.container, config.classes.captions.active, true);
				_toggleState(plyr.buttons.captions, true);
			}
		}



























		// Set volume
		function _setVolume(volume) {
			var max = config.volumeMax,
				min = config.volumeMin;

			// Load volume from storage if no value specified
			if (_is.undefined(volume)) {
				volume = plyr.storage.volume;
			}

			// Use config if all else fails
			if (volume === null || isNaN(volume)) {
				volume = config.volume;
			}

			// Maximum is volumeMax
			if (volume > max) {
				volume = max;
			}
			// Minimum is volumeMin
			if (volume < min) {
				volume = min;
			}

			// Set the player volume
			plyr.media.volume = parseFloat(volume / max);

			// Set the display
			if (plyr.volume.display) {
				plyr.volume.display.value = volume;
			}

			// Embeds
			if (_inArray(config.types.embed, plyr.type)) {
				switch(plyr.type) {
					case 'youtube':
						plyr.embed.setVolume(plyr.media.volume * 100);
						break;

					case 'vimeo':
					case 'soundcloud':
						plyr.embed.setVolume(plyr.media.volume);
						break;
				}

				// Trigger volumechange for embeds
				_triggerEvent(plyr.media, 'volumechange');
			}

			// Toggle muted state
			if (volume === 0) {
				plyr.media.muted = true;
			} else if (plyr.media.muted && volume > 0) {
				_toggleMute();
			}
		}

		// 불륨 높이기
		// Increase volume
		function _increaseVolume(step) {
			var volume = plyr.media.muted ? 0 : (plyr.media.volume * config.volumeMax);

			if (!_is.number(step)) {
				step = config.volumeStep;
			}

			_setVolume(volume + step);
		}

		// 볼륨 감소
		// Decrease volume
		function _decreaseVolume(step) {
			var volume = plyr.media.muted ? 0 : (plyr.media.volume * config.volumeMax);

			if (!_is.number(step)) {
				step = config.volumeStep;
			}

			_setVolume(volume - step);
		}

		// 볼륨값 수정
		// Update volume UI and storage
		function _updateVolume() {
			// Get the current volume
			var volume = plyr.media.muted ? 0 : (plyr.media.volume * config.volumeMax);

			// Update the <input type="range"> if present
			if (plyr.supported.full) {
				if (plyr.volume.input) {
					plyr.volume.input.value = volume;
				}
				if (plyr.volume.display) {
					plyr.volume.display.value = volume;
				}
			}

			// Update the volume in storage
			_updateStorage({volume: volume});

			// Toggle class if muted
			_toggleClass(plyr.container, config.classes.muted, (volume === 0));

			// Update checkbox for mute state
			if (plyr.supported.full && plyr.buttons.mute) {
				_toggleState(plyr.buttons.mute, (volume === 0));
			}
		}










		// progress 값 설정
		// Set <progress> value
		function _setProgress(progress, value) {
			if (!plyr.supported.full) {
				return;
			}

			// Default to 0
			if (_is.undefined(value)) {
				value = 0;
			}
			// Default to buffer or bail
			if (_is.undefined(progress)) {
				if (plyr.progress && plyr.progress.buffer) {
					progress = plyr.progress.buffer;
				} else {
					return;
				}
			}

			// One progress element passed
			if (_is.htmlElement(progress)) {
				progress.value = value;
			} else if (progress) {
				// Object of progress + text element
				if (progress.bar) {
					progress.bar.value = value;
				}
				if (progress.text) {
					progress.text.innerHTML = value;
				}
			}
		}

		// progress 정보 최신화
		// Update <progress> elements
		function _updateProgress(event) {
			if (!plyr.supported.full) {
				return;
			}

			var progress    = plyr.progress.played,
				value       = 0,
				duration    = _getDuration();

			if (event) {
				switch (event.type) {
					// Video playing
					case 'timeupdate':
					case 'seeking':
						if (plyr.controls.pressed) {
							return;
						}

						value = _getPercentage(plyr.media.currentTime, duration);

						// Set seek range value only if it's a 'natural' time event
						if (event.type === 'timeupdate' && plyr.buttons.seek) {
							plyr.buttons.seek.value = value;
						}

						break;

					// Check buffer status
					case 'playing':
					case 'progress':
						progress    = plyr.progress.buffer;
						value       = (function() {
							var buffered = plyr.media.buffered;

							if (buffered && buffered.length) {
								// HTML5
								return _getPercentage(buffered.end(0), duration);
							} else if (_is.number(buffered)) {
								// YouTube returns between 0 and 1
								return (buffered * 100);
							}

							return 0;
						})();

						break;
				}
			}

			// Set values
			_setProgress(progress, value);
		}












		// Setup aria attribute for play and iframe title
		function _setTitle(iframe) {
			// Find the current text
			var label = config.i18n.play;

			// If there's a media title set, use that for the label
			if (_is.string(config.title) && config.title.length) {
				label += ', ' + config.title;

				// Set container label
				plyr.container.setAttribute('aria-label', config.title);
			}

			// If there's a play button, set label
			if (plyr.supported.full && plyr.buttons.play) {
				for (var i = plyr.buttons.play.length - 1; i >= 0; i--) {
					plyr.buttons.play[i].setAttribute('aria-label', label);
				}
			}

			// Set iframe title
			// https://github.com/Selz/plyr/issues/124
			if (_is.htmlElement(iframe)) {
				iframe.setAttribute('title', config.i18n.frameTitle.replace('{title}', config.title));
			}
		}

		// Trap focus inside container
		function _focusTrap() {
			var tabbables   = _getElements('input:not([disabled]), button:not([disabled])'),
				first       = tabbables[0],
				last        = tabbables[tabbables.length - 1];

			function _checkFocus(event) {
				// If it is TAB
				if (event.which === 9 && plyr.isFullscreen) {
					if (event.target === last && !event.shiftKey) {
						// Move focus to first element that can be tabbed if Shift isn't used
						event.preventDefault();
						first.focus();
					} else if (event.target === first && event.shiftKey) {
						// Move focus to last element that can be tabbed if Shift is used
						event.preventDefault();
						last.focus();
					}
				}
			}

			// Bind the handler
			_on(plyr.container, 'keydown', _checkFocus); // _on(element, events, callback, useCapture)
		}

		// Add elements to HTML5 media (type: source, tracks, etc)
		function _insertChildElements(type, attributes) {
			if (_is.string(attributes)) {
				_insertElement(type, plyr.media, { src: attributes });
			} else if (attributes.constructor === Array) {
				for (var i = attributes.length - 1; i >= 0; i--) {
					_insertElement(type, plyr.media, attributes[i]);
				}
			}
		}

		// 컨트롤러 삽입
		// Insert controls
		function _injectControls() {
			// Sprite
			if (config.loadSprite) {
				var iconUrl = _getIconUrl();

				// Only load external sprite using AJAX
				if (iconUrl.absolute) {
					_log('AJAX loading absolute SVG sprite' + (plyr.browser.isIE ? ' (due to IE)' : ''));
					loadSprite(iconUrl.url, "sprite-plyr");
				} else {
					_log('Sprite will be used as external resource directly');
				}
			}

			// Make a copy of the html
			var html = config.html;

			// Insert custom video controls
			_log('Injecting custom controls');

			// If no controls are specified, create default
			if (!html) {
				html = _buildControls();
			}

			// Replace seek time instances
			html = _replaceAll(html, '{seektime}', config.seekTime);

			// Replace all id references with random numbers
			html = _replaceAll(html, '{id}', Math.floor(Math.random() * (10000)));

			// Controls container
			var target;

			// Inject to custom location
			if (_is.string(config.selectors.controls.container)) {
				target = document.querySelector(config.selectors.controls.container);
			}

			// Inject into the container by default
			if (!_is.htmlElement(target)) {
				target = plyr.container
			}

			// Inject controls HTML
			target.insertAdjacentHTML('beforeend', html);

			// Setup tooltips
			console.log('[ysm] config.tooltips.controls', config.tooltips.controls);
			if (config.tooltips.controls) {
				var labels = _getElements([config.selectors.controls.wrapper, ' ', config.selectors.labels, ' .', config.classes.hidden].join(''));
				console.log('[ysm] _getElements', [config.selectors.controls.wrapper, ' ', config.selectors.labels, ' .', config.classes.hidden].join(''));
				console.log('[ysm] labels', labels);

				for (var i = labels.length - 1; i >= 0; i--) {
					var label = labels[i];

					_toggleClass(label, config.classes.hidden, false);
					_toggleClass(label, config.classes.tooltip, true);
				}
			}
		}





		// ---------- ---------- ---------- ---------- ---------- ---------- ---------- ---------- ----------
		// YouTube/Vimeo



		// Setup YouTube/Vimeo
		function _setupEmbed() {
			/*
			var container = document.createElement('div'),
				mediaId,
				id = plyr.type + '-' + Math.floor(Math.random() * (10000));

			// Parse IDs from URLs if supplied
			switch (plyr.type) {
				case 'youtube':
					mediaId = _parseYouTubeId(plyr.embedId);
					break;

				case 'vimeo':
					mediaId = _parseVimeoId(plyr.embedId);
					break;

				default:
					mediaId = plyr.embedId;
			}

			// Remove old containers
			var containers = _getElements('[id^="' + plyr.type + '-"]');
			for (var i = containers.length - 1; i >= 0; i--) {
				_remove(containers[i]);
			}

			// Add embed class for responsive
			_toggleClass(plyr.media, config.classes.videoWrapper, true);
			_toggleClass(plyr.media, config.classes.embedWrapper, true);

			if (plyr.type === 'youtube') {
				// Create the YouTube container
				plyr.media.appendChild(container);

				// Set ID
				container.setAttribute('id', id);

				// Setup API
				if (_is.object(window.YT)) {
					_youTubeReady(mediaId, container);
				} else {
					// Load the API
					_injectScript(config.urls.youtube.api);

					// Setup callback for the API
					window.onYouTubeReadyCallbacks = window.onYouTubeReadyCallbacks || [];

					// Add to queue
					window.onYouTubeReadyCallbacks.push(function() { _youTubeReady(mediaId, container); });

					// Set callback to process queue
					window.onYouTubeIframeAPIReady = function () {
						window.onYouTubeReadyCallbacks.forEach(function(callback) { callback(); });
					};
				}
			} else if (plyr.type === 'vimeo') {
				// Vimeo needs an extra div to hide controls on desktop (which has full support)
				if (plyr.supported.full) {
					plyr.media.appendChild(container);
				} else {
					container = plyr.media;
				}

				// Set ID
				container.setAttribute('id', id);

				// Load the API if not already
				if (!_is.object(window.Vimeo)) {
					_injectScript(config.urls.vimeo.api);

					// Wait for fragaloop load
					var vimeoTimer = window.setInterval(function() {
						if (_is.object(window.Vimeo)) {
							window.clearInterval(vimeoTimer);
							_vimeoReady(mediaId, container);
						}
					}, 50);
				} else {
					_vimeoReady(mediaId, container);
				}
			} else if (plyr.type === 'soundcloud') {
				// TODO: Currently unsupported and undocumented
				// Inject the iframe
				var soundCloud = document.createElement('iframe');

				// Watch for iframe load
				soundCloud.loaded = false;
				_on(soundCloud, 'load', function() { soundCloud.loaded = true; }); // _on(element, events, callback, useCapture)

				_setAttributes(soundCloud, {
					'src':  'https://w.soundcloud.com/player/?url=https://api.soundcloud.com/tracks/' + mediaId,
					'id':   id
				});

				container.appendChild(soundCloud);
				plyr.media.appendChild(container);

				// Load the API if not already
				if (!window.SC) {
					_injectScript(config.urls.soundcloud.api);
				}

				// Wait for SC load
				var soundCloudTimer = window.setInterval(function() {
					if (window.SC && soundCloud.loaded) {
						window.clearInterval(soundCloudTimer);
						_soundcloudReady.call(soundCloud);
					}
				}, 50);
			}
			*/
		}

		// When embeds are ready
		function _embedReady() {
			/*
			// Setup the UI and call ready if full support
			if (plyr.supported.full) {
				_setupInterface();
				_ready();
			}

			// Set title
			_setTitle(_getElement('iframe'));
			*/
		}

		// 유튜브 API
		// Handle YouTube API ready
		function _youTubeReady(videoId, container) {
			/*
			// Setup instance
			// https://developers.google.com/youtube/iframe_api_reference
			plyr.embed = new window.YT.Player(container.id, {
				videoId: videoId,
				playerVars: {
					autoplay:       (config.autoplay ? 1 : 0),
					controls:       (plyr.supported.full ? 0 : 1),
					rel:            0,
					showinfo:       0,
					iv_load_policy: 3,
					cc_load_policy: (config.captions.defaultActive ? 1 : 0),
					cc_lang_pref:   'en',
					wmode:          'transparent',
					modestbranding: 1,
					disablekb:      1,
					origin:         '*' // https://code.google.com/p/gdata-issues/issues/detail?id=5788#c45
				},
				events: {
					'onError': function(event) {
						_triggerEvent(plyr.container, 'error', true, {
							code:   event.data,
							embed:  event.target
						});
					},
					'onReady': function(event) {
						// Get the instance
						var instance = event.target;

						// Create a faux HTML5 API using the YouTube API
						plyr.media.play = function() {
							instance.playVideo();
							plyr.media.paused = false;
						};
						plyr.media.pause = function() {
							instance.pauseVideo();
							plyr.media.paused = true;
						};
						plyr.media.stop = function() {
							instance.stopVideo();
							plyr.media.paused = true;
						};
						plyr.media.duration = instance.getDuration();
						plyr.media.paused = true;
						plyr.media.currentTime = 0;
						plyr.media.muted = instance.isMuted();

						// Set title
						config.title = instance.getVideoData().title;

						// Set the tabindex
						if (plyr.supported.full) {
							plyr.media.querySelector('iframe').setAttribute('tabindex', '-1');
						}

						// Update UI
						_embedReady();

						// Trigger timeupdate
						_triggerEvent(plyr.media, 'timeupdate');

						// Trigger timeupdate
						_triggerEvent(plyr.media, 'durationchange');

						// Reset timer
						window.clearInterval(timers.buffering);

						// Setup buffering
						timers.buffering = window.setInterval(function() {
							// Get loaded % from YouTube
							plyr.media.buffered = instance.getVideoLoadedFraction();

							// Trigger progress only when we actually buffer something
							if (plyr.media.lastBuffered === null || plyr.media.lastBuffered < plyr.media.buffered) {
								_triggerEvent(plyr.media, 'progress');
							}

							// Set last buffer point
							plyr.media.lastBuffered = plyr.media.buffered;

							// Bail if we're at 100%
							if (plyr.media.buffered === 1) {
								window.clearInterval(timers.buffering);

								// Trigger event
								_triggerEvent(plyr.media, 'canplaythrough');
							}
						}, 200);
					},
					'onStateChange': function(event) {
						// Get the instance
						var instance = event.target;

						// Reset timer
						window.clearInterval(timers.playing);

						// Handle events
						// -1   Unstarted
						// 0    Ended
						// 1    Playing
						// 2    Paused
						// 3    Buffering
						// 5    Video cued
						switch (event.data) {
							case 0:
								plyr.media.paused = true;
								_triggerEvent(plyr.media, 'ended');
								break;

							case 1:
								plyr.media.paused = false;

								// If we were seeking, fire seeked event
								if (plyr.media.seeking) {
									_triggerEvent(plyr.media, 'seeked');
								}

								plyr.media.seeking = false;
								_triggerEvent(plyr.media, 'play');
								_triggerEvent(plyr.media, 'playing');

								// Poll to get playback progress
								timers.playing = window.setInterval(function() {
									// Set the current time
									plyr.media.currentTime = instance.getCurrentTime();

									// Trigger timeupdate
									_triggerEvent(plyr.media, 'timeupdate');
								}, 100);

								// Check duration again due to YouTube bug
								// https://github.com/Selz/plyr/issues/374
								// https://code.google.com/p/gdata-issues/issues/detail?id=8690
								if (plyr.media.duration !== instance.getDuration()) {
									plyr.media.duration = instance.getDuration();
									_triggerEvent(plyr.media, 'durationchange');
								}

								break;

							case 2:
								plyr.media.paused = true;
								_triggerEvent(plyr.media, 'pause');
								break;
						}

						_triggerEvent(plyr.container, 'statechange', false, {
							code: event.data
						});
					}
				}
			});
			*/
		}

		// Vimeo ready
		function _vimeoReady(mediaId, container) {
			/*
			// Setup instance
			// https://github.com/vimeo/player.js
			plyr.embed = new window.Vimeo.Player(container, {
				id:         parseInt(mediaId),
				loop:       config.loop,
				autoplay:   config.autoplay,
				byline:     false,
				portrait:   false,
				title:      false
			});

			// Create a faux HTML5 API using the Vimeo API
			plyr.media.play = function() {
				plyr.embed.play();
				plyr.media.paused = false;
			};
			plyr.media.pause = function() {
				plyr.embed.pause();
				plyr.media.paused = true;
			};
			plyr.media.stop = function() {
				plyr.embed.stop();
				plyr.media.paused = true;
			};

			plyr.media.paused = true;
			plyr.media.currentTime = 0;

			// Update UI
			_embedReady();

			plyr.embed.getCurrentTime().then(function(value) {
				plyr.media.currentTime = value;

				// Trigger timeupdate
				_triggerEvent(plyr.media, 'timeupdate');
			});

			plyr.embed.getDuration().then(function(value) {
				plyr.media.duration = value;

				// Trigger timeupdate
				_triggerEvent(plyr.media, 'durationchange');
			});

			// TODO: Captions
			//if (config.captions.defaultActive) {
				//plyr.embed.enableTextTrack('en');
			//}

			plyr.embed.on('loaded', function() {
				// Fix keyboard focus issues
				// https://github.com/Selz/plyr/issues/317
				if (_is.htmlElement(plyr.embed.element) && plyr.supported.full) {
					plyr.embed.element.setAttribute('tabindex', '-1');
				}
			});

			plyr.embed.on('play', function() {
				plyr.media.paused = false;
				_triggerEvent(plyr.media, 'play');
				_triggerEvent(plyr.media, 'playing');
			});

			plyr.embed.on('pause', function() {
				plyr.media.paused = true;
				_triggerEvent(plyr.media, 'pause');
			});

			plyr.embed.on('timeupdate', function(data) {
				plyr.media.seeking = false;
				plyr.media.currentTime = data.seconds;
				_triggerEvent(plyr.media, 'timeupdate');
			});

			plyr.embed.on('progress', function(data) {
				plyr.media.buffered = data.percent;
				_triggerEvent(plyr.media, 'progress');

				if (parseInt(data.percent) === 1) {
					// Trigger event
					_triggerEvent(plyr.media, 'canplaythrough');
				}
			});

			plyr.embed.on('seeked', function() {
				plyr.media.seeking = false;
				_triggerEvent(plyr.media, 'seeked');
				_triggerEvent(plyr.media, 'play');
			});

			plyr.embed.on('ended', function() {
				plyr.media.paused = true;
				_triggerEvent(plyr.media, 'ended');
			});
			*/
		}

		// Soundcloud ready
		function _soundcloudReady() {
			/* jshint validthis: true */
			/*
			plyr.embed = window.SC.Widget(this);

			// Setup on ready
			plyr.embed.bind(window.SC.Widget.Events.READY, function() {
				// Create a faux HTML5 API using the Soundcloud API
				plyr.media.play = function() {
					plyr.embed.play();
					plyr.media.paused = false;
				};
				plyr.media.pause = function() {
					plyr.embed.pause();
					plyr.media.paused = true;
				};
				plyr.media.stop = function() {
					plyr.embed.seekTo(0);
					plyr.embed.pause();
					plyr.media.paused = true;
				};

				plyr.media.paused = true;
				plyr.media.currentTime = 0;

				plyr.embed.getDuration(function(value) {
					plyr.media.duration = value/1000;

					// Update UI
					_embedReady();
				});

				plyr.embed.getPosition(function(value) {
					plyr.media.currentTime = value;

					// Trigger timeupdate
					_triggerEvent(plyr.media, 'timeupdate');
				});

				plyr.embed.bind(window.SC.Widget.Events.PLAY, function() {
					plyr.media.paused = false;
					_triggerEvent(plyr.media, 'play');
					_triggerEvent(plyr.media, 'playing');
				});

				plyr.embed.bind(window.SC.Widget.Events.PAUSE, function() {
					plyr.media.paused = true;
					_triggerEvent(plyr.media, 'pause');
				});

				plyr.embed.bind(window.SC.Widget.Events.PLAY_PROGRESS, function(data) {
					plyr.media.seeking = false;
					plyr.media.currentTime = data.currentPosition/1000;
					_triggerEvent(plyr.media, 'timeupdate');
				});

				plyr.embed.bind(window.SC.Widget.Events.LOAD_PROGRESS, function(data) {
					plyr.media.buffered = data.loadProgress;
					_triggerEvent(plyr.media, 'progress');

					if (parseInt(data.loadProgress) === 1) {
						// Trigger event
						_triggerEvent(plyr.media, 'canplaythrough');
					}
				});

				plyr.embed.bind(window.SC.Widget.Events.FINISH, function() {
					plyr.media.paused = true;
					_triggerEvent(plyr.media, 'ended');
				});
			});
			*/
		}






		// ---------- ---------- ---------- ---------- ---------- ---------- ---------- ---------- ----------
		// 플레이어 기본기능 !!!


		// Play media
		function _play() {
			if ('play' in plyr.media) {
				plyr.media.play(); // play() html5 video 스팩 기본제공 함수
			}
		}

		// Pause media
		function _pause() {
			if ('pause' in plyr.media) {
				plyr.media.pause(); // pause() html5 video 스팩 기본제공 함수
			}
		}

		// 되감기
		function _rewind(seekTime) {
			// Use default if needed
			if (!_is.number(seekTime)) {
				seekTime = config.seekTime;
			}
			_seek(plyr.media.currentTime - seekTime);
		}

		// 빨리감기
		function _forward(seekTime) {
			// Use default if needed
			if (!_is.number(seekTime)) {
				seekTime = config.seekTime;
			}
			_seek(plyr.media.currentTime + seekTime);
		}

		// 시간에 따른 재생 구간 설정 (seek 는 현재 재생중인 동그라미아이콘 위치)
		// 즉, 보고싶은 재생시점으로 변경할 수 있다.
		// Seek to time
		// The input parameter can be an event or a number
		function _seek(input) {
			var targetTime  = 0,
				paused      = plyr.media.paused, // 일시정지, 정지상태 여부값
				duration    = _getDuration(); // 재생시간

			if (_is.number(input)) {
				targetTime = input;
			} else if (_is.object(input) && _inArray(['input', 'change'], input.type)) {
				// It's the seek slider
				// Seek to the selected time
				targetTime = ((input.target.value / input.target.max) * duration);
			}

			// 동영상 재생시간 범위 유효성 확인
			// Normalise targetTime
			if (targetTime < 0) {
				targetTime = 0;
			} else if (targetTime > duration) {
				targetTime = duration;
			}

			// Update seek range and progress
			_updateSeekDisplay(targetTime);

			// Set the current time
			// Try/catch incase the media isn't set and we're calling seek() from source() and IE moans
			try {
				plyr.media.currentTime = targetTime.toFixed(4);
			}
			catch(e) {}


			// ----------


			// Embeds
			/*
			if (_inArray(config.types.embed, plyr.type)) {
				switch(plyr.type) {
					case 'youtube':
						plyr.embed.seekTo(targetTime);
						break;

					case 'vimeo':
						// Round to nearest second for vimeo
						plyr.embed.setCurrentTime(targetTime.toFixed(0));
						break;

					case 'soundcloud':
						plyr.embed.seekTo(targetTime * 1000);
						break;
				}

				if (paused) {
					_pause();
				}

				// Trigger timeupdate
				_triggerEvent(plyr.media, 'timeupdate');

				// Set seeking flag
				plyr.media.seeking = true;

				// Trigger seeking
				_triggerEvent(plyr.media, 'seeking');
			}
			*/

			// Logging
			_log('Seeking to ' + plyr.media.currentTime + ' seconds');

			// Special handling for 'manual' captions
			_seekManualCaptions(targetTime);
		}










		// 지속 값 반환
		// Get the duration (or custom if set)
		function _getDuration() {
			// It should be a number, but parse it just incase
			var duration = parseInt(config.duration); // 사용자 지정 재생시간

			// True duration
			var mediaDuration = 0;

			// Only if duration available
			if (plyr.media.duration !== null && !isNaN(plyr.media.duration)) {
				mediaDuration = plyr.media.duration;
			}

			// If custom duration is funky, use regular duration
			return (isNaN(duration) ? mediaDuration : duration);
		}

		// element 에 지속 시간 노출
		// Update the displayed time
		function _updateTimeDisplay(time, element) {
			// Bail if there's no duration display
			if (!element) {
				return;
			}

			// Fallback to 0
			if (isNaN(time)) {
				time = 0;
			}

			plyr.secs = parseInt(time % 60);
			plyr.mins = parseInt((time / 60) % 60);
			plyr.hours = parseInt(((time / 60) / 60) % 60);

			// Do we need to display hours?
			var displayHours = (parseInt(((_getDuration() / 60) / 60) % 60) > 0);

			// Ensure it's two digits. For example, 03 rather than 3.
			plyr.secs = ('0' + plyr.secs).slice(-2);
			plyr.mins = ('0' + plyr.mins).slice(-2);

			// Render
			element.innerHTML = (displayHours ? plyr.hours + ':' : '') + plyr.mins + ':' + plyr.secs;
		}

		// Handle time change event
		function _timeUpdate(event) {
			// Duration
			_updateTimeDisplay(plyr.media.currentTime, plyr.currentTime); // _updateTimeDisplay(time, element)

			// Ignore updates while seeking
			if (event && event.type === 'timeupdate' && plyr.media.seeking) {
				return;
			}

			// Playing progress
			_updateProgress(event);
		}

		// 지속시간 노출 (비디오 데이터를 받은 길이/시간)
		// metadataloaded 에 지속시간 표시
		// Show the duration on metadataloaded
		function _displayDuration() {
			if (!plyr.supported.full) {
				return;
			}

			// Determine duration
			var duration = _getDuration() || 0;

			// If there's only one time display, display duration there
			if (!plyr.duration && config.displayDuration && plyr.media.paused) {
				_updateTimeDisplay(duration, plyr.currentTime); // _updateTimeDisplay(time, element)
			}

			// If there's a duration element, update content
			if (plyr.duration) {
				_updateTimeDisplay(duration, plyr.duration); // _updateTimeDisplay(time, element)
			}

			// Update the tooltip (if visible)
			_updateSeekTooltip();
		}









		// 현재 재생중인 부분을 표시하는 동그라미아이콘 위치 변경
		// Update seek range and progress
		function _updateSeekDisplay(time) {
			// Default to 0
			if (!_is.number(time)) {
				time = 0;
			}

			var duration    = _getDuration(),
				value       = _getPercentage(time, duration);

			// Update progress
			if (plyr.progress && plyr.progress.played) {
				plyr.progress.played.value = value;
			}

			// Update seek range input
			if (plyr.buttons && plyr.buttons.seek) {
				plyr.buttons.seek.value = value;
			}
		}

		// progress bar 에 마우스 오버 했을 때, 해당위치의 시간을 툴팁으로 노출 부분
		// Update hover tooltip for seeking
		function _updateSeekTooltip(event) {
			var duration = _getDuration();

			// Bail if setting not true
			if (!config.tooltips.seek || !plyr.progress.container || duration === 0) {
				return;
			}

			// Calculate percentage
			var clientRect  = plyr.progress.container.getBoundingClientRect(),
				percent     = 0,
				visible     = config.classes.tooltip + '--visible';

			// Determine percentage, if already visible
			if (!event) {
				if (_hasClass(plyr.progress.tooltip, visible)) {
					percent = plyr.progress.tooltip.style.left.replace('%', '');
				} else {
					return;
				}
			} else {
				percent = ((100 / clientRect.width) * (event.pageX - clientRect.left));
			}

			// Set bounds
			if (percent < 0) {
				percent = 0;
			} else if (percent > 100) {
				percent = 100;
			}

			// Display the time a click would seek to
			_updateTimeDisplay(((duration / 100) * percent), plyr.progress.tooltip); // _updateTimeDisplay(time, element)

			// Set position
			plyr.progress.tooltip.style.left = percent + "%";

			// Show/hide the tooltip
			// If the event is a moues in/out and percentage is inside bounds
			if (event && _inArray(['mouseenter', 'mouseleave'], event.type)) {
				_toggleClass(plyr.progress.tooltip, visible, (event.type === 'mouseenter'));
			}
		}










		// Toggle style hook
		function _toggleStyleHook() {
			_toggleClass(plyr.container, config.selectors.container.replace('.', ''), plyr.supported.full);
		}

		// Toggle playback
		function _togglePlay(toggle) {
			// True toggle
			if (!_is.boolean(toggle)) {
				toggle = plyr.media.paused;
			}

			if (toggle) {
				_play();
			} else {
				_pause();
			}

			return toggle;
		}

		// Toggle native controls
		function _toggleNativeControls(toggle) {
			if (toggle && _inArray(config.types.html5, plyr.type)) {
				plyr.media.setAttribute('controls', '');
			} else {
				plyr.media.removeAttribute('controls');
			}
		}

		// 전체 화면 모드로 플레이어 컨트롤 표시
		// Show the player controls in fullscreen mode
		function _toggleControls(toggle) {
			// Don't hide if config says not to, it's audio, or not ready or loading
			if (!config.hideControls || plyr.type === 'audio') {
				return;
			}

			var delay = 0,
				isEnterFullscreen = false,
				show = toggle,
				loading = _hasClass(plyr.container, config.classes.loading);

			// Default to false if no boolean
			if (!_is.boolean(toggle)) {
				if (toggle && toggle.type) {
					// Is the enter fullscreen event
					isEnterFullscreen = (toggle.type === 'enterfullscreen');

					// Whether to show controls
					show = _inArray(['mousemove', 'touchstart', 'mouseenter', 'focus'], toggle.type);

					// Delay hiding on move events
					if (_inArray(['mousemove', 'touchmove'], toggle.type)) {
						delay = 2000;
					}

					// Delay a little more for keyboard users
					if (toggle.type === 'focus') {
						delay = 3000;
					}
				} else {
					show = _hasClass(plyr.container, config.classes.hideControls);
				}
			}

			// Clear timer every movement
			window.clearTimeout(timers.hover);

			// 마우스가 컨트롤 위에 있지 않으면 시간 제한을 설정하여 숨 깁니다.
			// If the mouse is not over the controls, set a timeout to hide them
			if (show || plyr.media.paused || loading) {
				_toggleClass(plyr.container, config.classes.hideControls, false);

				// 일시 중지되거나 터치 할 때 항상 컨트롤 표시
				// Always show controls when paused or if touch
				if (plyr.media.paused || loading) {
					return;
				}

				// Delay for hiding on touch
				if (plyr.browser.isTouch) {
					delay = 3000;
				}
			}

			// If toggle is false or if we're playing (regardless of toggle),
			// then set the timer to hide the controls
			if (!show || !plyr.media.paused) {
				timers.hover = window.setTimeout(function() {
					// If the mouse is over the controls (and not entering fullscreen), bail
					if ((plyr.controls.pressed || plyr.controls.hover) && !isEnterFullscreen) {
						return;
					}

					_toggleClass(plyr.container, config.classes.hideControls, true);
				}, delay);
			}
		}

		// Mute (음소거)
		function _toggleMute(muted) {
			// If the method is called without parameter, toggle based on current value
			if (!_is.boolean(muted)) {
				muted = !plyr.media.muted;
			}

			// Set button state
			_toggleState(plyr.buttons.mute, muted);

			// Set mute on the player
			plyr.media.muted = muted;

			// If volume is 0 after unmuting, set to default
			if (plyr.media.volume === 0) {
				_setVolume(config.volume);
			}

			// Embeds
			if (_inArray(config.types.embed, plyr.type)) {
				// YouTube
				switch(plyr.type) {
					case 'youtube':
						plyr.embed[plyr.media.muted ? 'mute' : 'unMute']();
						break;

					case 'vimeo':
					case 'soundcloud':
						plyr.embed.setVolume(plyr.media.muted ? 0 : parseFloat(config.volume / config.volumeMax));
						break;
				}

				// Trigger volumechange for embeds
				_triggerEvent(plyr.media, 'volumechange');
			}
		}

		// Toggle captions
		function _toggleCaptions(show) {
			// If there's no full support, or there's no caption toggle
			if (!plyr.supported.full || !plyr.buttons.captions) {
				return;
			}

			// If the method is called without parameter, toggle based on current value
			if (!_is.boolean(show)) {
				show = (plyr.container.className.indexOf(config.classes.captions.active) === -1);
			}

			// Set global
			plyr.captionsEnabled = show;

			// Toggle state
			_toggleState(plyr.buttons.captions, plyr.captionsEnabled);

			// Add class hook
			_toggleClass(plyr.container, config.classes.captions.active, plyr.captionsEnabled);

			// Trigger an event
			_triggerEvent(plyr.container, plyr.captionsEnabled ? 'captionsenabled' : 'captionsdisabled', true);

			// Save captions state to localStorage
			_updateStorage({captionsEnabled: plyr.captionsEnabled});
		}











		// Check playing state
		function _checkPlaying() {
			_toggleClass(plyr.container, config.classes.playing, !plyr.media.paused);

			_toggleClass(plyr.container, config.classes.stopped, plyr.media.paused);

			_toggleControls(plyr.media.paused);
		}

		// Check if media is loading
		function _checkLoading(event) {
			var loading = (event.type === 'waiting');

			// Clear timer
			clearTimeout(timers.loading);

			// Timer to prevent flicker when seeking
			timers.loading = setTimeout(function() {
				// Toggle container class hook
				_toggleClass(plyr.container, config.classes.loading, loading);

				// Show controls if loading, hide if done
				_toggleControls(loading);
			}, (loading ? 250 : 0));
		}




















		// Add common function to retrieve media source
		function _source(source) {
			// If not null or undefined, parse it
			if (!_is.undefined(source)) {
				_updateSource(source);
				return;
			}

			// Return the current source
			var url;
			switch(plyr.type) {
				case 'youtube':
					url = plyr.embed.getVideoUrl();
					break;

				case 'vimeo':
					plyr.embed.getVideoUrl.then(function (value) {
						url = value;
					});
					break;

				case 'soundcloud':
					plyr.embed.getCurrentSound(function(object) {
						url = object.permalink_url;
					});
					break;

				default:
					url = plyr.media.currentSrc;
					break;
			}

			return url || '';
		}

		// 비디오 초기화!!!!!!!!
		// <source> 태그에 따라서 작동!!!!
		// Update source
		// Sources are not checked for support so be careful
		function _updateSource(source) {
			if (!_is.object(source) || !('sources' in source) || !source.sources.length) {
				_warn('Invalid source format');
				return;
			}

			// Remove ready class hook
			_toggleClass(plyr.container, config.classes.ready, false);

			// Pause playback
			_pause();

			// Update seek range and progress
			_updateSeekDisplay();

			// Reset buffer progress
			_setProgress();

			// Cancel current network requests
			_cancelRequests();

			// Setup new source
			function setup() {
				// Remove embed object
				plyr.embed = null;

				// Remove the old media
				_remove(plyr.media);

				// Remove video container
				if (plyr.type === 'video' && plyr.videoContainer) {
					_remove(plyr.videoContainer);
				}

				// Reset class name
				if (plyr.container) {
					plyr.container.removeAttribute('class');
				}

				// Set the type
				if ('type' in source) {
					plyr.type = source.type;

					// Get child type for video (it might be an embed)
					if (plyr.type === 'video') {
						var firstSource = source.sources[0];

						if ('type' in firstSource && _inArray(config.types.embed, firstSource.type)) {
							plyr.type = firstSource.type;
						}
					}
				}

				// 브라우저 등 환경정보!!!!!!!!!!!
				// Check for support
				plyr.supported = supported(plyr.type);

				// Create new markup
				switch(plyr.type) {
					case 'video':
						plyr.media = document.createElement('video');
						console.log('[ysm] plyr.media', plyr.media);
						break;

					case 'audio':
						plyr.media = document.createElement('audio');
						break;

					/*
					case 'youtube':
					case 'vimeo':
					case 'soundcloud':
						plyr.media = document.createElement('div');
						plyr.embedId = source.sources[0].src;
						break;
					*/
				}

				// Inject the new element
				_prependChild(plyr.container, plyr.media);

				// Autoplay the new source?
				if (_is.boolean(source.autoplay)) {
					config.autoplay = source.autoplay;
				}

				// Set attributes for audio and video
				if (_inArray(config.types.html5, plyr.type)) {
					if (config.crossorigin) {
						plyr.media.setAttribute('crossorigin', '');
					}
					if (config.autoplay) {
						plyr.media.setAttribute('autoplay', '');
					}
					if ('poster' in source) {
						plyr.media.setAttribute('poster', source.poster);
					}
					if (config.loop) {
						plyr.media.setAttribute('loop', '');
					}
				}

				// Restore class hooks
				_toggleClass(plyr.container, config.classes.fullscreen.active, plyr.isFullscreen);
				_toggleClass(plyr.container, config.classes.captions.active, plyr.captionsEnabled);
				_toggleStyleHook();

				// Set new sources for html5
				if (_inArray(config.types.html5, plyr.type)) {
					_insertChildElements('source', source.sources);
				}

				// Set up from scratch
				_setupMedia();

				// HTML5 stuff
				if (_inArray(config.types.html5, plyr.type)) {
					// Setup captions
					if ('tracks' in source) {
						_insertChildElements('track', source.tracks);
					}

					// Load HTML5 sources
					plyr.media.load(); // load() html5 video 스팩 기본제공 함수
					console.log('[ysm] _updateSource plyr.media.load()');
				}

				// If HTML5 or embed but not fully supported, setupInterface and call ready now
				if (_inArray(config.types.html5, plyr.type) || (_inArray(config.types.embed, plyr.type) && !plyr.supported.full)) {
					// Setup interface
					_setupInterface();

					// Call ready
					_ready();
				}

				// Set aria title and iframe title
				config.title = source.title;
				_setTitle();
			}

			// Destroy instance adn wait for callback
			// Vimeo throws a wobbly if you don't wait
			_destroy(setup, false);
		}

		// Update poster
		function _updatePoster(source) {
			if (plyr.type === 'video') {
				plyr.media.setAttribute('poster', source);
			}
		}



		// ---------- ---------- ---------- ---------- ---------- ---------- ---------- ----------



		// 미디어 플레이어 기본 이벤트
		// Listen for media events
		function _mediaListeners() {
			// 미디어 시간 변경
			// Time change on media
			_on(plyr.media, 'timeupdate seeking', _timeUpdate); // _on(element, events, callback, useCapture)

			// 캡션 수동 업데이트
			// Update manual captions
			_on(plyr.media, 'timeupdate', _seekManualCaptions); // _on(element, events, callback, useCapture)

			// 데이터 로드 진행상황
			// Display duration
			_on(plyr.media, 'durationchange loadedmetadata', _displayDuration); // _on(element, events, callback, useCapture)

			// 미디어 종료
			// Handle the media finishing
			_on(plyr.media, 'ended', function() { // _on(element, events, callback, useCapture)
				// Show poster on end
				if (plyr.type === 'video' && config.showPosterOnEnd) {
					// Clear
					if (plyr.type === 'video') {
						_setCaption();
					}

					// Restart
					_seek();

					// Re-load media
					plyr.media.load(); // load() html5 video 스팩 기본제공 함수
					console.log('[ysm] _mediaListeners plyr.media.load()');
				}
			});

			// 진행바
			// Check for buffer progress
			_on(plyr.media, 'progress playing', _updateProgress); // _on(element, events, callback, useCapture)

			// 볼륨
			// Handle native mute
			_on(plyr.media, 'volumechange', _updateVolume); // _on(element, events, callback, useCapture)

			// 재생 / 일시정지 / 정지
			// Handle native play/pause
			_on(plyr.media, 'play pause ended', _checkPlaying); // _on(element, events, callback, useCapture)

			// Loading
			_on(plyr.media, 'waiting canplay seeked', _checkLoading); // _on(element, events, callback, useCapture)

			// Click video
			if (config.clickToPlay && plyr.type !== 'audio') {
				// Re-fetch the wrapper
				var wrapper = _getElement('.' + config.classes.videoWrapper);

				// Bail if there's no wrapper (this should never happen)
				if (!wrapper) {
					return;
				}

				// Set cursor
				wrapper.style.cursor = "pointer";

				// On click play, pause ore restart
				_on(wrapper, 'click', function() { // _on(element, events, callback, useCapture)
					// Touch devices will just show controls (if we're hiding controls)
					if (config.hideControls && plyr.browser.isTouch && !plyr.media.paused) {
						return;
					}

					if (plyr.media.paused) {
						_play();
					} else if (plyr.media.ended) {
						_seek();
						_play();
					} else {
						_pause();
					}
				});
			}

			// Disable right click
			if (config.disableContextMenu) {
				_on(plyr.media, 'contextmenu', function(event) { event.preventDefault(); }); // _on(element, events, callback, useCapture)
			}

			// Proxy events to container
			// Bubble up key events for Edge
			_on(plyr.media, config.events.concat(['keyup', 'keydown']).join(' '), function(event) { // _on(element, events, callback, useCapture)
				_triggerEvent(plyr.container, event.type, true);
			});
		}

		// 커스텀 컨트롤 영역 이벤트
		// Listen for control events
		function _controlListeners() {
			// IE doesn't support input event, so we fallback to change
			var inputEvent = (plyr.browser.isIE ? 'change' : 'input');

			// Click play/pause helper
			function togglePlay() {
				var play = _togglePlay();

				// Determine which buttons
				var trigger = plyr.buttons[play ? 'play' : 'pause'],
					target = plyr.buttons[play ? 'pause' : 'play'];

				// Get the last play button to account for the large play button
				if (target && target.length > 1) {
					target = target[target.length - 1];
				} else {
					target = target[0];
				}

				// Setup focus and tab focus
				if (target) {
					var hadTabFocus = _hasClass(trigger, config.classes.tabFocus);

					setTimeout(function() {
						target.focus();

						if (hadTabFocus) {
							_toggleClass(trigger, config.classes.tabFocus, false);
							_toggleClass(target, config.classes.tabFocus, true);
						}
					}, 100);
				}
			}

			// ---------- ---------- ---------- 키보드 관련

			// Get the key code for an event
			function getKeyCode(event) {
				return event.keyCode ? event.keyCode : event.which;
			}

			// Get the focused element
			function getFocusElement() {
				var focused = document.activeElement;

				if (!focused || focused === document.body) {
					focused = null;
				} else {
					focused = document.querySelector(':focus');
				}

				return focused;
			}

			function handleKey(event) {
				var code = getKeyCode(event),
					pressed = event.type === 'keydown',
					held = pressed && code === last;

				// If the event is bubbled from the media element
				// Firefox doesn't get the keycode for whatever reason
				if (!_is.number(code)) {
					return;
				}

				// Seek by the number keys
				function seekByKey() {
					// Get current duration
					var duration = plyr.media.duration;

					// Bail if we have no duration set
					if (!_is.number(duration)) {
						return;
					}

					// Divide the max duration into 10th's and times by the number value
					_seek((duration / 10) * (code - 48));
				}

				// Handle the key on keydown
				// Reset on keyup
				if (pressed) {
					// Which keycodes should we prevent default
					var preventDefault = [48,49,50,51,52,53,54,56,57,32,75,38,40,77,39,37,70,67];

					// If the code is found prevent default (e.g. prevent scrolling for arrows)
					if (_inArray(preventDefault, code)) {
						event.preventDefault();
						event.stopPropagation();
					}

					switch(code) {
						// 0-9
						case 48:
						case 49:
						case 50:
						case 51:
						case 52:
						case 53:
						case 54:
						case 55:
						case 56:
						case 57: if (!held) { seekByKey(); } break;
						// Space and K key
						case 32:
						case 75: if (!held) { _togglePlay(); } break;
						// Arrow up
						case 38: _increaseVolume(); break;
						// Arrow down
						case 40: _decreaseVolume(); break;
						// M key
						case 77: if (!held) { _toggleMute() } break;
						// Arrow forward
						case 39: _forward(); break;
						// Arrow back
						case 37: _rewind(); break;
						// F key
						case 70: _toggleFullscreen(); break;
						// C key
						case 67: if (!held) { _toggleCaptions(); } break;
					}

					// Escape is handle natively when in full screen
					// So we only need to worry about non native
					if (!fullscreen.supportsFullScreen && plyr.isFullscreen && code === 27) {
						_toggleFullscreen();
					}

					// Store last code for next cycle
					last = code;
				} else {
					last = null;
				}
			}

			// Detect tab focus
			function checkTabFocus(focused) {
				for (var button in plyr.buttons) {
					var element = plyr.buttons[button];

					if (_is.nodeList(element)) {
						for (var i = 0; i < element.length; i++) {
							_toggleClass(element[i], config.classes.tabFocus, (element[i] === focused));
						}
					} else {
						_toggleClass(element, config.classes.tabFocus, (element === focused));
					}
				}
			}

			// 키보드 바로가기 키
			// Keyboard shortcuts
			if (config.keyboardShorcuts.focused) {
				var last = null;

				// Handle global presses
				if (config.keyboardShorcuts.global) {
					_on(window, 'keydown keyup', function(event) { // _on(element, events, callback, useCapture)
						var code = getKeyCode(event),
						focused = getFocusElement(),
						allowed = [48,49,50,51,52,53,54,56,57,75,77,70,67], // 허용된 key 코드
						count   = get().length;

						// Only handle global key press if there's only one player
						// and the key is in the allowed keys
						// and if the focused element is not editable (e.g. text input)
						// and any that accept key input http://webaim.org/techniques/keyboard/
						if (count === 1 && _inArray(allowed, code) && (!_is.htmlElement(focused) || !_matches(focused, config.selectors.editable))) {
							handleKey(event);
						}
					});
				}

				// Handle presses on focused
				_on(plyr.container, 'keydown keyup', handleKey); // _on(element, events, callback, useCapture)
			}

			// Focus/tab management
			_on(window, 'keyup', function(event) { // _on(element, events, callback, useCapture)
				var code = getKeyCode(event),
					focused = getFocusElement();

				if (code === 9) {
					checkTabFocus(focused);
				}
			});
			_on(document.body, 'click', function() { // _on(element, events, callback, useCapture)
				_toggleClass(_getElement('.' + config.classes.tabFocus), config.classes.tabFocus, false);
			});
			for (var button in plyr.buttons) {
				var element = plyr.buttons[button];

				_on(element, 'blur', function() { // _on(element, events, callback, useCapture)
					_toggleClass(element, 'tab-focus', false);
				});
			}

			// ---------- ---------- ----------

			// Play
			_proxyListener(plyr.buttons.play, 'click', config.listeners.play, togglePlay); // element, eventName, userListener, defaultListener, useCapture

			// Pause
			_proxyListener(plyr.buttons.pause, 'click', config.listeners.pause, togglePlay); // element, eventName, userListener, defaultListener, useCapture

			// Restart
			_proxyListener(plyr.buttons.restart, 'click', config.listeners.restart, _seek); // element, eventName, userListener, defaultListener, useCapture

			// Rewind
			_proxyListener(plyr.buttons.rewind, 'click', config.listeners.rewind, _rewind); // element, eventName, userListener, defaultListener, useCapture

			// Fast forward
			_proxyListener(plyr.buttons.forward, 'click', config.listeners.forward, _forward); // element, eventName, userListener, defaultListener, useCapture

			// Seek
			_proxyListener(plyr.buttons.seek, inputEvent, config.listeners.seek, _seek); // element, eventName, userListener, defaultListener, useCapture

			// Set volume
			_proxyListener(plyr.volume.input, inputEvent, config.listeners.volume, function() { // element, eventName, userListener, defaultListener, useCapture
				_setVolume(plyr.volume.input.value);
			});

			// Mute
			_proxyListener(plyr.buttons.mute, 'click', config.listeners.mute, _toggleMute); // element, eventName, userListener, defaultListener, useCapture

			// Fullscreen
			_proxyListener(plyr.buttons.fullscreen, 'click', config.listeners.fullscreen, _toggleFullscreen); // element, eventName, userListener, defaultListener, useCapture

			// Handle user exiting fullscreen by escaping etc
			if (fullscreen.supportsFullScreen) {
				_on(document, fullscreen.fullScreenEventName, _toggleFullscreen); // _on(element, events, callback, useCapture)
			}

			// Captions
			_on(plyr.buttons.captions, 'click', _toggleCaptions); // _on(element, events, callback, useCapture)

			// Seek tooltip
			_on(plyr.progress.container, 'mouseenter mouseleave mousemove', _updateSeekTooltip); // _on(element, events, callback, useCapture)

			// Toggle controls visibility based on mouse movement
			if (config.hideControls) {
				// Toggle controls on mouse events and entering fullscreen
				_on(plyr.container, 'mouseenter mouseleave mousemove touchstart touchend touchcancel touchmove enterfullscreen', _toggleControls); // _on(element, events, callback, useCapture)

				// Watch for cursor over controls so they don't hide when trying to interact
				_on(plyr.controls, 'mouseenter mouseleave', function(event) { // _on(element, events, callback, useCapture)
					plyr.controls.hover = event.type === 'mouseenter';
				});

				 // Watch for cursor over controls so they don't hide when trying to interact
				_on(plyr.controls, 'mousedown mouseup touchstart touchend touchcancel', function(event) { // _on(element, events, callback, useCapture)
					plyr.controls.pressed = _inArray(['mousedown', 'touchstart'], event.type);
				});

				// Focus in/out on controls
				_on(plyr.controls, 'focus blur', _toggleControls, true); // _on(element, events, callback, useCapture)
			}

			// Adjust volume on scroll
			_on(plyr.volume.input, 'wheel', function(event) { // _on(element, events, callback, useCapture)
				event.preventDefault();

				// Detect "natural" scroll - suppored on OS X Safari only
				// Other browsers on OS X will be inverted until support improves
				var inverted = event.webkitDirectionInvertedFromDevice,
					step = (config.volumeStep / 5);

				// Scroll down (or up on natural) to decrease
				if (event.deltaY < 0 || event.deltaX > 0) {
					if (inverted) {
						_decreaseVolume(step);
					} else {
						_increaseVolume(step);
					}
				}

				// Scroll up (or down on natural) to increase
				if (event.deltaY > 0 || event.deltaX < 0) {
					if (inverted) {
						_increaseVolume(step);
					} else {
						_decreaseVolume(step);
					}
				}
			});
		}

		// 미디어 요청 취소
		// Cancel current network requests
		// See https://github.com/Selz/plyr/issues/174
		function _cancelRequests() {
			if (!_inArray(config.types.html5, plyr.type)) {
				return;
			}

			// Remove child sources
			var sources = plyr.media.querySelectorAll('source');
			for (var i = 0; i < sources.length; i++) {
				_remove(sources[i]);
			}

			// Set blank video src attribute
			// This is to prevent a MEDIA_ERR_SRC_NOT_SUPPORTED error
			// Info: http://stackoverflow.com/questions/32231579/how-to-properly-dispose-of-an-html5-video-and-close-socket-or-connection
			plyr.media.setAttribute('src', 'https://cdn.selz.com/plyr/blank.mp4');

			// Load the new empty source
			// This will cancel existing requests
			// See https://github.com/Selz/plyr/issues/174
			plyr.media.load(); // load() html5 video 스팩 기본제공 함수
			console.log('[ysm] _cancelRequests plyr.media.load()');

			// Debugging
			_log('Cancelled network requests');
		}

		// Destroy an instance
		// Event listeners are removed when elements are removed
		// http://stackoverflow.com/questions/12528049/if-a-dom-element-is-removed-are-its-listeners-also-removed-from-memory
		function _destroy(callback, restore) {
			// Bail if the element is not initialized
			if (!plyr.init) {
				return null;
			}

			// Type specific stuff
			switch (plyr.type) {
				case 'youtube':
					// Clear timers
					window.clearInterval(timers.buffering);
					window.clearInterval(timers.playing);

					// Destroy YouTube API
					plyr.embed.destroy();

					// Clean up
					cleanUp();

					break;

				case 'vimeo':
					// Destroy Vimeo API
					// then clean up (wait, to prevent postmessage errors)
					plyr.embed.unload().then(cleanUp);

					// Vimeo does not always return
					timers.cleanUp = window.setTimeout(cleanUp, 200);

					break;

				case 'video':
				case 'audio':
					// Restore native video controls
					_toggleNativeControls(true);

					// Clean up
					cleanUp();

					break;
			}

			function cleanUp() {
				clearTimeout(timers.cleanUp);

				// Default to restore original element
				if (!_is.boolean(restore)) {
					restore = true;
				}

				// Callback
				if (_is.function(callback)) {
					callback.call(original);
				}

				// Bail if we don't need to restore the original element
				if (!restore) {
					return;
				}

				// Remove init flag
				plyr.init = false;

				// Replace the container with the original element provided
				plyr.container.parentNode.replaceChild(original, plyr.container);

				// Allow overflow (set on fullscreen)
				document.body.style.overflow = '';

				// Event
				_triggerEvent(original, 'destroyed', true);
			}
		}



		// ---------- ---------- ---------- ---------- ---------- ---------- ---------- ----------



		// 플레이어 UI Setup
		// Setup the UI
		function _setupInterface() {
			// Don't setup interface if no support
			if (!plyr.supported.full) {
				_warn('Basic support only', plyr.type);

				// Remove controls
				_remove(_getElement(config.selectors.controls.wrapper));

				// Remove large play
				_remove(_getElement(config.selectors.buttons.play));

				// Restore native controls
				_toggleNativeControls(true);

				// Bail
				return;
			}

			// Inject custom controls if not present
			var controlsMissing = !_getElements(config.selectors.controls.wrapper).length;
			if (controlsMissing) {
				// Inject custom controls
				_injectControls();
			}

			// Find the elements
			if (!_findElements()) {
				return;
			}

			// If the controls are injected, re-bind listeners for controls
			if (controlsMissing) {
				_controlListeners();
			}

			// Media element listeners
			_mediaListeners();

			// Remove native controls
			_toggleNativeControls();

			// Setup fullscreen
			_setupFullscreen();

			// Captions
			_setupCaptions();

			// Set volume
			_setVolume();
			_updateVolume();

			// Reset time display
			_timeUpdate();

			// Update the UI
			_checkPlaying();
		}







		// Everything done
		function _ready() {
			// Ready event at end of execution stack
			window.setTimeout(function() {
				_triggerEvent(plyr.media, 'ready');
			}, 0);

			// Set class hook on media element
			_toggleClass(plyr.media, defaults.classes.setup, true);

			// Set container class for ready
			_toggleClass(plyr.container, config.classes.ready, true);

			// Store a refernce to instance
			plyr.media.plyr = api;

			// Autoplay
			if (config.autoplay) {
				_play();
			}
		}

		// Setup a player
		function _init() {
			// Bail if the element is initialized
			if (plyr.init) {
				return null;
			}

			// Setup the fullscreen api
			fullscreen = _fullscreen();

			// Sniff out the browser
			plyr.browser = _browserSniff();

			// Bail if nothing to setup
			if (!_is.htmlElement(plyr.media)) {
				return;
			}

			// Load saved settings from localStorage
			_setupStorage();

			// Set media type based on tag or data attribute
			// Supported: video, audio, vimeo, youtube
			var tagName = media.tagName.toLowerCase();
			if (tagName === 'div') {
				plyr.type     = media.getAttribute('data-type');
				plyr.embedId  = media.getAttribute('data-video-id');

				// Clean up
				media.removeAttribute('data-type');
				media.removeAttribute('data-video-id');
			} else {
				plyr.type           = tagName;
				config.crossorigin  = (media.getAttribute('crossorigin') !== null);
				config.autoplay     = (config.autoplay || (media.getAttribute('autoplay') !== null));
				config.loop         = (config.loop || (media.getAttribute('loop') !== null));
			}

			// Check for support
			plyr.supported = supported(plyr.type);

			// If no native support, bail
			if (!plyr.supported.basic) {
				return;
			}

			// Wrap media
			plyr.container = _wrap(media, document.createElement('div')); // media 는 plyr.media 와 동일
			console.log('[ysm] plyr.container', plyr.container);

			// Allow focus to be captured
			plyr.container.setAttribute('tabindex', 0);

			// Add style hook
			_toggleStyleHook();

			// Debug info
			_log('' + plyr.browser.name + ' ' + plyr.browser.version);

			// Setup media
			_setupMedia();

			// Setup interface
			// If embed but not fully supported, setupInterface (to avoid flash of controls) and call ready now
			if (_inArray(config.types.html5, plyr.type) || (_inArray(config.types.embed, plyr.type) && !plyr.supported.full)) {
				// Setup UI
				_setupInterface();

				// Call ready
				_ready();

				// Set title on button and frame
				_setTitle();
			}

			// Successful setup
			plyr.init = true;
		}



		// ---------- ---------- ---------- ---------- ---------- ---------- ---------- ----------


		// Plyr 인스턴스 return 값
		api = {
			getOriginal:        function() { return original; },
			getContainer:       function() { return plyr.container },
			getEmbed:           function() { return plyr.embed; },
			getMedia:           function() { return plyr.media; },
			getType:            function() { return plyr.type; },
			getDuration:        _getDuration,
			getCurrentTime:     function() { return plyr.media.currentTime; },
			getVolume:          function() { return plyr.media.volume; },
			isMuted:            function() { return plyr.media.muted; },
			isReady:            function() { return _hasClass(plyr.container, config.classes.ready); },
			isLoading:          function() { return _hasClass(plyr.container, config.classes.loading); },
			isPaused:           function() { return plyr.media.paused; },
			on:                 function(event, callback) { _on(plyr.container, event, callback); return this; }, // _on(element, events, callback, useCapture)
			play:               _play,
			pause:              _pause,
			stop:               function() { _pause(); _seek(); },
			restart:            _seek,
			rewind:             _rewind,
			forward:            _forward,
			seek:               _seek,
			source:             _source,
			poster:             _updatePoster,
			setVolume:          _setVolume,
			togglePlay:         _togglePlay,
			toggleMute:         _toggleMute,
			toggleCaptions:     _toggleCaptions,
			toggleFullscreen:   _toggleFullscreen,
			toggleControls:     _toggleControls,
			isFullscreen:       function() { return plyr.isFullscreen || false; },
			support:            function(mimeType) { return _supportMime(plyr, mimeType); },
			destroy:            _destroy
		};

		// Initialize instance
		_init();

		// If init failed, return null
		if (!plyr.init) {
			return null;
		}

		return api;
	} // Plyr




	// ---------- ---------- ---------- ---------- ---------- ---------- ---------- ---------- ----------















	// 플레이어 생성!!
	// 여기에서 new Plyr 실행!!
	// plyr 라이브러리를 사용하기 위해 plyr.setup(); 를 가장먼저 실행해야함
	// Setup function
	function setup(targets, options) {
		// Get the players
		var players     = [], // 재생가능한 element 타겟 (<video>, <audio> 등)
			instances   = [],
			selector    = [defaults.selectors.html5, defaults.selectors.embed].join(','); // video, audio, [data-type]

		// Select the elements
		if (_is.string(targets)) {
			// String selector passed
			targets = document.querySelectorAll(targets);
		}  else if (_is.htmlElement(targets)) {
			// Single HTMLElement passed
			targets = [targets];
		}  else if (!_is.nodeList(targets) && !_is.array(targets) && !_is.string(targets))  {
			// No selector passed, possibly options as first argument
			// If options are the first argument
			if (_is.undefined(options) && _is.object(targets)) {
				options = targets;
			}

			// Use default selector
			targets = document.querySelectorAll(selector);
		}

		// Convert NodeList to array
		if (_is.nodeList(targets)) {
			targets = Array.prototype.slice.call(targets);
		}

		// Bail if disabled or no basic support
		// You may want to disable certain UAs etc
		if (!supported().basic || !targets.length) {
			return false;
		}



		// players 배열에 추가 (재생가능한 element)
		// Add to container list
		function add(target, media) {
			if (!_hasClass(media, defaults.classes.hook)) {
				players.push({
					// Always wrap in a <div> for styling
					// container:  _wrap(media, document.createElement('div')),
					// Could be a container or the media itself
					target:     target,
					// This should be the <video>, <audio> or <div> (YouTube/Vimeo)
					media:      media
				});
			}
		}



		// Check if the targets have multiple media elements
		for (var i = 0; i < targets.length; i++) {
			var target = targets[i];

			// Get children
			var children = target.querySelectorAll(selector); // target 내부 video, audio, [data-type] 등의 element를 찾는다.

			// If there's more than one media element child, wrap them
			if (children.length) {
				// target 내부자식으로 비디오 등을 실행시킬 element 가 있다.
				for (var x = 0; x < children.length; x++) {
					add(target, children[x]);
				}
			} else if (_matches(target, selector)) {
				// Target is media element
				// target 이 비디오 등을 실행할 element 다.
				add(target, target);
			}
		}

		// 각 요소에 대한 플레이어 인스턴스 만들기
		// Create a player instance for each element
		players.forEach(function(player) {
			var element     = player.target,
				media       = player.media,
				match       = false;

			// The target element can also be the media element
			if (media === element) {
				match = true;
			}

			// 비디오 타켓 element 의 속성 값 (data-plyr)
			var data = {};
			try { data = JSON.parse(element.getAttribute('data-plyr')); }
			catch(e) { }



			// defaults(기본설정값), options, data 결합 confing
			var config = _extend({}, defaults, options, data); //  <<--------------------------------------- 설정값 세팅



			// Bail if not enabled
			if (!config.enabled) {
				return null;
			}




			// Create new instance
			var instance = new Plyr(media, config); //  <<--------------------------------------- new Plyr




			// Go to next if setup failed
			if (!_is.object(instance)) {
				return;
			}

			// Listen for events if debugging
			if (config.debug) {
				var events = config.events.concat(['setup', 'statechange', 'enterfullscreen', 'exitfullscreen', 'captionsenabled', 'captionsdisabled']);

				_on(instance.getContainer(), events.join(' '), function(event) { // _on(element, events, callback, useCapture)
					console.log([config.logPrefix, 'event:', event.type].join(' '), event.detail.plyr);
				});
			}

			// Callback
			_event(instance.getContainer(), 'setup', true, {
				plyr: instance
			});

			// Add to return array even if it's already setup
			instances.push(instance);
		});

		return instances;
	}








	// public return 함수  ---------- ---------- ---------- ---------- ---------- ---------- ---------- ---------- ----------



	// 사용자가 만드려는 것을 지원하는 환경인지 조회
	// Check for support
	function supported(type) {
		var browser     = _browserSniff(),
			isOldIE     = (browser.isIE && browser.version <= 9),
			isIos       = browser.isIos,
			isIphone    = browser.isIphone,
			audioSupport = !!document.createElement('audio').canPlayType,
			videoSupport = !!document.createElement('video').canPlayType,
			basic       = false,
			full        = false;

		switch (type) {
			case 'video':
				basic = videoSupport;
				full  = (basic && (!isOldIE && !isIphone));
				break;

			case 'audio':
				basic = audioSupport;
				full  = (basic && !isOldIE);
				break;

			// Vimeo does not seem to be supported on iOS via API
			// Issue raised https://github.com/vimeo/player.js/issues/87
			case 'vimeo':
				basic = true;
				full = (!isOldIE && !isIos);
				break;

			case 'youtube':
				basic = true;
				full = (!isOldIE && !isIos);

				// YouTube seems to work on iOS 10+ on iPad
				if (isIos && !isIphone && browser.version >= 10) {
					full = true;
				}

				break;

			case 'soundcloud':
				basic = true;
				full  = (!isOldIE && !isIphone);
				break;

			default:
				basic = (audioSupport && videoSupport);
				full  = (basic && !isOldIE);
		}

		return {
			basic:  basic,
			full:   full
		};
	}


	// Load a sprite
	function loadSprite(url, id) {
		var x = new XMLHttpRequest();

		// If the id is set and sprite exists, bail
		if (_is.string(id) && _is.htmlElement(document.querySelector('#' + id))) {
			return;
		}

		// Create placeholder (to prevent loading twice)
		var container = document.createElement('div');
		container.setAttribute('hidden', '');
		if (_is.string(id)) {
			container.setAttribute('id', id);
		}
		document.body.insertBefore(container, document.body.childNodes[0]);
		console.log('[ysm] container', container);

		// Check for CORS support
		if ('withCredentials' in x) {
			x.open('GET', url, true);
		} else {
			return;
		}

		// Inject hidden div with sprite on load
		x.onload = function() {
			container.innerHTML = x.responseText;
		}

		x.send();
	}


	// 모든 container 가져오기
	// Get all instances within a provided container
	function get(container) {
		if (_is.string(container)) {
			// Get selector if string passed
			container = document.querySelector(container);
		} else if (_is.undefined(container)) {
			// Use body by default to get all on page
			container = document.body;
		}

		// If we have a HTML element
		if (_is.htmlElement(container)) {
			var elements = container.querySelectorAll('.' + defaults.classes.setup),
				instances = [];

			Array.prototype.slice.call(elements).forEach(function(element) {
				if (_is.object(element.plyr)) {
					instances.push(element.plyr);
				}
			});

			return instances;
		}

		return [];
	}



	return {
		setup:      setup,
		supported:  supported,
		loadSprite: loadSprite,
		get:        get
	};
}));




// Custom event polyfill
// https://developer.mozilla.org/en-US/docs/Web/API/CustomEvent/CustomEvent
(function () {
	if (typeof window.CustomEvent === 'function') {
		return;
	}

	function CustomEvent(event, params) {
		params = params || { bubbles: false, cancelable: false, detail: undefined };
		var evt = document.createEvent('CustomEvent');
		evt.initCustomEvent(event, params.bubbles, params.cancelable, params.detail);
		return evt;
	}

	CustomEvent.prototype = window.Event.prototype;

	window.CustomEvent = CustomEvent;
})();
